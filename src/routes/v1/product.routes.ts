import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth';
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

// Categories - public GET, protected POST/PUT/DELETE
router.get(
  '/categories',
  [query('shopId').optional().isString().withMessage('Shop ID must be a string'), validateRequest],
  asyncHandler(ProductController.getCategories)
);

router.get(
  '/shop/:shopId',
  optionalAuthenticate,
  [param('shopId').isString().notEmpty().withMessage('Invalid shop ID'), validateRequest],
  asyncHandler(ProductController.getProductsByShop)
);

router.get(
  '/:id',
  [param('id').isString().notEmpty().withMessage('Invalid product ID'), validateRequest],
  asyncHandler(ProductController.getProductById)
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
  authorize(['ADMIN']),
  asyncHandler(ProductController.createCategory)
);

router.put(
  '/categories/:id',
  [
    param('id').isString().notEmpty().withMessage('Invalid category ID'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    validateRequest,
  ],
  authorize(['ADMIN']),
  asyncHandler(ProductController.updateCategory)
);

router.delete(
  '/categories/:id',
  [param('id').isString().notEmpty().withMessage('Invalid category ID'), validateRequest],
  authorize(['ADMIN']),
  asyncHandler(ProductController.deleteCategory)
);

// Product routes
router.post(
  '/',
  [
    body('categoryId').notEmpty().withMessage('Category ID is required'),
    body('shopId').notEmpty().withMessage('Shop ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be non-negative number'),
    validateRequest,
  ],
  authorize(['ADMIN']),
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
  authorize(['ADMIN']),
  asyncHandler(ProductController.updateProduct)
);

router.delete(
  '/:id',
  [param('id').isString().notEmpty().withMessage('Invalid product ID'), validateRequest],
  authorize(['ADMIN']),
  asyncHandler(ProductController.deleteProduct)
);

router.post(
  '/:id/toggle-availability',
  [param('id').isString().notEmpty().withMessage('Invalid product ID'), validateRequest],
  authorize(['ADMIN']),
  asyncHandler(ProductController.toggleProductAvailability)
);

router.post(
  '/:productId/shops/:shopId/toggle-visibility',
  [
    param('productId').isString().notEmpty(),
    param('shopId').isString().notEmpty(),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.toggleProductVisibility)
);

// Product option routes
router.post(
  '/:productId/addons',
  [
    param('productId').isString().notEmpty().withMessage('Invalid product ID'),
    body('name').notEmpty().withMessage('Addon name is required'),
    body('category').optional().isString().notEmpty().withMessage('Addon category cannot be empty'),
    body('optionName').optional().isString(),
    body('price').isFloat({ min: 0 }).withMessage('Price must be non-negative number'),
    validateRequest,
  ],
  authorize(['ADMIN']),
  asyncHandler(ProductController.addProductAddon)
);

router.post(
  '/:productId/sizes',
  [
    param('productId').isString().notEmpty().withMessage('Invalid product ID'),
    body('name').notEmpty().withMessage('Size name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Size price must be non-negative number'),
    body('order').optional().isInt({ min: 0 }),
    validateRequest,
  ],
  authorize(['ADMIN']),
  asyncHandler(ProductController.addProductSize)
);

router.delete(
  '/addons/:id',
  [param('id').isString().notEmpty().withMessage('Invalid addon ID'), validateRequest],
  authorize(['ADMIN']),
  asyncHandler(ProductController.removeProductAddon)
);

router.post(
  '/addons/:addonId/shops/:shopId/toggle-availability',
  [
    param('addonId').isString().notEmpty().withMessage('Invalid addon ID'),
    param('shopId').isString().notEmpty().withMessage('Invalid shop ID'),
    validateRequest,
  ],
  authorize(['ADMIN', 'STAFF']),
  asyncHandler(ProductController.toggleProductAddonAvailability)
);

export default router;
