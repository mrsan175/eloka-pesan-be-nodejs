import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthController } from '../../controllers/auth.controller';
import { mockPrisma } from '../mocks/prisma.mock';
import { mockRedis } from '../mocks/redis.mock';
import { BadRequestError, UnauthorizedError } from '../../utils/errors';

// Mock bcrypt
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock jwt
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthController', () => {
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
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((result) => {
        responseObject = result;
        return mockResponse;
      }),
    };

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Default JWT behaviour so token generation/storage works
    mockedJwt.sign.mockReturnValue('mock-token' as any);
    mockedJwt.verify.mockReturnValue({
      id: 'user-id-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
    } as any);
    mockRedis.set.mockResolvedValue('OK' as never);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockRequest.body = userData;

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-id-123',
        email: userData.email,
        name: userData.name,
        password: 'hashedPassword',
        role: 'CUSTOMER',
        phone: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await AuthController.register(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
      expect(responseObject.data.user.email).toBe(userData.email);
      expect(responseObject.data.accessToken).toBeDefined();
      expect(responseObject.data.refreshToken).toBeDefined();
    });

    it('should throw BadRequestError if email already exists', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'hashedPassword',
        role: 'CUSTOMER',
        phone: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        AuthController.register(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockRequest.body = loginData;

      const mockUser = {
        id: 'user-id-123',
        email: loginData.email,
        name: 'Test User',
        password: 'hashedPassword',
        role: 'CUSTOMER',
        phone: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedJwt.sign.mockReturnValue('mock-jwt-token' as any);
      mockRedis.set.mockResolvedValue('OK' as never);

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          role: true,
          isActive: true,
        },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(responseObject.success).toBe(true);
      expect(responseObject.data.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedError with invalid email', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        AuthController.login(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError with invalid password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'CUSTOMER',
        phone: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        AuthController.login(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if user is inactive', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'CUSTOMER',
        phone: null,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        AuthController.login(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockRequest.body = {
        refreshToken: 'valid-refresh-token',
      };

      const mockDecoded = {
        id: 'user-id-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockedJwt.verify.mockReturnValue(mockDecoded as any);
      mockRedis.get.mockResolvedValue('valid-refresh-token' as never);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'CUSTOMER',
        phone: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockedJwt.sign.mockReturnValue('new-token' as any);
      mockRedis.set.mockResolvedValue('OK' as never);

      await AuthController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockedJwt.verify).toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledWith('refresh_token:user-id-123');
      expect(responseObject.success).toBe(true);
      expect(responseObject.data.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedError with invalid refresh token', async () => {
      mockRequest.body = {
        refreshToken: 'invalid-token',
      };

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        AuthController.refreshToken(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if token not in Redis', async () => {
      mockRequest.body = {
        refreshToken: 'valid-refresh-token',
      };

      mockedJwt.verify.mockReturnValue({ id: 'user-id-123' } as any);
      mockRedis.get.mockResolvedValue(null as never);

      await expect(
        AuthController.refreshToken(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      mockRequest = {
        user: {
          id: 'user-id-123',
          email: 'test@example.com',
          role: 'CUSTOMER',
        },
      } as any;

      mockRedis.del.mockResolvedValue(1 as never);

      await AuthController.logout(mockRequest as any, mockResponse as Response);

      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user-id-123');
      expect(responseObject.success).toBe(true);
    });
  });
});
