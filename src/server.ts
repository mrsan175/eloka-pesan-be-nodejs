import { createApp } from './app';
import { config } from './config/environment';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { logger } from './utils/logger';

const app = createApp();

const startServer = async (): Promise<void> => {
  try {
    // Connect to Database
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

    // Start Express Server
    const server = app.listen(config.port, () => {
      logger.info(` Server running in ${config.env} mode on port ${config.port}`);
      logger.info(` API Documentation: http://localhost:${config.port}/api/${config.apiVersion}/docs`);
      logger.info(` Health Check: http://localhost:${config.port}/api/${config.apiVersion}/health`);
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} signal received: closing HTTP server`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close Database Connection
        await disconnectDatabase();

        // Close Redis Connection
        await disconnectRedis();

        process.exit(0);
      });

      // Force shutdown after 10s
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
