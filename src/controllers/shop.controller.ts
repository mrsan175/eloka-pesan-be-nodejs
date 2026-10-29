import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { findNearbyShops } from '../services/geolocation.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class ShopController {
  static async getAllShops(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 10, search, isOpen } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { address: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    if (isOpen !== undefined) {
      where.isOpen = isOpen === 'true';
    }

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        include: {
          _count: {
            select: { categories: true, orders: true },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shop.count({ where }),
    ]);

    sendSuccess(res, shops, 'Shops retrieved successfully', 200, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    });
  }

  static async getNearbyShops(req: Request, res: Response): Promise<void> {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = req.query.radius !== undefined ? Number(req.query.radius) : 10;
    const limit = req.query.limit !== undefined ? Number(req.query.limit) : 20;

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new BadRequestError('Invalid latitude (must be between -90 and 90)');
    }

    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new BadRequestError('Invalid longitude (must be between -180 and 180)');
    }

    if (!Number.isFinite(radius) || radius <= 0 || radius > 100) {
      throw new BadRequestError('Invalid radius (must be between 1 and 100 km)');
    }

    const nearby = await findNearbyShops(lat, lng, radius, limit);

    if (nearby.length > 0) {
      const shops = await prisma.shop.findMany({
        where: { id: { in: nearby.map((item) => item.shopId) } },
        include: {
          _count: {
            select: { categories: true, orders: true },
          },
        },
      });

      const shopMap = new Map(shops.map((shop) => [shop.id, shop]));

      const data = nearby.reduce<Array<(typeof shops)[number] & { distance: number | null }>>(
        (acc, item) => {
          const shop = shopMap.get(item.shopId);
          if (shop) {
            acc.push({ ...shop, distance: item.distance ?? null });
          }
          return acc;
        },
        []
      );

      sendSuccess(res, data, 'Nearby shops retrieved successfully');
      return;
    }

    // Fallback: Redis index may be empty/unavailable, compute distance from DB.
    const shops = await prisma.shop.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      include: {
        _count: {
          select: { categories: true, orders: true },
        },
      },
    });

    const data = shops
      .map((shop) => ({
        ...shop,
        distance:
          Math.round(haversineDistance(lat, lng, shop.latitude as number, shop.longitude as number) * 10) / 10,
      }))
      .filter((shop) => shop.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    sendSuccess(res, data, 'Nearby shops retrieved successfully');
  }

  static async getShopById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            products: {
              where: { isAvailable: true },
              orderBy: { order: 'asc' },
              include: {
                variants: {
                  where: { isAvailable: true },
                },
                addons: {
                  where: { isAvailable: true },
                },
              },
            },
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    sendSuccess(res, shop, 'Shop retrieved successfully');
  }

  static async createShop(req: AuthRequest, res: Response): Promise<void> {
    const { name, description, logo, address, phone, email, openTime, closeTime } = req.body;

    const shop = await prisma.shop.create({
      data: {
        name,
        description,
        logo,
        address,
        phone,
        email,
        openTime,
        closeTime,
      },
    });

    sendSuccess(res, shop, 'Shop created successfully', 201);
  }

  static async updateShop(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, description, logo, address, phone, email, openTime, closeTime } = req.body;

    const existingShop = await prisma.shop.findUnique({
      where: { id },
    });

    if (!existingShop) {
      throw new NotFoundError('Shop not found');
    }

    const shop = await prisma.shop.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(logo !== undefined && { logo }),
        ...(address && { address }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(openTime && { openTime }),
        ...(closeTime && { closeTime }),
      },
    });

    sendSuccess(res, shop, 'Shop updated successfully');
  }

  static async deleteShop(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    if (shop._count.orders > 0) {
      throw new BadRequestError('Cannot delete shop with existing orders');
    }

    await prisma.shop.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Shop deleted successfully');
  }

  static async toggleShopStatus(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { id },
    });

    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    const updatedShop = await prisma.shop.update({
      where: { id },
      data: { isOpen: !shop.isOpen },
    });

    sendSuccess(
      res,
      { isOpen: updatedShop.isOpen },
      `Shop is now ${updatedShop.isOpen ? 'open' : 'closed'}`
    );
  }
}

/**
 * Haversine formula to calculate distance between two coordinates in kilometers
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
