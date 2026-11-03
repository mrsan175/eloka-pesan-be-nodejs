import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { notifyOrderUpdate } from '../services/notification.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface OrderItemInput {
  productId: string;
  quantity: number;
  addonIds?: string[];
  sizeId?: string;
  notes?: string;
}

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['DELIVERING', 'COMPLETED'],
  DELIVERING: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

export class OrderController {
  static async getMyOrders(req: AuthRequest, res: Response): Promise<void> {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.user!.id };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          shop: { select: { id: true, name: true, logo: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, image: true } },
              productSize: true,
              addons: { include: { productAddon: true } },
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    sendSuccess(res, orders, 'Orders retrieved successfully', 200, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    });
  }

  static async getOrderById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        shop: { select: { id: true, name: true, logo: true, phone: true, address: true } },
        address: true,
        items: {
          include: {
            product: { select: { id: true, name: true, image: true, price: true } },
            productSize: true,
            addons: {
              include: {
                productAddon: { select: { id: true, name: true, optionName: true, price: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Guest orders are accessed with the one-time token returned at checkout.
    const isOwner = Boolean(req.user && order.userId === req.user.id);

    const guestToken = req.headers['x-order-access-token'];
    const storedGuestToken = await redis.get(`order-access:${id}`);
    const hasGuestAccess =
      !order.userId &&
      typeof guestToken === 'string' &&
      storedGuestToken !== null &&
      guestToken === storedGuestToken;

    // If staff or admin, check shop access
    if (req.user && req.user.role === 'STAFF') {
      const staffShops = await prisma.shopStaff.findMany({
        where: { userId: req.user.id },
        select: { shopId: true },
      });
      const assignedShopIds = staffShops.map((s) => s.shopId);
      
      if (!assignedShopIds.includes(order.shopId)) {
        throw new ForbiddenError('You do not have access to this order');
      }
    }

    if ((!req.user || (!isOwner && !['ADMIN', 'STAFF'].includes(req.user.role))) && !hasGuestAccess) {
      throw new ForbiddenError('Access denied');
    }

    sendSuccess(res, order, 'Order retrieved successfully');
  }

  static async getAllOrders(req: AuthRequest, res: Response): Promise<void> {
    const { page = 1, limit = 10, status, shopId, userId, orderType, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (orderType) where.orderType = orderType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    // Role-based filtering:
    // If user is STAFF, restrict orders to shops where the staff is assigned
    if (req.user && req.user.role === 'STAFF') {
      const staffShops = await prisma.shopStaff.findMany({
        where: { userId: req.user.id },
        select: { shopId: true },
      });
      const assignedShopIds = staffShops.map((s) => s.shopId);

      if (assignedShopIds.length === 0) {
        // Staff not assigned to any shop -> return empty list
        sendSuccess(res, [], 'Orders retrieved successfully', 200, {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          totalPages: 0,
        });
        return;
      }

      // If specific shopId requested, verify staff is assigned to it
      if (shopId) {
        if (!assignedShopIds.includes(String(shopId))) {
          throw new ForbiddenError('You do not have access to orders for this shop');
        }
        where.shopId = String(shopId);
      } else {
        where.shopId = { in: assignedShopIds };
      }
    } else if (shopId) {
      where.shopId = String(shopId);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          shop: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    sendSuccess(res, orders, 'Orders retrieved successfully', 200, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    });
  }

  static async createOrder(req: AuthRequest, res: Response): Promise<void> {
    const { shopId, orderType, tableNumber, pickupTime, addressId, items, notes } = req.body as {
      shopId: string;
      orderType: OrderType;
      tableNumber?: string;
      pickupTime?: string;
      addressId?: string;
      items: OrderItemInput[];
      notes?: string;
    };

    // Validate shop
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundError('Shop not found');
    if (!shop.isOpen) throw new BadRequestError('Shop is currently closed');

    // Validate delivery requires address
    if (orderType === 'DELIVERY' && !addressId) {
      throw new BadRequestError('Address is required for delivery orders');
    }

    // Validate address belongs to user
    if (addressId && req.user) {
      const address = await prisma.address.findFirst({
        where: { id: addressId, userId: req.user.id },
      });
      if (!address) throw new NotFoundError('Address not found');
    }

    // Fetch products and verify that each one is enabled for the selected shop.
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        addons: true,
        sizes: true,
        shopProducts: { where: { shopId, isVisible: true }, select: { shopId: true } },
      },
    });

    // Validate all products belong to the same shop
    const invalidProducts = products.filter((p) => p.shopProducts.length === 0);
    if (invalidProducts.length > 0) {
      throw new BadRequestError('All products must belong to the same shop');
    }

    if (products.length !== productIds.length) {
      throw new NotFoundError('One or more products not found');
    }

    const unavailableProducts = products.filter((p) => !p.isAvailable);
    if (unavailableProducts.length > 0) {
      throw new BadRequestError(
        `Products not available: ${unavailableProducts.map((p) => p.name).join(', ')}`
      );
    }

    // Calculate order total
    let subtotal = new Decimal(0);
    const processedItems: Array<{
      productId: string;
      quantity: number;
      price: Decimal;
      subtotal: Decimal;
      notes?: string;
      addonIds: string[];
      productSizeId?: string;
    }> = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      let itemPrice = product.price;

      let productSizeId: string | undefined;
      if (item.sizeId) {
        const size = product.sizes.find((candidate) => candidate.id === item.sizeId);
        if (!size) throw new BadRequestError(`Size ${item.sizeId} not found for product ${product.name}`);
        if (!size.isAvailable) throw new BadRequestError(`Size ${size.name} is not available`);
        itemPrice = size.price;
        productSizeId = size.id;
      }

      // Add addon prices
      const addonIds: string[] = [];
      if (item.addonIds && item.addonIds.length > 0) {
        for (const addonId of item.addonIds) {
          const addon = product.addons.find((a) => a.id === addonId);
          if (!addon) throw new BadRequestError(`Addon ${addonId} not found for product ${product.name}`);
          if (!addon.isAvailable) throw new BadRequestError(`Addon ${addon.name} is not available`);
          itemPrice = itemPrice.add(addon.price);
          addonIds.push(addonId);
        }
      }

      const itemSubtotal = itemPrice.mul(item.quantity);
      subtotal = subtotal.add(itemSubtotal);

      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: itemPrice,
        subtotal: itemSubtotal,
        notes: item.notes,
        addonIds,
        productSizeId,
      });
    }

    // Tax calculation (11% PPN Indonesia)
    const TAX_RATE = new Decimal('0.11');
    const tax = subtotal.mul(TAX_RATE).toDecimalPlaces(2);

    // Delivery fee
    const deliveryFee = orderType === 'DELIVERY' ? new Decimal('5000') : new Decimal(0);

    // Total
    const total = subtotal.add(tax).add(deliveryFee);

    // Generate unique order number
    let orderNumber = generateOrderNumber();
    while (await prisma.order.findUnique({ where: { orderNumber } })) {
      orderNumber = generateOrderNumber();
    }

    // Create order in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: req.user?.id,
          shopId,
          addressId,
          orderType,
          tableNumber,
          pickupTime: pickupTime ? new Date(pickupTime) : undefined,
          subtotal,
          tax,
          deliveryFee,
          discount: new Decimal(0),
          total,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          notes,
          items: {
            create: processedItems.map((item) => ({
              productId: item.productId,
              productSizeId: item.productSizeId,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              notes: item.notes,
              addons: {
                create: item.addonIds.map((productAddonId) => ({ productAddonId, quantity: 1 })),
              },
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, image: true } },
              addons: { include: { productAddon: true } },
            },
          },
          shop: { select: { id: true, name: true } },
          address: true,
        },
      });

      return createdOrder;
    });

    const guestAccessToken = req.user ? undefined : randomBytes(32).toString('hex');
    if (guestAccessToken) {
      await redis.set(`order-access:${order.id}`, guestAccessToken, 'EX', 86400);
    }

    // Cache active order in Redis (1 hour TTL)
    await redis.set(
      `order:${order.id}`,
      JSON.stringify(order),
      'EX',
      3600
    );

    // Notify new order via Stream
    await notifyOrderUpdate(
      'ORDER_CREATED',
      order.id,
      order.orderNumber,
      order.shopId,
      'PENDING',
      `New order ${order.orderNumber} received`
    );

    sendSuccess(
      res,
      guestAccessToken ? { order, guestAccessToken } : order,
      'Order created successfully',
      201
    );
  }

  static async updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundError('Order not found');

    const allowedTransitions = STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestError(
        `Cannot transition order from ${order.status} to ${status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
        shop: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Invalidate cache
    await redis.del(`order:${id}`);

    // Publish order update notification
    await notifyOrderUpdate(
      status === 'COMPLETED' ? 'ORDER_COMPLETED' : 
      status === 'CANCELLED' ? 'ORDER_CANCELLED' : 'ORDER_UPDATED',
      id,
      updatedOrder.orderNumber,
      updatedOrder.shopId,
      status,
      `Order ${updatedOrder.orderNumber} status changed to ${status}`
    );

    sendSuccess(res, updatedOrder, `Order status updated to ${status}`);
  }

  static async updatePaymentStatus(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { paymentMethod, paymentStatus } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundError('Order not found');

    if (order.paymentStatus === 'PAID' && paymentStatus === 'PAID') {
      throw new BadRequestError('Order is already paid');
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { paymentMethod, paymentStatus },
    });

    // Invalidate cache
    await redis.del(`order:${id}`);

    sendSuccess(res, updatedOrder, 'Payment status updated successfully');
  }

  static async cancelOrder(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundError('Order not found');

    const isOwner = order.userId === req.user!.id;
    const isStaffOrAdmin = ['ADMIN', 'STAFF'].includes(req.user!.role);

    if (!isOwner && !isStaffOrAdmin) {
      throw new ForbiddenError('Access denied');
    }

    const allowedTransitions = STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes('CANCELLED')) {
      throw new BadRequestError(`Order cannot be cancelled in status: ${order.status}`);
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Invalidate cache
    await redis.del(`order:${id}`);

    // Notify order cancelled
    await notifyOrderUpdate(
      'ORDER_CANCELLED',
      updatedOrder.id,
      updatedOrder.orderNumber,
      updatedOrder.shopId,
      'CANCELLED',
      `Order ${updatedOrder.orderNumber} has been cancelled`
    );

    sendSuccess(res, updatedOrder, 'Order cancelled successfully');
  }
}
