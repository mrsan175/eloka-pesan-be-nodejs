import { Request, Response } from 'express';
import { ProductController } from '../../controllers/product.controller';
import { mockPrisma } from '../mocks/prisma.mock';
import { NotFoundError } from '../../utils/errors';

describe('ProductController', () => {
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

  describe('getAllProducts', () => {
    it('should return paginated products with filters', async () => {
      mockRequest.query = { page: '1', limit: '10', search: 'coffee' };

      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Espresso',
          description: 'Strong coffee',
          price: 25000,
          isAvailable: true,
          category: { id: 'cat-1', name: 'Coffee' },
        },
      ];

      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.product.count.mockResolvedValue(1);

      await ProductController.getAllProducts(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.findMany).toHaveBeenCalled();
      expect(mockPrisma.product.count).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toBeDefined();
    });

    it('should filter by category and availability', async () => {
      mockRequest.query = { categoryId: 'cat-1', isAvailable: 'true' };

      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await ProductController.getAllProducts(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-1',
            isAvailable: true,
          }),
        })
      );
    });
  });

  describe('getProductById', () => {
    it('should return product details with variants and addons', async () => {
      mockRequest.params = { id: 'prod-1' };

      const mockProduct = {
        id: 'prod-1',
        name: 'Espresso',
        price: 25000,
        variants: [],
        addons: [],
        category: { id: 'cat-1', name: 'Coffee' },
      };

      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      await ProductController.getProductById(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        include: expect.any(Object),
      });
      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toEqual(mockProduct);
    });

    it('should throw NotFoundError if product does not exist', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        ProductController.getProductById(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('createProduct', () => {
    it('should create a new product successfully', async () => {
      const productData = {
        name: 'Cappuccino',
        description: 'Coffee with milk foam',
        price: 30000,
        categoryId: 'cat-1',
        image: 'cappuccino.jpg',
      };

      mockRequest.body = productData;

      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Coffee' });
      mockPrisma.product.create.mockResolvedValue({
        id: 'new-prod',
        ...productData,
        isAvailable: true,
        isPopular: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await ProductController.createProduct(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
      expect(mockPrisma.product.create).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
    });

    it('should throw NotFoundError if category does not exist', async () => {
      mockRequest.body = {
        name: 'Test Product',
        categoryId: 'invalid-cat',
        price: 10000,
      };

      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        ProductController.createProduct(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      mockRequest.params = { id: 'prod-1' };
      mockRequest.body = { name: 'Updated Product Name', price: 35000 };

      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Old Name' });
      mockPrisma.product.update.mockResolvedValue({
        id: 'prod-1',
        name: 'Updated Product Name',
        price: 35000,
      });

      await ProductController.updateProduct(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: expect.objectContaining({ name: 'Updated Product Name', price: 35000 }),
      });
      expect(responseObject.success).toBe(true);
    });

    it('should throw NotFoundError when updating nonexistent product', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        ProductController.updateProduct(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      mockRequest.params = { id: 'prod-1' };

      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
      mockPrisma.product.delete.mockResolvedValue({ id: 'prod-1' });

      await ProductController.deleteProduct(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
      });
      expect(responseObject.success).toBe(true);
    });
  });

  describe('toggleProductAvailability', () => {
    it('should toggle product availability', async () => {
      mockRequest.params = { id: 'prod-1' };

      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', isAvailable: true });
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', isAvailable: false });

      await ProductController.toggleProductAvailability(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { isAvailable: false },
      });
      expect(responseObject.success).toBe(true);
    });
  });

  describe('addProductVariant', () => {
    it('should add variant to product successfully', async () => {
      mockRequest.params = { id: 'prod-1' };
      mockRequest.body = {
        name: 'Size',
        optionName: 'Large',
        priceAdjust: 5000,
      };

      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
      mockPrisma.productVariant.create.mockResolvedValue({
        id: 'variant-1',
        productId: 'prod-1',
        name: 'Size',
        optionName: 'Large',
        priceAdjust: 5000,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await ProductController.addProductVariant(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.productVariant.create).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
    });
  });

  describe('addProductAddon', () => {
    it('should add addon to product successfully', async () => {
      mockRequest.params = { id: 'prod-1' };
      mockRequest.body = {
        name: 'Extra Shot',
        price: 8000,
      };

      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
      mockPrisma.productAddon.create.mockResolvedValue({
        id: 'addon-1',
        productId: 'prod-1',
        name: 'Extra Shot',
        price: 8000,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await ProductController.addProductAddon(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.productAddon.create).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
    });
  });
});
