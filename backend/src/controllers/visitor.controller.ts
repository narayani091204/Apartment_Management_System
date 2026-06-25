import type { Request, Response } from 'express';
import type { FilterQuery } from 'mongoose';
import { Visitor, type IVisitor } from '../models/Visitor.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { notifyUser } from '../services/notification.service.js';

/* Residents pre-register an expected visitor for themselves; security can log
 * a walk-in against any resident by passing `resident`. */
export async function createVisitor(req: Request, res: Response): Promise<void> {
  const role = req.user!.role;
  let residentId = req.user!.id;
  let status: IVisitor['status'] = 'expected';

  if (role === 'security') {
    if (!req.body.resident) {
      throw ApiError.badRequest('resident is required when security logs a visitor');
    }
    residentId = req.body.resident;
    // A security-logged entry means the visitor is physically arriving.
    status = 'checked_in';
  }

  const resident = await User.findOne({ _id: residentId, role: 'resident' });
  if (!resident) throw ApiError.notFound('Resident not found');

  const visitor = await Visitor.create({
    name: req.body.name,
    phone: req.body.phone,
    purpose: req.body.purpose,
    vehicleNumber: req.body.vehicleNumber,
    apartmentNumber: req.body.apartmentNumber ?? resident.apartmentNumber,
    resident: residentId,
    status,
    ...(status === 'checked_in'
      ? { checkInTime: new Date(), loggedBy: req.user!.id }
      : {}),
  });

  if (status === 'checked_in') {
    await notifyUser({
      recipient: residentId,
      type: 'visitor',
      title: 'Visitor arrived',
      message: `${visitor.name} has checked in at the gate.`,
      link: `/visitors/${visitor._id}`,
    });
  }

  res.status(201).json({ success: true, visitor });
}

export async function listVisitors(req: Request, res: Response): Promise<void> {
  const { status, resident, page, limit } = req.query as unknown as {
    status?: string;
    resident?: string;
    page: number;
    limit: number;
  };

  const filter: FilterQuery<IVisitor> = {};
  // Residents only ever see their own visitors.
  if (req.user!.role === 'resident') filter.resident = req.user!.id;
  else if (resident) filter.resident = resident;
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Visitor.find(filter)
      .populate('resident', 'name apartmentNumber block')
      .populate('loggedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Visitor.countDocuments(filter),
  ]);

  res.json({
    success: true,
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function getVisitor(req: Request, res: Response): Promise<void> {
  const visitor = await Visitor.findById(req.params.id)
    .populate('resident', 'name apartmentNumber block')
    .populate('loggedBy', 'name');
  if (!visitor) throw ApiError.notFound('Visitor not found');
  if (req.user!.role === 'resident' && String(visitor.resident._id ?? visitor.resident) !== req.user!.id) {
    throw ApiError.forbidden();
  }
  res.json({ success: true, visitor });
}

/* Security/admin transition a visitor through the gate lifecycle. */
export async function updateVisitorStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body as { status: IVisitor['status'] };
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) throw ApiError.notFound('Visitor not found');

  visitor.status = status;
  if (status === 'checked_in') {
    visitor.checkInTime = new Date();
    visitor.loggedBy = req.user!.id as unknown as IVisitor['loggedBy'];
  } else if (status === 'checked_out') {
    visitor.checkOutTime = new Date();
  }
  await visitor.save();

  if (status === 'checked_in' || status === 'denied') {
    await notifyUser({
      recipient: visitor.resident,
      type: 'visitor',
      title: status === 'checked_in' ? 'Visitor arrived' : 'Visitor denied entry',
      message:
        status === 'checked_in'
          ? `${visitor.name} has checked in at the gate.`
          : `Entry for ${visitor.name} was denied.`,
      link: `/visitors/${visitor._id}`,
    });
  }

  res.json({ success: true, visitor });
}
