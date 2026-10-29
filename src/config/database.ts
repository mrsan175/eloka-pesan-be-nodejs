import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL Database (Neon)');
  } catch (error) {
    logger.error('Failed to connect to Database:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('Disconnected from PostgreSQL Database');
};
