import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createNotice,
  deleteNotice,
  getNotice,
  listNotices,
  updateNotice,
} from '../controllers/notice.controller.js';
import {
  createNoticeSchema,
  listNoticeQuerySchema,
  updateNoticeSchema,
} from '../validators/notice.schema.js';

const router = Router();
router.use(authenticate);

router
  .route('/')
  .get(validate(listNoticeQuerySchema, 'query'), asyncHandler(listNotices))
  .post(authorize('admin'), validate(createNoticeSchema), asyncHandler(createNotice));

router
  .route('/:id')
  .get(asyncHandler(getNotice))
  .patch(authorize('admin'), validate(updateNoticeSchema), asyncHandler(updateNotice))
  .delete(authorize('admin'), asyncHandler(deleteNotice));

export default router;
