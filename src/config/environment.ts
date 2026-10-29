import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

export const config = {
  env: nodeEnv,
  isProduction,
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  // Production  -> REDIS_URL (Redis Cloud / managed)
  // Development -> Redis lokal (REDIS_HOST:REDIS_PORT)
  redis: isProduction
    ? {
        url: process.env.REDIS_URL || '',
        host: undefined,
        port: undefined,
        password: undefined,
        db: undefined,
      }
    : {
        url: undefined,
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
      },

  // JWT
  jwt: {
    secret: (process.env.JWT_SECRET || 'your-secret-key-change-in-production')!,
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d')!,
    refreshSecret: (process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production')!,
    refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d')!,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // File Upload
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    dir: process.env.UPLOAD_DIR || './uploads',
  },
};
