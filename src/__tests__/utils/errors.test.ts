import {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
} from '../../utils/errors';

describe('Custom Errors', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError('Test error', 400);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it('should set status to "error" for 5xx errors', () => {
      const error = new AppError('Server error', 500);

      expect(error.status).toBe('error');
    });

    it('should set status to "fail" for 4xx errors', () => {
      const error = new AppError('Client error', 404);

      expect(error.status).toBe('fail');
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with default message', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.status).toBe('fail');
    });

    it('should create NotFoundError with custom message', () => {
      const error = new NotFoundError('User not found');

      expect(error.message).toBe('User not found');
    });
  });

  describe('BadRequestError', () => {
    it('should create BadRequestError with default message', () => {
      const error = new BadRequestError();

      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(400);
    });

    it('should create BadRequestError with custom message', () => {
      const error = new BadRequestError('Invalid input data');

      expect(error.message).toBe('Invalid input data');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create UnauthorizedError with default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
    });

    it('should create UnauthorizedError with custom message', () => {
      const error = new UnauthorizedError('Token expired');

      expect(error.message).toBe('Token expired');
    });
  });

  describe('ForbiddenError', () => {
    it('should create ForbiddenError with default message', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
    });

    it('should create ForbiddenError with custom message', () => {
      const error = new ForbiddenError('Access denied');

      expect(error.message).toBe('Access denied');
    });
  });

  describe('ConflictError', () => {
    it('should create ConflictError with default message', () => {
      const error = new ConflictError();

      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
    });

    it('should create ConflictError with custom message', () => {
      const error = new ConflictError('Email already registered');

      expect(error.message).toBe('Email already registered');
    });
  });

  describe('InternalServerError', () => {
    it('should create InternalServerError with default message', () => {
      const error = new InternalServerError();

      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
    });

    it('should create InternalServerError with custom message', () => {
      const error = new InternalServerError('Database connection failed');

      expect(error.message).toBe('Database connection failed');
    });
  });
});
