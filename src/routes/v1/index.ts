import { Router } from 'express';
import { config } from '../../config/environment';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Eloka Pesan API is running',
    version: config.apiVersion,
    timestamp: new Date().toISOString(),
  });
});

// Import route modules
import userRoutes from './user.routes';
import authRoutes from './auth.routes';
import shopRoutes from './shop.routes';
import productRoutes from './product.routes';
import orderRoutes from './order.routes';
import swaggerDocs from './swagger.routes';

router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/shops', shopRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/docs', swaggerDocs);

export default router;
