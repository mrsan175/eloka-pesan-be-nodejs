import { Request, Response } from 'express';
import { OrderController } from '../../controllers/order.controller';
import { mockPrisma } from '../mocks/prisma.mock';
import { mockRedis } from '../mocks/redis.mock';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { Decimal } from '@prisma/client/runtime/library';

describe('OrderController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    responseObject = {
      success: false,
      data: null,
      message: '',
    };

    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: {
        id: 'user-id-123',
        email: 'test@example.com',
        role: 'CUSTOMER',
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((result) => {
        responseObject = result;
        return mockResponse;
      }),
    };

    jest.clearAllMocks();
  });

  describe('getMyOrders', () => {
    it('should return user orders with pagination', async () => {
      mockRequest.query = { page: '1', limit: '10' };

      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'ORD-261028-0001',
          status: 'PENDING',
          total: new Decimal(55000),
          shop: { id: 'shop-1', name: 'Eloka Coffee' },
          items: [],
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(1);

      await OrderController.getMyOrders(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.order.findMany).toHaveBeenCalled();
      expect(mockPrisma.order.count).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
      expect(responseObject.meta.total).toBe(1);
    });

    it('should filter orders by status', async () => {
      mockRequest.query = { status: 'COMPLETED' };

      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await OrderController.getMyOrders(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'COMPLETED' }),
        })
      );
    });
  });

  describe('getOrderById', () => {
    it('should return order details', async () => {
      mockRequest.params = { id: 'order-1' };

      const mockOrder = {
        id: 'order-1',
        userId: 'user-id-123',
        orderNumber: 'ORD-261028-0001',
        status: 'PENDING',
        user: { id: 'user-id-123', name: 'Test User' },
        shop: { id: 'shop-1', name: 'Eloka Coffee' },
        items: [],
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await OrderController.getOrderById(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.order.findUnique).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toEqual(mockOrder);
    });

    it('should throw NotFoundError if order not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        OrderController.getOrderById(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user is not owner', async () => {
      mockRequest.params = { id: 'order-1' };
      mockRequest.user = { id: 'other-user', email: 'other@example.com', role: 'CUSTOMER' };

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-id-123',
      });

      await expect(
        OrderController.getOrderById(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('createOrder', () => {
    it('should create a dine-in order successfully', async () => {
      mockRequest.body = {
        shopId: 'shop-1',
        orderType: 'DINE_IN',
        tableNumber: 'A1',
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
          },
        ],
      };

      mockPrisma.shop.findUnique.mockResolvedValue({
        id: 'shop-1',
        isOpen: true,
        name: 'Eloka Coffee',
      });
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Espresso',
          price: new Decimal(25000),
          isAvailable: true,
          category: { shopId: 'shop-1' },
          variants: [],
          addons: [],
        },
      ]);
      mockPrisma.order.findUnique.mockResolvedValueOnce(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
      mockPrisma.order.create.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-261028-0001',
        shopId: 'shop-1',
        userId: 'user-id-123',
        status: 'PENDING',
        total: new Decimal(55000),
        subtotal: new Decimal(50000),
        tax: new Decimal(5500),
        deliveryFee: new Decimal(0),
        items: [],
        shop: { id: 'shop-1', name: 'Eloka Coffee' },
      });
      mockRedis.set.mockResolvedValue('OK' as never);

      await OrderController.createOrder(mockRequest as Request, mockResponse as Response);

      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toBeDefined();
    });

    it('should create a delivery order with address and delivery fee', async () => {
      mockRequest.body = {
        shopId: 'shop-1',
        orderType: 'DELIVERY',
        addressId: 'addr-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
      };

      mockPrisma.shop.findUnique.mockResolvedValue({ id: 'shop-1', isOpen: true });
      mockPrisma.address.findFirst.mockResolvedValue({ id: 'addr-1', userId: 'user-id-123' });
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Espresso',
          price: new Decimal(25000),
          isAvailable: true,
          category: { shopId: 'shop-1' },
          variants: [],
          addons: [],
        },
      ]);
      mockPrisma.order.findUnique.mockResolvedValueOnce(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
      mockPrisma.order.create.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-261028-0001',
        total: new Decimal(33250), // 25000 + 11% PPN + 5000 delivery
        deliveryFee: new Decimal(5000),
        items: [],
      });
      mockRedis.set.mockResolvedValue('OK' as never);

      await OrderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Verify delivery fee is included
      const createCall = mockPrisma.order.create.mock.calls[0][0];
      expect(createCall.data.deliveryFee.toNumber()).toBe(5000);
    });

    it('should throw NotFoundError if shop not found', async () => {
      mockRequest.body = {
        shopId: 'nonexistent',
        orderType: 'DINE_IN',
        items: [],
      };

      mockPrisma.shop.findUnique.mockResolvedValue(null);

      await expect(
        OrderController.createOrder(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if shop is closed', async () => {
      mockRequest.body = {
        shopId: 'shop-1',
        orderType: 'DINE_IN',
        items: [],
      };

      mockPrisma.shop.findUnique.mockResolvedValue({ id: 'shop-1', isOpen: false });

      await expect(
        OrderController.createOrder(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if delivery order without address', async () => {
      mockRequest.body = {
        shopId: 'shop-1',
        orderType: 'DELIVERY',
        addressId: undefined,
        items: [],
      };

      mockPrisma.shop.findUnique.mockResolvedValue({ id: 'shop-1', isOpen: true });

      await expect(
        OrderController.createOrder(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(BadRequestError);
    });

    it('should calculate PPN 11% correctly', async () => {
      mockRequest.body = {
        shopId: 'shop-1',
        orderType: 'DINE_IN',
        tableNumber: 'A1',
        items: [{ productId: 'prod-1', quantity: 1 }],
      };

      mockPrisma.shop.findUnique.mockResolvedValue({ id: 'shop-1', isOpen: true });
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Espresso',
          price: new Decimal(100000), // 100k
          isAvailable: true,
          category: { shopId: 'shop-1' },
          variants: [],
          addons: [],
        },
      ]);
      mockPrisma.order.findUnique.mockResolvedValueOnce(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
      mockPrisma.order.create.mockResolvedValue({
        id: 'order-1',
        total: new Decimal(111000), // 100k + 11% = 111k
        subtotal: new Decimal(100000),
        tax: new Decimal(11000),
        deliveryFee: new Decimal(0),
        items: [],
      });
      mockRedis.set.mockResolvedValue('OK' as never);

      await OrderController.createOrder(mockRequest as Request, mockResponse as Response);

      const createCall = mockPrisma.order.create.mock.calls[0][0];
      expect(createCall.data.tax.toNumber()).toBe(11000);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      mockRequest.params = { id: 'order-1' };
      mockRequest.body = { status: 'CONFIRMED' };

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
      });
      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'CONFIRMED',
      });
      mockRedis.del.mockResolvedValue(1 as never);

      await OrderController.updateOrderStatus(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'CONFIRMED' },
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
      expect(responseObject.success).toBe(true);
    });

    it('should throw BadRequestError for invalid status transition', async () => {
      mockRequest.params = { id: 'order-1' };
      mockRequest.body = { status: 'COMPLETED' };

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PENDING',
      });

      await expect(
        OrderController.updateOrderStatus(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError if order not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        OrderController.updateOrderStatus(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status', async () => {
      mockRequest.params = { id: 'order-1' };
      mockRequest.body = { paymentMethod: 'CASH', paymentStatus: 'PAID' };

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        paymentStatus: 'UNPAID',
      });
      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        paymentStatus: 'PAID',
      });
      mockRedis.del.mockResolvedValue(1 as never);

      await OrderController.updatePaymentStatus(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.order.update).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
    });

    it('should throw BadRequestError if already paid', async () => {
      mockRequest.params = { id: 'order-1' };
      mockRequest.body = { paymentStatus: 'PAID' };

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        paymentStatus: 'PAID',
      });

      await expect(
        OrderController.updatePaymentStatus(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      mockRequest.params = { id: 'order-1' };

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-id-123',
        status: 'PENDING',
      });
      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: 'CANCELLED',
      });
      mockRedis.del.mockResolvedValue(1 as never);

      await OrderController.cancelOrder(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'CANCELLED' },
      });
      expect(responseObject.success).toBe(true);
    });

    it('should throw ForbiddenError if user is not owner', async () => {
      mockRequest.params = { id: 'order-1' };
      mockRequest.user = { id: 'other-user', email: 'other@example.com', role: 'CUSTOMER' };

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-id-123',
      });

      await expect(
        OrderController.cancelOrder(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError if order cannot be cancelled', async () => {
      mockRequest.params = { id: 'order-1' };

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-id-123',
        status: 'COMPLETED',
      });

      await expect(
        OrderController.cancelOrder(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getAllOrders', () => {
    beforeEach(() => {
      mockRequest.user = { id: 'admin-id', email: 'admin@example.com', role: 'ADMIN' };
    });

    it('should return all orders with filters', async () => {
      mockRequest.query = { page: '1', limit: '10', status: 'PENDING' };

      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'ORD-261028-0001',
          status: 'PENDING',
          user: { id: 'user-1', name: 'John' },
          shop: { id: 'shop-1', name: 'Eloka Coffee' },
          items: [],
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(1);

      await OrderController.getAllOrders(mockRequest as Request, mockResponse as Response);

      expect(responseObject.success).toBe(true);
      expect(responseObject.meta.total).toBe(1);
    });
  });
});