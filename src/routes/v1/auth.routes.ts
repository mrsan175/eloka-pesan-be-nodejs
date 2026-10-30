import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthController } from '../../controllers/auth.controller';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    validateRequest,
  ],
  asyncHandler(AuthController.register)
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest,
  ],
  asyncHandler(AuthController.login)
);

router.post(
  '/refresh-token',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    validateRequest,
  ],
  asyncHandler(AuthController.refreshToken)
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(AuthController.logout)
);

router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Invalid email'),
    validateRequest,
  ],
  asyncHandler(AuthController.forgotPassword)
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validateRequest,
  ],
  asyncHandler(AuthController.resetPassword)
);

export default router;
