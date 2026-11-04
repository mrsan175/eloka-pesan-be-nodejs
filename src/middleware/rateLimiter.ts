import rateLimit from 'express-rate-limit';
import { config } from '../config/environment';

const tooManyRequests = {
  success: false,
  error: 'Too many requests from this IP, please try again later',
};

// General limiter. Not mounted globally yet; apply per-route as needed.
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.maxRequests,
  message: tooManyRequests,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for authentication endpoints.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 auth attempts per IP per window
  message: {
    success: false,
    error: 'Too many login attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
