import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import {
  listNotifications,
  markAllRead,
  markRead,
} from '../controllers/notification.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(listNotifications));
router.patch('/read-all', asyncHandler(markAllRead));
router.patch('/:id/read', asyncHandler(markRead));

export default router;
