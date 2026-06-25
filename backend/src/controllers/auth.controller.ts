import type { Request, Response } from 'express';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import type { RegisterInput, LoginInput } from '../validators/auth.schema.js';

function issueTokens(userId: string, role: 'admin' | 'resident' | 'security') {
  return {
    accessToken: signAccessToken({ sub: userId, role }),
    refreshToken: signRefreshToken({ sub: userId, role }),
  };
}

/* Public self-registration. Always creates a 'resident'; staff accounts are
 * created by an admin via the users endpoint. */
export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterInput;
  const exists = await User.findOne({ email: body.email });
  if (exists) throw ApiError.conflict('Email is already registered');

  const user = await User.create({ ...body, role: 'resident' });
  const tokens = issueTokens(String(user._id), user.role);
  res.status(201).json({ success: true, user: user.toJSON(), ...tokens });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginInput;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('Account is deactivated');

  const tokens = issueTokens(String(user._id), user.role);
  res.json({ success: true, user: user.toJSON(), ...tokens });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('User no longer active');

  res.json({ success: true, ...issueTokens(String(user._id), user.role) });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, user: user.toJSON() });
}
