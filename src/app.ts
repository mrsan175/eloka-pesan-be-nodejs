import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import routes from './routes/v1';

export const createApp = (): Express => {
  const app = express();

  // Security Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
    })
  );

  // Rate Limiting
  app.use('/api', rateLimiter);

  // Body Parsing Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression());

  // Logging
  if (config.env === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // API Routes
  app.use(`/api/${config.apiVersion}`, routes);

  // 404 Handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `Cannot ${req.method} ${req.originalUrl}`,
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
