import type { Request, Response } from 'express';
import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const { unread, page = 1, limit = 20 } = req.query as unknown as {
    unread?: string;
    page?: number;
    limit?: number;
  };
  const filter: Record<string, unknown> = { recipient: req.user!.id };
  if (String(unread) === 'true') filter.read = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user!.id, read: false }),
  ]);

  res.json({
    success: true,
    items,
    unreadCount,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user!.id },
    { read: true },
    { new: true },
  );
  if (!notification) throw ApiError.notFound('Notification not found');
  res.json({ success: true, notification });
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  const result = await Notification.updateMany(
    { recipient: req.user!.id, read: false },
    { read: true },
  );
  res.json({ success: true, modified: result.modifiedCount });
}
