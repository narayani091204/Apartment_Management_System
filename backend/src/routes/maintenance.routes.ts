import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  addComment,
  createRequest,
  getRequest,
  listRequests,
  updateStatus,
} from '../controllers/maintenance.controller.js';
import {
  addCommentSchema,
  createMaintenanceSchema,
  listMaintenanceQuerySchema,
  updateStatusSchema,
} from '../validators/maintenance.schema.js';

const router = Router();
router.use(authenticate);

router
  .route('/')
  .get(validate(listMaintenanceQuerySchema, 'query'), asyncHandler(listRequests))
  // Residents file their own requests; admins can log on behalf of residents.
  .post(authorize('resident', 'admin'), validate(createMaintenanceSchema), asyncHandler(createRequest));

router.get('/:id', asyncHandler(getRequest));

// Staff move requests through their lifecycle.
router.patch(
  '/:id/status',
  authorize('admin', 'security'),
  validate(updateStatusSchema),
  asyncHandler(updateStatus),
);

router.post('/:id/comments', validate(addCommentSchema), asyncHandler(addComment));

export default router;
