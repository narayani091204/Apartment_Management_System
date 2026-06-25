import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { login, me, refresh, register } from '../controllers/auth.controller.js';
import { loginSchema, refreshSchema, registerSchema } from '../validators/auth.schema.js';

const router = Router();

router.post('/register', validate(registerSchema), asyncHandler(register));
router.post('/login', validate(loginSchema), asyncHandler(login));
router.post('/refresh', validate(refreshSchema), asyncHandler(refresh));
router.get('/me', authenticate, asyncHandler(me));

export default router;
