import { Request, Response } from 'express';
import { ShopController } from '../../controllers/shop.controller';
import { mockPrisma } from '../mocks/prisma.mock';
import { NotFoundError, BadRequestError } from '../../utils/errors';

describe('ShopController', () => {
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

  describe('getAllShops', () => {
    it('should return paginated shops', async () => {
      mockRequest.query = { page: '1', limit: '10' };

      const mockShops = [
        {
          id: 'shop-1',
          name: 'Eloka Coffee Main',
          address: 'Jl. Sudirman No. 123',
          phone: '08123456789',
          isOpen: true,
          _count: { categories: 2, orders: 5 },
        },
      ];

      mockPrisma.shop.findMany.mockResolvedValue(mockShops);
      mockPrisma.shop.count.mockResolvedValue(1);

      await ShopController.getAllShops(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.shop.findMany).toHaveBeenCalled();
      expect(mockPrisma.shop.count).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toEqual(mockShops);
      expect(responseObject.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should apply search and isOpen filters', async () => {
      mockRequest.query = { search: 'eloka', isOpen: 'true' };

      mockPrisma.shop.findMany.mockResolvedValue([]);
      mockPrisma.shop.count.mockResolvedValue(0);

      await ShopController.getAllShops(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.shop.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isOpen: true,
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('getShopById', () => {
    it('should return shop details with categories', async () => {
      mockRequest.params = { id: 'shop-1' };

      const mockShop = {
        id: 'shop-1',
        name: 'Eloka Coffee Main',
        address: 'Jl. Sudirman No. 123',
        phone: '08123456789',
        isOpen: true,
        categories: [
          {
            id: 'cat-1',
            name: 'Coffee',
            products: [],
          },
        ],
      };

      mockPrisma.shop.findUnique.mockResolvedValue(mockShop);

      await ShopController.getShopById(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.shop.findUnique).toHaveBeenCalledWith({
        where: { id: 'shop-1' },
        include: expect.any(Object),
      });
      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toEqual(mockShop);
    });

    it('should throw NotFoundError if shop does not exist', async () => {
      mockRequest.params = { id: 'nonexistent-shop' };
      mockPrisma.shop.findUnique.mockResolvedValue(null);

      await expect(
        ShopController.getShopById(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('createShop', () => {
    it('should create a new shop successfully', async () => {
      const shopData = {
        name: 'Eloka Coffee Branch 2',
        description: 'Second branch',
        address: 'Jl. Thamrin No. 45',
        phone: '08129876543',
        email: 'branch2@eloka.com',
      };

      mockRequest.body = shopData;

      const createdShop = {
        id: 'new-shop-id',
        ...shopData,
        isOpen: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.shop.create.mockResolvedValue(createdShop);

      await ShopController.createShop(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.shop.create).toHaveBeenCalledWith({
        data: shopData,
      });
      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toEqual(createdShop);
    });
  });

  describe('updateShop', () => {
    it('should update shop successfully', async () => {
      mockRequest.params = { id: 'shop-1' };
      mockRequest.body = { name: 'Updated Shop Name' };

      mockPrisma.shop.findUnique.mockResolvedValue({ id: 'shop-1', name: 'Old Name' });
      mockPrisma.shop.update.mockResolvedValue({ id: 'shop-1', name: 'Updated Shop Name' });

      await ShopController.updateShop(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.shop.findUnique).toHaveBeenCalledWith({ where: { id: 'shop-1' } });
      expect(mockPrisma.shop.update).toHaveBeenCalledWith({
        where: { id: 'shop-1' },
        data: { name: 'Updated Shop Name' },
      });
      expect(responseObject.success).toBe(true);
    });

    it('should throw NotFoundError when updating nonexistent shop', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockPrisma.shop.findUnique.mockResolvedValue(null);

      await expect(
        ShopController.updateShop(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteShop', () => {
    it('should delete shop successfully when it has no orders', async () => {
      mockRequest.params = { id: 'shop-1' };

      mockPrisma.shop.findUnique.mockResolvedValue({
        id: 'shop-1',
        _count: { orders: 0 },
      });
      mockPrisma.shop.delete.mockResolvedValue({ id: 'shop-1' });

      await ShopController.deleteShop(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.shop.delete).toHaveBeenCalledWith({ where: { id: 'shop-1' } });
      expect(responseObject.success).toBe(true);
    });

    it('should throw BadRequestError when shop has existing orders', async () => {
      mockRequest.params = { id: 'shop-1' };

      mockPrisma.shop.findUnique.mockResolvedValue({
        id: 'shop-1',
        _count: { orders: 3 },
      });

      await expect(
        ShopController.deleteShop(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(BadRequestError);

      expect(mockPrisma.shop.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when shop does not exist', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockPrisma.shop.findUnique.mockResolvedValue(null);

      await expect(
        ShopController.deleteShop(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('toggleShopStatus', () => {
    it('should toggle shop isOpen status', async () => {
      mockRequest.params = { id: 'shop-1' };

      mockPrisma.shop.findUnique.mockResolvedValue({ id: 'shop-1', isOpen: true });
      mockPrisma.shop.update.mockResolvedValue({ id: 'shop-1', isOpen: false });

      await ShopController.toggleShopStatus(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.shop.update).toHaveBeenCalledWith({
        where: { id: 'shop-1' },
        data: { isOpen: false },
      });
      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toEqual({ isOpen: false });
    });

    it('should throw NotFoundError if shop does not exist', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockPrisma.shop.findUnique.mockResolvedValue(null);

      await expect(
        ShopController.toggleShopStatus(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
