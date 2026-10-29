import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { ShopController } from '../../controllers/shop.controller';

const router = Router();

// Public routes
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    validateRequest,
  ],
  asyncHandler(ShopController.getAllShops)
);

router.get(
  '/nearby',
  [
    query('lat').isFloat({ min: -90, max: 90 }).toFloat().withMessage('Invalid latitude'),
    query('lng').isFloat({ min: -180, max: 180 }).toFloat().withMessage('Invalid longitude'),
    query('radius').optional().isFloat({ min: 1, max: 100 }).toFloat().withMessage('Radius must be 1-100 km'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt().withMessage('Limit must be 1-50'),
    validateRequest,
  ],
  asyncHandler(ShopController.getNearbyShops)
);

router.get(
  '/:id',
  [param('id').isString().notEmpty().withMessage('Invalid shop ID'), validateRequest],
  asyncHandler(ShopController.getShopById)
);

// Protected routes - requires authentication
router.use(authenticate);

// Admin/Staff routes
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('openTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid open time format (HH:mm)'),
    body('closeTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid close time format (HH:mm)'),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ShopController.createShop)
);

router.put(
  '/:id',
  [
    param('id').isString().notEmpty().withMessage('Invalid shop ID'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('openTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid open time format'),
    body('closeTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid close time format'),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ShopController.updateShop)
);

router.delete(
  '/:id',
  [param('id').isString().notEmpty().withMessage('Invalid shop ID'), validateRequest],
  authorize(['ADMIN']),
  asyncHandler(ShopController.deleteShop)
);

router.post(
  '/:id/toggle-status',
  [param('id').isString().notEmpty().withMessage('Invalid shop ID'), validateRequest],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ShopController.toggleShopStatus)
);

export default router;
