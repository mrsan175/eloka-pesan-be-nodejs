import { ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.details || err.message,
    });
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired',
    });
    return;
  }

  // Handle Prisma errors
  if (err.meta?.target === 'Record_too_long') {
    res.status(400).json({
      success: false,
      error: 'Data too long',
    });
    return;
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
};
