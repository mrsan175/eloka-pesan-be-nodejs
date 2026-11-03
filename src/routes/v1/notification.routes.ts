import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { NotificationController } from '../../controllers/notification.controller';

const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'STAFF']));
router.get('/history', asyncHandler(NotificationController.getHistory));
router.get('/stream', asyncHandler(NotificationController.stream));

export default router;
