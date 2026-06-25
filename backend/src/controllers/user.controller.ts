import type { Request, Response } from 'express';
import type { FilterQuery } from 'mongoose';
import { User, type IUser } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { notifyUser } from '../services/notification.service.js';

/* Admin: create any user (resident, security, or another admin). */
export async function createUser(req: Request, res: Response): Promise<void> {
  const exists = await User.findOne({ email: req.body.email });
  if (exists) throw ApiError.conflict('Email is already registered');
  const user = await User.create(req.body);
  res.status(201).json({ success: true, user: user.toJSON() });
}

/* Admin: paginated, filterable directory of users. */
export async function listUsers(req: Request, res: Response): Promise<void> {
  const { role, search, page, limit } = req.query as unknown as {
    role?: string;
    search?: string;
    page: number;
    limit: number;
  };

  const filter: FilterQuery<IUser> = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { apartmentNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, user: user.toJSON() });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!user) throw ApiError.notFound('User not found');

  if (typeof req.body.isActive === 'boolean') {
    await notifyUser({
      recipient: user._id,
      type: 'system',
      title: 'Account status updated',
      message: `Your account has been ${user.isActive ? 'activated' : 'deactivated'}.`,
    });
  }
  res.json({ success: true, user: user.toJSON() });
}

/* Soft-delete by deactivating; preserves history (maintenance, visitors). */
export async function deactivateUser(req: Request, res: Response): Promise<void> {
  if (req.params.id === req.user!.id) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true },
  );
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, user: user.toJSON() });
}
