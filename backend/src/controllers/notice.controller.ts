import type { Request, Response } from 'express';
import type { FilterQuery } from 'mongoose';
import { Notice, type INotice } from '../models/Notice.js';
import { ApiError } from '../utils/ApiError.js';
import { notifyRoles } from '../services/notification.service.js';
import type { Role } from '../models/User.js';

/* Maps a notice audience to the roles that should receive it. */
function audienceRoles(audience: INotice['audience']): Role[] {
  if (audience === 'residents') return ['resident'];
  if (audience === 'security') return ['security'];
  return ['resident', 'security']; // 'all'
}

export async function createNotice(req: Request, res: Response): Promise<void> {
  const notice = await Notice.create({ ...req.body, postedBy: req.user!.id });

  // Real-time fan-out to the targeted audience.
  await notifyRoles(audienceRoles(notice.audience), {
    type: 'notice',
    title: `Notice: ${notice.title}`,
    message: notice.content.slice(0, 160),
    link: `/notices/${notice._id}`,
  });

  res.status(201).json({ success: true, notice });
}

export async function listNotices(req: Request, res: Response): Promise<void> {
  const { category, page, limit } = req.query as unknown as {
    category?: string;
    page: number;
    limit: number;
  };

  const filter: FilterQuery<INotice> = {};
  // Residents/security only see notices addressed to them or to everyone.
  if (req.user!.role === 'resident') filter.audience = { $in: ['all', 'residents'] };
  else if (req.user!.role === 'security') filter.audience = { $in: ['all', 'security'] };
  if (category) filter.category = category;

  const [items, total] = await Promise.all([
    Notice.find(filter)
      .populate('postedBy', 'name role')
      .sort({ pinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notice.countDocuments(filter),
  ]);

  res.json({
    success: true,
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function getNotice(req: Request, res: Response): Promise<void> {
  const notice = await Notice.findById(req.params.id).populate('postedBy', 'name role');
  if (!notice) throw ApiError.notFound('Notice not found');
  res.json({ success: true, notice });
}

export async function updateNotice(req: Request, res: Response): Promise<void> {
  const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!notice) throw ApiError.notFound('Notice not found');
  res.json({ success: true, notice });
}

export async function deleteNotice(req: Request, res: Response): Promise<void> {
  const notice = await Notice.findByIdAndDelete(req.params.id);
  if (!notice) throw ApiError.notFound('Notice not found');
  res.json({ success: true, message: 'Notice deleted' });
}
