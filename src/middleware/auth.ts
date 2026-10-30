import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { AppError } from '../utils/errors';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer token

  if (!token) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      email: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    throw new AppError('Invalid or expired token', 401);
  }
};

export const optionalAuthenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    req.user = jwt.verify(token, config.jwt.secret) as {
      id: string;
      email: string;
      role: string;
    };
    next();
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError('Access denied', 403);
    }
    next();
  };
};
