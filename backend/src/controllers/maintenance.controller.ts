import type { Request, Response } from 'express';
import type { FilterQuery } from 'mongoose';
import {
  MaintenanceRequest,
  type IMaintenanceRequest,
} from '../models/MaintenanceRequest.js';
import { ApiError } from '../utils/ApiError.js';
import { notifyRoles, notifyUser } from '../services/notification.service.js';
import { User } from '../models/User.js';

/* Residents see own requests; workers (security) see assigned jobs; admin sees all. */
function scopeFilter(req: Request): FilterQuery<IMaintenanceRequest> {
  const role = req.user!.role;
  if (role === 'resident') return { resident: req.user!.id };
  if (role === 'security') return { assignedTo: req.user!.id };
  return {};
}

function assertCanAccessRequest(req: Request, request: IMaintenanceRequest): void {
  if (req.user!.role === 'resident') {
    const residentId = String(request.resident._id ?? request.resident);
    if (residentId !== req.user!.id) throw ApiError.forbidden();
    return;
  }
  if (req.user!.role === 'security') {
    if (!request.assignedTo || String(request.assignedTo) !== req.user!.id) {
      throw ApiError.forbidden('You can only access requests assigned to you');
    }
  }
}

export async function createRequest(req: Request, res: Response): Promise<void> {
  const isAdmin = req.user!.role === 'admin';
  const { residentId, ...fields } = req.body as {
    residentId?: string;
    title: string;
    description: string;
    category?: string;
    priority?: string;
  };

  let resident: string;
  if (isAdmin) {
    if (!residentId) throw ApiError.badRequest('residentId is required when logging for a resident');
    const residentUser = await User.findOne({
      _id: residentId,
      role: 'resident',
      isActive: true,
    });
    if (!residentUser) throw ApiError.badRequest('Invalid resident');
    resident = residentId;
  } else {
    resident = req.user!.id;
  }

  const request = await MaintenanceRequest.create({
    ...fields,
    resident,
    status: 'pending',
  });

  if (isAdmin) {
    await notifyUser({
      recipient: resident,
      type: 'maintenance',
      title: 'Maintenance request logged',
      message: `Your building admin filed a request for you: "${request.title}"`,
      link: `/maintenance/${request._id}`,
    });
  } else {
    await notifyRoles(['admin'], {
      type: 'maintenance',
      title: 'New maintenance request',
      message: `${request.title} (${request.priority})`,
      link: `/maintenance/${request._id}`,
    });
  }

  res.status(201).json({ success: true, request });
}

export async function listRequests(req: Request, res: Response): Promise<void> {
  const { status, category, priority, page, limit } = req.query as unknown as {
    status?: string;
    category?: string;
    priority?: string;
    page: number;
    limit: number;
  };

  const filter = scopeFilter(req);
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;

  const [items, total] = await Promise.all([
    MaintenanceRequest.find(filter)
      .populate('resident', 'name email apartmentNumber block')
      .populate('assignedTo', 'name role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    MaintenanceRequest.countDocuments(filter),
  ]);

  res.json({
    success: true,
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function getRequest(req: Request, res: Response): Promise<void> {
  const request = await MaintenanceRequest.findById(req.params.id)
    .populate('resident', 'name email apartmentNumber block')
    .populate('assignedTo', 'name role')
    .populate('comments.author', 'name role');
  if (!request) throw ApiError.notFound('Request not found');

  assertCanAccessRequest(req, request);
  res.json({ success: true, request });
}

/* Admin assigns workers; workers update status on their assigned jobs. */
export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { status, assignedTo } = req.body as { status: string; assignedTo?: string };
  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('Request not found');

  const isAdmin = req.user!.role === 'admin';
  const isAssignedWorker =
    req.user!.role === 'security' &&
    request.assignedTo &&
    String(request.assignedTo) === req.user!.id;

  if (req.user!.role === 'security' && !isAssignedWorker) {
    throw ApiError.forbidden('You can only update requests assigned to you');
  }

  if (assignedTo !== undefined && !isAdmin) {
    throw ApiError.forbidden('Only admins can assign workers');
  }

  const previousAssignee = request.assignedTo ? String(request.assignedTo) : null;

  request.status = status as IMaintenanceRequest['status'];
  if (assignedTo) request.assignedTo = assignedTo as unknown as IMaintenanceRequest['assignedTo'];
  if (status === 'resolved') request.resolvedAt = new Date();
  await request.save();

  // Real-time: tell the resident their request changed.
  await notifyUser({
    recipient: request.resident,
    type: 'maintenance',
    title: 'Maintenance update',
    message: `"${request.title}" is now ${status.replace('_', ' ')}.`,
    link: `/maintenance/${request._id}`,
  });

  if (assignedTo && assignedTo !== previousAssignee) {
    await notifyUser({
      recipient: assignedTo,
      type: 'maintenance',
      title: 'New job assigned',
      message: `You have been assigned: "${request.title}"`,
      link: `/maintenance/${request._id}`,
    });
  }

  res.json({ success: true, request });
}

export async function addComment(req: Request, res: Response): Promise<void> {
  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('Request not found');

  assertCanAccessRequest(req, request);

  const isOwner = String(request.resident) === req.user!.id;
  if (req.user!.role === 'resident' && !isOwner) throw ApiError.forbidden();

  request.comments.push({
    author: req.user!.id as unknown as IMaintenanceRequest['comments'][number]['author'],
    message: req.body.message,
    createdAt: new Date(),
  });
  await request.save();

  // Notify the other party (resident <-> staff).
  if (!isOwner) {
    await notifyUser({
      recipient: request.resident,
      type: 'maintenance',
      title: 'New comment on your request',
      message: req.body.message.slice(0, 120),
      link: `/maintenance/${request._id}`,
    });
  } else {
    await notifyRoles(['admin'], {
      type: 'maintenance',
      title: 'Resident commented',
      message: `${request.title}: ${req.body.message.slice(0, 100)}`,
      link: `/maintenance/${request._id}`,
    });
  }

  res.status(201).json({ success: true, request });
}
