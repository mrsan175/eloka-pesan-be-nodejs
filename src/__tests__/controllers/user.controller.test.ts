import { Request, Response } from 'express';
import { UserController } from '../../controllers/user.controller';
import { mockPrisma } from '../mocks/prisma.mock';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserController', () => {
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

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '08123456789',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await UserController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        select: expect.any(Object),
      });
      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toEqual(mockUser);
    });

    it('should throw NotFoundError if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        UserController.getProfile(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      mockRequest.body = { name: 'Updated Name', phone: '08198765432' };

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-id-123',
        email: 'test@example.com',
        name: 'Updated Name',
        phone: '08198765432',
        role: 'CUSTOMER',
        updatedAt: new Date(),
      });

      await UserController.updateProfile(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { name: 'Updated Name', phone: '08198765432' },
        select: expect.any(Object),
      });
      expect(responseObject.success).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockRequest.body = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id-123',
        email: 'test@example.com',
        password: 'hashedPassword',
      });
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedBcrypt.hash.mockResolvedValue('newHashedPassword' as never);
      mockPrisma.user.update.mockResolvedValue({});

      await UserController.changePassword(mockRequest as Request, mockResponse as Response);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith('oldpassword123', 'hashedPassword');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        data: { password: 'newHashedPassword' },
      });
      expect(responseObject.success).toBe(true);
    });

    it('should throw BadRequestError if current password is incorrect', async () => {
      mockRequest.body = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id-123',
        password: 'hashedPassword',
      });
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        UserController.changePassword(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError if user not found', async () => {
      mockRequest.body = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        UserController.changePassword(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAddresses', () => {
    it('should return user addresses', async () => {
      const mockAddresses = [
        {
          id: 'addr-1',
          userId: 'user-id-123',
          label: 'Home',
          street: 'Jl. Sudirman',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
          coordinates: [106.8231, -6.1751],
          isDefault: true,
        },
      ];

      mockPrisma.address.findMany.mockResolvedValue(mockAddresses);

      await UserController.getAddresses(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.address.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-123' },
        orderBy: { isDefault: 'desc' },
      });
      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toEqual(mockAddresses);
    });
  });

  describe('createAddress', () => {
    it('should create a new address', async () => {
      const addressData = {
        label: 'Work',
        street: 'Jl. Thamrin',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        coordinates: [106.8231, -6.1751],
        isDefault: true,
      };

      mockRequest.body = addressData;

      mockPrisma.address.create.mockResolvedValue({
        id: 'new-addr',
        ...addressData,
        userId: 'user-id-123',
      });
      mockPrisma.address.updateMany.mockResolvedValue({ count: 0 });

      await UserController.createAddress(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.address.updateMany).toHaveBeenCalled();
      expect(mockPrisma.address.create).toHaveBeenCalledWith({
        data: expect.objectContaining(addressData),
      });
      expect(responseObject.success).toBe(true);
    });

    it('should unset other defaults when creating new default address', async () => {
      const addressData = {
        label: 'New Default',
        street: 'Jl. Sudirman',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        isDefault: true,
      };

      mockRequest.body = addressData;

      mockPrisma.address.create.mockResolvedValue({ id: 'new-addr', ...addressData, userId: 'user-id-123' });

      await UserController.createAddress(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-123', isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('updateAddress', () => {
    it('should update address', async () => {
      mockRequest.params = { id: 'addr-1' };
      mockRequest.body = { label: 'Updated Label' };

      mockPrisma.address.findFirst.mockResolvedValue({
        id: 'addr-1',
        userId: 'user-id-123',
      });
      mockPrisma.address.update.mockResolvedValue({ id: 'addr-1', label: 'Updated Label' });

      await UserController.updateAddress(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: { label: 'Updated Label' },
      });
      expect(responseObject.success).toBe(true);
    });

    it('should throw NotFoundError if address not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockPrisma.address.findFirst.mockResolvedValue(null);

      await expect(
        UserController.updateAddress(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteAddress', () => {
    it('should delete address', async () => {
      mockRequest.params = { id: 'addr-1' };

      mockPrisma.address.findFirst.mockResolvedValue({ id: 'addr-1' });
      mockPrisma.address.delete.mockResolvedValue({ id: 'addr-1' });

      await UserController.deleteAddress(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.address.delete).toHaveBeenCalledWith({ where: { id: 'addr-1' } });
      expect(responseObject.success).toBe(true);
    });

    it('should throw NotFoundError if address not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockPrisma.address.findFirst.mockResolvedValue(null);

      await expect(
        UserController.deleteAddress(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('setDefaultAddress', () => {
    it('should set address as default', async () => {
      mockRequest.params = { id: 'addr-1' };

      mockPrisma.address.findFirst.mockResolvedValue({ id: 'addr-1' });
      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.address.update.mockResolvedValue({ id: 'addr-1', isDefault: true });

      await UserController.setDefaultAddress(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-123', isDefault: true },
        data: { isDefault: false },
      });
      expect(mockPrisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: { isDefault: true },
      });
      expect(responseObject.success).toBe(true);
    });

    it('should throw NotFoundError if address not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockPrisma.address.findFirst.mockResolvedValue(null);

      await expect(
        UserController.setDefaultAddress(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllUsers', () => {
    beforeEach(() => {
      mockRequest = {
        query: { page: '1', limit: '10' },
        user: {
          id: 'admin-id',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
      };
    });

    it('should return all users with pagination', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          phone: '08123456789',
          role: 'CUSTOMER',
          isActive: true,
          createdAt: new Date(),
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      await UserController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.user.findMany).toHaveBeenCalled();
      expect(mockPrisma.user.count).toHaveBeenCalled();
      expect(responseObject.success).toBe(true);
      expect(responseObject.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      mockRequest.query = { page: '1', limit: '10', search: 'john' };

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await UserController.getAllUsers(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                email: expect.objectContaining({ contains: 'john' }),
              }),
              expect.objectContaining({
                name: expect.objectContaining({ contains: 'john' }),
              }),
            ]),
          }),
        })
      );
    });
  });
});
