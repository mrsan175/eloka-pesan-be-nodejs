import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class UserController {
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    sendSuccess(res, user, 'Profile retrieved successfully');
  }

  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    const { name, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, user, 'Profile updated successfully');
  }

  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
    });

    sendSuccess(res, null, 'Password changed successfully');
  }

  static async getAddresses(req: AuthRequest, res: Response): Promise<void> {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: { isDefault: 'desc' },
    });

    sendSuccess(res, addresses, 'Addresses retrieved successfully');
  }

  static async createAddress(req: AuthRequest, res: Response): Promise<void> {
    const { label, street, city, province, postalCode, coordinates, isDefault } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.user!.id,
        label,
        street,
        city,
        province,
        postalCode,
        coordinates,
        isDefault: isDefault || false,
      },
    });

    sendSuccess(res, address, 'Address created successfully', 201);
  }

  static async updateAddress(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { label, street, city, province, postalCode, coordinates, isDefault } = req.body;

    // Check ownership
    const existingAddress = await prisma.address.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existingAddress) {
      throw new NotFoundError('Address not found');
    }

    if (isDefault && !existingAddress.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        ...(label && { label }),
        ...(street && { street }),
        ...(city && { city }),
        ...(province && { province }),
        ...(postalCode && { postalCode }),
        ...(coordinates !== undefined && { coordinates }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    sendSuccess(res, address, 'Address updated successfully');
  }

  static async deleteAddress(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const address = await prisma.address.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!address) {
      throw new NotFoundError('Address not found');
    }

    await prisma.address.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Address deleted successfully');
  }

  static async setDefaultAddress(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const address = await prisma.address.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!address) {
      throw new NotFoundError('Address not found');
    }

    // Unset all defaults
    await prisma.address.updateMany({
      where: { userId: req.user!.id, isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    sendSuccess(res, null, 'Default address updated');
  }

  static async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    const { page = 1, limit = 10, search } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where = search
      ? {
          OR: [
            { email: { contains: String(search), mode: 'insensitive' as const } },
            { name: { contains: String(search), mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, users, 'Users retrieved successfully', 200, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    });
  }
}