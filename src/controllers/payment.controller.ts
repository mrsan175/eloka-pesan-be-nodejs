import { Request, Response } from 'express';
import { randomUUID, timingSafeEqual } from 'crypto';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { config } from '../config/environment';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

const paymentKey = (transactionId: string) => `payment:${transactionId}`;
const orderPaymentKey = (orderId: string) => `payment:order:${orderId}`;
const channel = (orderId: string) => `payment:update:${orderId}`;

const canAccessOrder = async (req: AuthRequest, order: { id: string; userId: string | null }) => {
  if (req.user && (order.userId === req.user.id || ['ADMIN', 'STAFF'].includes(req.user.role))) {
    return true;
  }
  const providedToken = req.headers['x-order-access-token'];
  const storedToken = await redis.get(`order-access:${order.id}`);
  return typeof providedToken === 'string' && storedToken !== null && providedToken === storedToken;
};

const publishPayment = async (orderId: string, data: Record<string, string>) => {
  await redis.set(orderPaymentKey(orderId), JSON.stringify(data), 'EX', 900);
  await redis.publish(channel(orderId), JSON.stringify(data));
};

const hasValidWebhookSecret = (request: Request): boolean => {
  if (!config.payment.webhookSecret) return false;
  const provided = request.header('x-payment-webhook-secret') || '';
  const expected = Buffer.from(config.payment.webhookSecret);
  const received = Buffer.from(provided);
  return expected.length === received.length && timingSafeEqual(expected, received);
};

export class PaymentController {
  static async createPayment(req: AuthRequest, res: Response): Promise<void> {
    const { orderId } = req.body as { orderId?: string };
    if (!orderId) throw new BadRequestError('Order ID is required');

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order not found');
    if (!(await canAccessOrder(req, order))) {
      throw new ForbiddenError('Access denied');
    }
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestError('Order is already paid');
    }

    const transactionId = `QRIS-${randomUUID()}`;
    const expiresAt = new Date(Date.now() + config.payment.expiryMinutes * 60 * 1000);
    const payload = config.payment.staticPayload || `ELoka-Pesan|${transactionId}|${order.total.toString()}`;
    const payment = {
      transactionId,
      orderId,
      amount: order.total.toString(),
      method: 'QRIS',
      status: 'PENDING',
      qrPayload: payload,
      expiresAt: expiresAt.toISOString(),
      demo: String(!config.payment.staticPayload),
    };

    await redis
      .multi()
      .hset(paymentKey(transactionId), payment)
      .expire(paymentKey(transactionId), config.payment.expiryMinutes * 60)
      .set(orderPaymentKey(orderId), JSON.stringify(payment), 'EX', config.payment.expiryMinutes * 60)
      .exec();
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod: 'QRIS' },
    });

    sendSuccess(res, payment, 'QRIS payment created', 201);
  }

  static async getStatus(req: AuthRequest, res: Response): Promise<void> {
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order not found');
    if (!(await canAccessOrder(req, order))) {
      throw new ForbiddenError('Access denied');
    }

    const cached = await redis.get(orderPaymentKey(orderId));
    sendSuccess(res, cached ? JSON.parse(cached) : {
      orderId,
      status: order.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
      method: 'QRIS',
    });
  }

  static async streamStatus(req: AuthRequest, res: Response): Promise<void> {
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order not found');
    if (!(await canAccessOrder(req, order))) {
      throw new ForbiddenError('Access denied');
    }

    const subscriber = redis.duplicate();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (data: string) => res.write(`event: payment.update\ndata: ${data}\n\n`);
    const current = await redis.get(orderPaymentKey(orderId));
    send(current || JSON.stringify({ orderId, status: order.paymentStatus === 'PAID' ? 'PAID' : 'PENDING' }));

    await subscriber.subscribe(channel(orderId));
    const onMessage = (_channel: string, message: string) => send(message);
    subscriber.on('message', onMessage);
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      subscriber.removeListener('message', onMessage);
      void subscriber.unsubscribe(channel(orderId)).finally(() => subscriber.quit());
    });
  }

  static async simulateScan(req: AuthRequest, res: Response): Promise<void> {
    if (!config.payment.simulationEnabled) {
      throw new ForbiddenError('Payment simulation is disabled');
    }

    const { transactionId } = req.params;
    const payment = await redis.hgetall(paymentKey(transactionId));
    if (!payment.orderId) throw new NotFoundError('Payment transaction not found');

    const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
    if (!order) throw new NotFoundError('Order not found');
    if (!(await canAccessOrder(req, order))) {
      throw new ForbiddenError('Access denied');
    }
    if (payment.status === 'PAID') {
      sendSuccess(res, { transactionId, status: 'PAID' }, 'Payment already processed');
      return;
    }

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: 'PAID', paymentMethod: 'QRIS' },
    });
    await redis.hset(paymentKey(transactionId), 'status', 'PAID');
    await publishPayment(payment.orderId, {
      ...payment,
      status: 'PAID',
      updatedAt: new Date().toISOString(),
    });

    sendSuccess(res, { transactionId, status: 'PAID' }, 'Development payment simulated');
  }

  static async webhook(req: Request, res: Response): Promise<void> {
    if (!hasValidWebhookSecret(req)) {
      throw new ForbiddenError('Invalid webhook secret');
    }

    const { transactionId, status } = req.body as { transactionId?: string; status?: string };
    if (!transactionId || !['PAID', 'FAILED', 'EXPIRED'].includes(status || '')) {
      throw new BadRequestError('transactionId and a valid status are required');
    }

    const payment = await redis.hgetall(paymentKey(transactionId));
    const paymentOrderId = payment.orderId;
    if (!paymentOrderId) throw new NotFoundError('Payment transaction not found');
    if (payment.status === 'PAID') {
      sendSuccess(res, { transactionId, status: 'PAID' }, 'Payment already processed');
      return;
    }

    const nextStatus = status === 'PAID' ? 'PAID' : status || 'FAILED';
    await prisma.order.update({
      where: { id: paymentOrderId },
      data: {
        paymentStatus: status === 'PAID' ? 'PAID' : 'UNPAID',
        paymentMethod: 'QRIS',
      },
    });
    await redis.hset(paymentKey(transactionId), 'status', nextStatus);
    await publishPayment(paymentOrderId, {
      ...payment,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });

    sendSuccess(res, { transactionId, status: nextStatus }, 'Payment status updated');
  }
}
