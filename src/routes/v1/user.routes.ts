import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { UserController } from '../../controllers/user.controller';

const router = Router();

// Protected routes - requires authentication
router.use(authenticate);

// Get current user profile
router.get('/me', asyncHandler(UserController.getProfile));

// Update current user profile
router.put(
  '/me',
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().isMobilePhone('id-ID').withMessage('Invalid phone number'),
    validateRequest,
  ],
  asyncHandler(UserController.updateProfile)
);

// Change password
router.post(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    validateRequest,
  ],
  asyncHandler(UserController.changePassword)
);

// Address management
router.get('/addresses', asyncHandler(UserController.getAddresses));
router.post(
  '/addresses',
  [
    body('label').notEmpty().withMessage('Label is required'),
    body('street').notEmpty().withMessage('Street is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('province').notEmpty().withMessage('Province is required'),
    body('postalCode').notEmpty().withMessage('Postal code is required'),
    validateRequest,
  ],
  asyncHandler(UserController.createAddress)
);
router.put(
  '/addresses/:id',
  [
    body('label').optional().notEmpty().withMessage('Label cannot be empty'),
    body('street').optional().notEmpty().withMessage('Street cannot be empty'),
    body('city').optional().notEmpty().withMessage('City cannot be empty'),
    validateRequest,
  ],
  asyncHandler(UserController.updateAddress)
);
router.delete('/addresses/:id', asyncHandler(UserController.deleteAddress));
router.post('/addresses/:id/set-default', asyncHandler(UserController.setDefaultAddress));

// Admin routes
router.get(
  '/',
  authorize(['ADMIN']),
  asyncHandler(UserController.getAllUsers)
);

export default router;