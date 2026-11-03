/**
 * Session Cache Middleware using Redis
 * Cache user session data to reduce database queries
 */

import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface CachedSession {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  shopIds?: string[]; // For STAFF: assigned shop IDs
}

const SESSION_TTL = 3600; // 1 hour
const SESSION_KEY_PREFIX = 'session:user:';

/**
 * Get session key for user ID
 */
const getSessionKey = (userId: string): string => {
  return `${SESSION_KEY_PREFIX}${userId}`;
};

/**
 * Get cached session from Redis
 */
export const getCachedSession = async (userId: string): Promise<CachedSession | null> => {
  try {
    const key = getSessionKey(userId);
    const cached = await redis.get(key);
    
    if (cached) {
      logger.debug(`Session cache hit for user ${userId}`);
      return JSON.parse(cached) as CachedSession;
    }
    
    return null;
  } catch (error) {
    logger.error(`Failed to get cached session: ${error}`);
    return null;
  }
};

/**
 * Set session cache in Redis
 */
export const setCachedSession = async (
  userId: string,
  session: CachedSession
): Promise<void> => {
  try {
    const key = getSessionKey(userId);
    await redis.setex(key, SESSION_TTL, JSON.stringify(session));
    logger.debug(`Session cached for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to cache session: ${error}`);
  }
};

/**
 * Delete session cache from Redis (on logout, role change, etc)
 */
export const deleteCachedSession = async (userId: string): Promise<void> => {
  try {
    const key = getSessionKey(userId);
    await redis.del(key);
    logger.debug(`Session cache deleted for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to delete cached session: ${error}`);
  }
};

/**
 * Middleware to load user session with caching
 * Use after authenticate middleware
 */
export const loadSession = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    next();
    return;
  }

  try {
    // Try cache first
    let session = await getCachedSession(req.user.id);

    // Cache miss - load from DB
    if (!session) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });

      if (!user) {
        next();
        return;
      }

      // For STAFF, load assigned shop IDs
      let shopIds: string[] | undefined;
      if (user.role === 'STAFF') {
        const shopStaff = await prisma.shopStaff.findMany({
          where: { userId: user.id },
          select: { shopId: true },
        });
        shopIds = shopStaff.map((s) => s.shopId);
      }

      session = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        shopIds,
      };

      // Cache for future requests
      await setCachedSession(user.id, session);
    }

    // Attach session data to request
    req.user = {
      id: session.id,
      email: session.email,
      role: session.role,
      ...(session.shopIds && { shopIds: session.shopIds }),
    } as any;

    next();
  } catch (error) {
    logger.error(`Session loading error: ${error}`);
    next();
  }
};
