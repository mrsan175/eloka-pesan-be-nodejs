import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class ProductController {
  static async getAllProducts(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 10, search, categoryId, isAvailable, isPopular } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable === 'true';
    }

    if (isPopular !== undefined) {
      where.isPopular = isPopular === 'true';
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, shopId: true },
          },
          variants: {
            where: { isAvailable: true },
          },
          addons: {
            where: { isAvailable: true },
          },
        },
        skip,
        take: Number(limit),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.product.count({ where }),
    ]);

    sendSuccess(res, products, 'Products retrieved successfully', 200, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    });
  }

  static async getProductById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, shopId: true },
        },
        variants: true,
        addons: true,
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    sendSuccess(res, product, 'Product retrieved successfully');
  }

  static async getProductsByShop(req: Request, res: Response): Promise<void> {
    const { shopId } = req.params;
    const { categoryId } = req.query;

    const where: any = {
      category: { shopId },
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
        variants: {
          where: { isAvailable: true },
        },
        addons: {
          where: { isAvailable: true },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    sendSuccess(res, products, 'Products retrieved successfully');
  }

  static async createCategory(req: AuthRequest, res: Response): Promise<void> {
    const { shopId, name, description, image, order } = req.body;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    const category = await prisma.category.create({
      data: {
        shopId,
        name,
        description,
        image,
        order: order || 0,
      },
    });

    sendSuccess(res, category, 'Category created successfully', 201);
  }

  static async updateCategory(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, description, image, order, isActive } = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundError('Category not found');
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    sendSuccess(res, category, 'Category updated successfully');
  }

  static async deleteCategory(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    if (category._count.products > 0) {
      throw new BadRequestError('Cannot delete category with existing products');
    }

    await prisma.category.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Category deleted successfully');
  }

  static async createProduct(req: AuthRequest, res: Response): Promise<void> {
    const { categoryId, name, description, price, image, isAvailable, isPopular, stock, order } = req.body;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const product = await prisma.product.create({
      data: {
        categoryId,
        name,
        description,
        price,
        image,
        isAvailable: isAvailable ?? true,
        isPopular: isPopular ?? false,
        stock,
        order: order || 0,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    sendSuccess(res, product, 'Product created successfully', 201);
  }

  static async updateProduct(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, description, price, image, isAvailable, isPopular, stock, order } = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(image !== undefined && { image }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(isPopular !== undefined && { isPopular }),
        ...(stock !== undefined && { stock }),
        ...(order !== undefined && { order }),
      },
    });

    sendSuccess(res, product, 'Product updated successfully');
  }

  static async deleteProduct(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    await prisma.product.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Product deleted successfully');
  }

  static async toggleProductAvailability(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isAvailable: !product.isAvailable },
    });

    sendSuccess(
      res,
      { isAvailable: updatedProduct.isAvailable },
      `Product is now ${updatedProduct.isAvailable ? 'available' : 'unavailable'}`
    );
  }

  static async addProductVariant(req: AuthRequest, res: Response): Promise<void> {
    const { productId } = req.params;
    const { name, optionName, priceAdjust } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name,
        optionName,
        priceAdjust: priceAdjust || 0,
      },
    });

    sendSuccess(res, variant, 'Variant added successfully', 201);
  }

  static async removeProductVariant(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const variant = await prisma.productVariant.findUnique({
      where: { id },
    });

    if (!variant) {
      throw new NotFoundError('Variant not found');
    }

    await prisma.productVariant.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Variant removed successfully');
  }

  static async addProductAddon(req: AuthRequest, res: Response): Promise<void> {
    const { productId } = req.params;
    const { name, price } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const addon = await prisma.productAddon.create({
      data: {
        productId,
        name,
        price,
      },
    });

    sendSuccess(res, addon, 'Addon added successfully', 201);
  }

  static async removeProductAddon(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const addon = await prisma.productAddon.findUnique({
      where: { id },
    });

    if (!addon) {
      throw new NotFoundError('Addon not found');
    }

    await prisma.productAddon.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Addon removed successfully');
  }
}
