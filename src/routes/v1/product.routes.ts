import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { ProductController } from '../../controllers/product.controller';

const router = Router();

// Public routes
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    validateRequest,
  ],
  asyncHandler(ProductController.getAllProducts)
);

router.get(
  '/:id',
  [param('id').isString().notEmpty().withMessage('Invalid product ID'), validateRequest],
  asyncHandler(ProductController.getProductById)
);

router.get(
  '/shop/:shopId',
  [param('shopId').isString().notEmpty().withMessage('Invalid shop ID'), validateRequest],
  asyncHandler(ProductController.getProductsByShop)
);

// Protected routes - requires authentication
router.use(authenticate);

// Category routes
router.post(
  '/categories',
  [
    body('shopId').notEmpty().withMessage('Shop ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.createCategory)
);

router.put(
  '/categories/:id',
  [
    param('id').isString().notEmpty().withMessage('Invalid category ID'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.updateCategory)
);

router.delete(
  '/categories/:id',
  [param('id').isString().notEmpty().withMessage('Invalid category ID'), validateRequest],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.deleteCategory)
);

// Product routes
router.post(
  '/',
  [
    body('categoryId').notEmpty().withMessage('Category ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be non-negative number'),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.createProduct)
);

router.put(
  '/:id',
  [
    param('id').isString().notEmpty().withMessage('Invalid product ID'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be non-negative number'),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.updateProduct)
);

router.delete(
  '/:id',
  [param('id').isString().notEmpty().withMessage('Invalid product ID'), validateRequest],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.deleteProduct)
);

router.post(
  '/:id/toggle-availability',
  [param('id').isString().notEmpty().withMessage('Invalid product ID'), validateRequest],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.toggleProductAvailability)
);

// Product variant routes
router.post(
  '/:productId/variants',
  [
    param('productId').isString().notEmpty().withMessage('Invalid product ID'),
    body('name').notEmpty().withMessage('Variant name is required'),
    body('optionName').notEmpty().withMessage('Option name is required'),
    body('priceAdjust').optional().isFloat().withMessage('Price adjustment must be a number'),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.addProductVariant)
);

router.delete(
  '/variants/:id',
  [param('id').isString().notEmpty().withMessage('Invalid variant ID'), validateRequest],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.removeProductVariant)
);

// Product addon routes
router.post(
  '/:productId/addons',
  [
    param('productId').isString().notEmpty().withMessage('Invalid product ID'),
    body('name').notEmpty().withMessage('Addon name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be non-negative number'),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.addProductAddon)
);

router.delete(
  '/addons/:id',
  [param('id').isString().notEmpty().withMessage('Invalid addon ID'), validateRequest],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.removeProductAddon)
);

export default router;
