import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createVisitor,
  getVisitor,
  listVisitors,
  updateVisitorStatus,
} from '../controllers/visitor.controller.js';
import {
  createVisitorSchema,
  listVisitorQuerySchema,
  updateVisitorStatusSchema,
} from '../validators/visitor.schema.js';

const router = Router();
router.use(authenticate);

router
  .route('/')
  .get(validate(listVisitorQuerySchema, 'query'), asyncHandler(listVisitors))
  // Residents pre-register; security logs walk-ins.
  .post(authorize('resident', 'security'), validate(createVisitorSchema), asyncHandler(createVisitor));

router.get('/:id', asyncHandler(getVisitor));

// Gate operations belong to security (admin may override).
router.patch(
  '/:id/status',
  authorize('security', 'admin'),
  validate(updateVisitorStatusSchema),
  asyncHandler(updateVisitorStatus),
);

export default router;
