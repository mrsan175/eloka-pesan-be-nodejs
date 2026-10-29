import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderType } from '@prisma/client';

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
  variantIds?: string[];
  addonIds?: string[];
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
              variants: { include: { variant: true } },
              addons: { include: { addon: true } },
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
            variants: {
              include: {
                variant: { select: { id: true, name: true, optionName: true, priceAdjust: true } },
              },
            },
            addons: {
              include: {
                addon: { select: { id: true, name: true, price: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Only allow owner or staff/admin to view
    const isOwner = order.userId === req.user!.id;
    const isStaffOrAdmin = ['ADMIN', 'STAFF'].includes(req.user!.role);

    if (!isOwner && !isStaffOrAdmin) {
      throw new ForbiddenError('Access denied');
    }

    sendSuccess(res, order, 'Order retrieved successfully');
  }

  static async getAllOrders(req: AuthRequest, res: Response): Promise<void> {
    const { page = 1, limit = 10, status, shopId, userId, orderType, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (shopId) where.shopId = shopId;
    if (userId) where.userId = userId;
    if (orderType) where.orderType = orderType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
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

    // Fetch all products with their variants and addons
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        variants: true,
        addons: true,
        category: { select: { shopId: true } },
      },
    });

    // Validate all products belong to the same shop
    const invalidProducts = products.filter((p) => p.category.shopId !== shopId);
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
      variantIds: string[];
      addonIds: string[];
    }> = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      let itemPrice = product.price;

      // Add variant price adjustments
      if (item.variantIds && item.variantIds.length > 0) {
        for (const variantId of item.variantIds) {
          const variant = product.variants.find((v) => v.id === variantId);
          if (!variant) throw new BadRequestError(`Variant ${variantId} not found for product ${product.name}`);
          if (!variant.isAvailable) throw new BadRequestError(`Variant ${variant.optionName} is not available`);
          itemPrice = itemPrice.add(variant.priceAdjust);
        }
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
        variantIds: item.variantIds || [],
        addonIds,
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
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              notes: item.notes,
              variants: {
                create: item.variantIds.map((variantId) => ({ variantId })),
              },
              addons: {
                create: item.addonIds.map((addonId) => ({ addonId, quantity: 1 })),
              },
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, image: true } },
              variants: { include: { variant: true } },
              addons: { include: { addon: true } },
            },
          },
          shop: { select: { id: true, name: true } },
          address: true,
        },
      });

      return createdOrder;
    });

    // Cache active order in Redis (1 hour TTL)
    await redis.set(
      `order:${order.id}`,
      JSON.stringify(order),
      'EX',
      3600
    );

    sendSuccess(res, order, 'Order created successfully', 201);
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

    sendSuccess(res, updatedOrder, 'Order cancelled successfully');
  }
}
