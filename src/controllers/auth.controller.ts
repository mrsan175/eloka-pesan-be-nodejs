import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config/environment';
import { redis } from '../config/redis';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestError('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = AuthController.generateTokens(user);

    // Store refresh token
    await AuthController.storeRefreshToken(user.id, refreshToken);

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    }, 'Registration successful', 201);
  }

  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new BadRequestError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = AuthController.generateTokens(user);

    // Store refresh token
    await AuthController.storeRefreshToken(user.id, refreshToken);

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    }, 'Login successful');
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    // Verify refresh token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Check if refresh token exists in Redis
    const storedToken = await redis.get(`refresh_token:${decoded.id}`);
    if (storedToken !== refreshToken) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = AuthController.generateTokens(user);

    // Update refresh token in Redis
    await AuthController.storeRefreshToken(user.id, newRefreshToken);

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken: newRefreshToken,
    }, 'Token refreshed successfully');
  }

  static async logout(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.user!;

    // Remove refresh token from Redis
    await redis.del(`refresh_token:${id}`);

    sendSuccess(res, null, 'Logged out successfully');
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      sendSuccess(res, null, 'If email exists, reset link has been sent');
      return;
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.id },
      config.jwt.secret,
      { expiresIn: '15m' }
    );

    // Store in Redis (will be used for verification)
    await redis.set(`password_reset:${resetToken}`, user.id, 'EX', 900); // 15 minutes

    // TODO: Send email with reset link
    // For now, just return success
    sendSuccess(res, null, 'If email exists, reset link has been sent');
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body;

    // Verify token
    try {
      jwt.verify(token, config.jwt.secret) as { id: string };
    } catch (error) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Verify token exists in Redis
    const userId = await redis.get(`password_reset:${token}`);
    if (!userId) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens for this user
    await redis.del(`refresh_token:${userId}`);

    sendSuccess(res, null, 'Password reset successful');
  }

  private static generateTokens(user: {
    id: string;
    email: string;
    role: string;
  }): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as SignOptions
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn } as SignOptions
    );

    return { accessToken, refreshToken };
  }

  private static async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { exp: number };
    const expiryTime = decoded.exp - Math.floor(Date.now() / 1000);
    
    await redis.set(`refresh_token:${userId}`, refreshToken, 'EX', expiryTime);
  }
}
