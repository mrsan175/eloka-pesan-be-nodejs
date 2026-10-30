import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth';
import { OrderController } from '../../controllers/order.controller';

const router = Router();

router.post(
  '/',
  [
    optionalAuthenticate,
    body('shopId').notEmpty().withMessage('Shop ID is required'),
    body('orderType').isIn(['DINE_IN', 'TAKEAWAY', 'DELIVERY']).withMessage('Invalid order type'),
    body('tableNumber').if(body('orderType').equals('DINE_IN')).notEmpty().withMessage('Table number is required for dine-in orders'),
    body('addressId').optional().isString().notEmpty().withMessage('Invalid address ID'),
    body('pickupTime').if(body('orderType').equals('TAKEAWAY')).isISO8601().withMessage('Pickup time is required for takeaway orders'),
    body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    body('items.*.productId').notEmpty().withMessage('Product ID is required in each item'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.variantIds').optional().isArray().withMessage('variantIds must be an array'),
    body('items.*.addonIds').optional().isArray().withMessage('addonIds must be an array'),
    body('notes').optional().isString(),
    validateRequest,
  ],
  asyncHandler(OrderController.createOrder)
);

router.get(
  '/my-orders',
  [
    authenticate,
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('status').optional().isIn(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
    validateRequest,
  ],
  asyncHandler(OrderController.getMyOrders)
);

router.get(
  '/:id',
  [
    optionalAuthenticate,
    param('id').isString().notEmpty().withMessage('Invalid order ID'),
    validateRequest,
  ],
  asyncHandler(OrderController.getOrderById)
);

// Customer and staff order routes require authentication.
router.use(authenticate);

router.post(
  '/:id/cancel',
  [
    param('id').isString().notEmpty().withMessage('Invalid order ID'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    validateRequest,
  ],
  asyncHandler(OrderController.cancelOrder)
);

// Staff/Admin routes
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('status').optional().isIn(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
    query('shopId').optional().isString().notEmpty().withMessage('Invalid shop ID'),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(OrderController.getAllOrders)
);

router.patch(
  '/:id/status',
  [
    param('id').isString().notEmpty().withMessage('Invalid order ID'),
    body('status').isIn(['CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(OrderController.updateOrderStatus)
);

router.patch(
  '/:id/payment',
  [
    param('id').isString().notEmpty().withMessage('Invalid order ID'),
    body('paymentMethod').notEmpty().withMessage('Payment method is required'),
    body('paymentStatus').isIn(['PAID', 'REFUNDED']).withMessage('Invalid payment status'),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(OrderController.updatePaymentStatus)
);

export default router;
