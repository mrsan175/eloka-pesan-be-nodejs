import Redis from 'ioredis';
import { config } from './environment';
import { logger } from '../utils/logger';

/**
 * Redis connection strategy:
 * - production  : REDIS_URL (Redis Cloud / managed)
 * - development : Redis lokal (REDIS_HOST:REDIS_PORT)
 */
const createRedisClient = (): Redis => {
  const commonOptions = {
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
  };

  if (config.isProduction) {
    if (!config.redis.url) {
      logger.error('REDIS_URL is not set in production environment');
    }
    logger.info('Redis: using REDIS_URL (production)');
    return new Redis(config.redis.url as string, commonOptions);
  }

  logger.info(
    `Redis: using local ${config.redis.host}:${config.redis.port} (${config.env})`
  );
  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    ...commonOptions,
  });
};

export const redis = createRedisClient();

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('ready', () => {
  logger.info('Redis client is ready');
});

redis.on('error', (error) => {
  logger.error(`Redis connection error: ${error.message}`);
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redis.ping();
  } catch (error) {
    logger.error('Failed to ping Redis:', error);
  }
};

export const disconnectRedis = async (): Promise<void> => {
  await redis.quit();
  logger.info('Disconnected from Redis');
};
