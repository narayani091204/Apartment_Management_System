import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createUser,
  deactivateUser,
  getUser,
  listUsers,
  updateUser,
} from '../controllers/user.controller.js';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from '../validators/user.schema.js';

const router = Router();

// All user-management routes are admin-only.
router.use(authenticate, authorize('admin'));

router
  .route('/')
  .get(validate(listUsersQuerySchema, 'query'), asyncHandler(listUsers))
  .post(validate(createUserSchema), asyncHandler(createUser));

router
  .route('/:id')
  .get(asyncHandler(getUser))
  .patch(validate(updateUserSchema), asyncHandler(updateUser))
  .delete(asyncHandler(deactivateUser));

export default router;
