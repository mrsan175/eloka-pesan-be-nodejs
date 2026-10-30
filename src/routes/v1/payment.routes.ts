import { Router } from 'express';
import { body, param } from 'express-validator';
import { optionalAuthenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import { PaymentController } from '../../controllers/payment.controller';

const router = Router();

router.post(
  '/',
  [optionalAuthenticate, body('orderId').isString().notEmpty(), validateRequest],
  asyncHandler(PaymentController.createPayment),
);
router.post(
  '/simulate/:transactionId',
  [optionalAuthenticate, param('transactionId').isString().notEmpty(), validateRequest],
  asyncHandler(PaymentController.simulateScan),
);
router.get(
  '/:orderId/status',
  [optionalAuthenticate, param('orderId').isString().notEmpty(), validateRequest],
  asyncHandler(PaymentController.getStatus),
);
router.get(
  '/:orderId/events',
  [optionalAuthenticate, param('orderId').isString().notEmpty(), validateRequest],
  asyncHandler(PaymentController.streamStatus),
);
router.post(
  '/webhook',
  [body('transactionId').isString().notEmpty(), body('status').isString(), validateRequest],
  asyncHandler(PaymentController.webhook),
);

export default router;
