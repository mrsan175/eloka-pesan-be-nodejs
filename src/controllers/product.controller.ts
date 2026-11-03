import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { getAddonSelectionMode as getCategorySelectionMode } from '../utils/addon-category';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class ProductController {
  static async getAllProductsForAdmin(_req: AuthRequest, res: Response): Promise<void> {
    const { page = 1, limit = 20, search } = _req.query;
    const pageNumber = Math.max(1, Number(page));
    const pageSize = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNumber - 1) * pageSize;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { category: { name: { contains: String(search), mode: 'insensitive' } } },
        { addons: { some: { name: { contains: String(search), mode: 'insensitive' } } } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
      include: {
        category: { select: { id: true, name: true, shopId: true } },
        addons: { include: { addonCategory: true }, orderBy: { name: 'asc' } },
      },
      orderBy: [{ categoryId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
        where,
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    sendSuccess(res, products, 'All products and addons retrieved successfully', 200, {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  }

  static async getAddonCategories(_req: Request, res: Response): Promise<void> {
    const categories = await prisma.addonCategory.findMany({
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, categories, 'Addon categories retrieved successfully');
  }

  static async createAddonCategory(req: AuthRequest, res: Response): Promise<void> {
    const { name, selectionMode } = req.body;
    const category = await prisma.addonCategory.create({
      data: { name, selectionMode },
    });
    sendSuccess(res, category, 'Addon category created successfully', 201);
  }

  static async updateAddonCategory(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, selectionMode } = req.body;
    const existingCategory = await prisma.addonCategory.findUnique({ where: { id } });
    if (!existingCategory) throw new NotFoundError('Addon category not found');

    const category = await prisma.addonCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(selectionMode !== undefined && { selectionMode }),
      },
    });
    sendSuccess(res, category, 'Addon category updated successfully');
  }

  static async deleteAddonCategory(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const category = await prisma.addonCategory.findUnique({
      where: { id },
      include: { _count: { select: { addons: true } } },
    });
    if (!category) throw new NotFoundError('Addon category not found');
    if (category._count.addons > 0) {
      throw new BadRequestError('Kategori addon yang masih digunakan tidak dapat dihapus');
    }
    await prisma.addonCategory.delete({ where: { id } });
    sendSuccess(res, null, 'Addon category deleted successfully');
  }

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
          addons: {
            include: { addonCategory: true },
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
        addons: true,
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    sendSuccess(res, product, 'Product retrieved successfully');
  }

  static async getProductsByShop(req: AuthRequest, res: Response): Promise<void> {
    const { shopId } = req.params;
    const { categoryId } = req.query;

    const where: any = {
      shopProducts: {
        some: {
          shopId,
          ...(req.user ? {} : { isVisible: true }),
        },
      },
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
        addons: {
          include: { addonCategory: true },
          ...(req.user ? {} : { where: { isAvailable: true } }),
        },
        shopProducts: {
          where: { shopId },
          select: { isVisible: true },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    sendSuccess(res, products, 'Products retrieved successfully');
  }

  static async getCategories(req: Request, res: Response): Promise<void> {
    const { shopId } = req.query;

    const where: any = {};
    if (shopId) {
      where.shopId = String(shopId);
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    sendSuccess(res, categories, 'Categories retrieved successfully');
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
    const { categoryId, shopId, name, description, price, image, isAvailable, isPopular, stock, order } = req.body;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    if (shopId) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) throw new NotFoundError('Shop not found');
    }

    const shops = await prisma.shop.findMany({ select: { id: true } });
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
        shopProducts: {
          create: shops.map((shop) => ({ shopId: shop.id })),
        },
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        shopProducts: true,
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

  static async toggleProductVisibility(req: AuthRequest, res: Response): Promise<void> {
    const { productId, shopId } = req.params;
    if (req.user?.role === 'STAFF') {
      const assignment = await prisma.shopStaff.findUnique({
        where: { shopId_userId: { shopId, userId: req.user.id } },
      });
      if (!assignment) {
        throw new NotFoundError('Shop assignment not found');
      }
    }

    const shopProduct = await prisma.shopProduct.findUnique({
      where: { shopId_productId: { shopId, productId } },
    });

    if (!shopProduct) {
      throw new NotFoundError('Product is not assigned to this shop');
    }

    const updated = await prisma.shopProduct.update({
      where: { id: shopProduct.id },
      data: { isVisible: !shopProduct.isVisible },
    });

    sendSuccess(res, updated, 'Product visibility updated successfully');
  }

  static async addProductAddon(req: AuthRequest, res: Response): Promise<void> {
    const { productId } = req.params;
    const { name, categoryId, price } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const addonCategory = await prisma.addonCategory.findUnique({ where: { id: categoryId } });
    if (!addonCategory) throw new NotFoundError('Addon category not found');

    const addon = await prisma.productAddon.create({
      data: {
        productId,
        name,
        addonCategoryId: categoryId,
        category: addonCategory.name,
        selectionMode: getCategorySelectionMode(addonCategory),
        price: price || 0,
      },
    });

    sendSuccess(res, addon, 'Addon added successfully', 201);
  }

  static async updateProductAddon(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, categoryId, price } = req.body;
    const addon = await prisma.productAddon.findUnique({ where: { id } });

    if (!addon) {
      throw new NotFoundError('Addon not found');
    }

    const addonCategory = categoryId
      ? await prisma.addonCategory.findUnique({ where: { id: categoryId } })
      : null;
    if (categoryId && !addonCategory) throw new NotFoundError('Addon category not found');

    const updated = await prisma.productAddon.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(addonCategory && {
          addonCategoryId: addonCategory.id,
          category: addonCategory.name,
          selectionMode: getCategorySelectionMode(addonCategory),
        }),
        ...(price !== undefined && { price }),
      },
    });

    sendSuccess(res, updated, 'Addon updated successfully');
  }

  static async removeProductAddon(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const addon = await prisma.productAddon.findUnique({
      where: { id },
    });

    if (!addon) {
      throw new NotFoundError('Addon not found');
    }

    const orderItemAddonCount = await prisma.orderItemAddon.count({
      where: { productAddonId: id },
    });
    if (orderItemAddonCount > 0) {
      throw new BadRequestError('Addon yang sudah digunakan pada pesanan tidak dapat dihapus. Nonaktifkan addon tersebut.');
    }

    await prisma.productAddon.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Addon removed successfully');
  }

  static async toggleProductAddonAvailability(req: AuthRequest, res: Response): Promise<void> {
    const { addonId, shopId } = req.params;

    const addon = await prisma.productAddon.findUnique({
      where: { id: addonId },
      include: { product: { include: { shopProducts: true } } },
    });

    if (!addon) {
      throw new NotFoundError('Addon not found');
    }

    if (req.user?.role === 'STAFF') {
      const hasShopAccess = await prisma.shopStaff.findUnique({
        where: { shopId_userId: { shopId, userId: req.user.id } },
      });
      const productAssigned = addon.product.shopProducts.some((shopProduct) => shopProduct.shopId === shopId);
      if (!hasShopAccess || !productAssigned) {
        throw new NotFoundError('Product is not assigned to this shop');
      }
    }

    const updated = await prisma.productAddon.update({
      where: { id: addonId },
      data: { isAvailable: !addon.isAvailable },
    });

    sendSuccess(res, updated, 'Addon availability updated successfully');
  }
}
