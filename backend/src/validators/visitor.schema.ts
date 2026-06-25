import { z } from 'zod';
import { VISITOR_STATUSES } from '../models/Visitor.js';

/* Resident pre-registers an expected visitor (resident defaults to self). */
export const createVisitorSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20).optional(),
  purpose: z.string().min(2).max(200),
  vehicleNumber: z.string().max(20).optional(),
  apartmentNumber: z.string().max(20).optional(),
  // Security supplies this when logging a walk-in for a specific resident.
  resident: z.string().length(24).optional(),
});

export const updateVisitorStatusSchema = z.object({
  status: z.enum(VISITOR_STATUSES),
});

export const listVisitorQuerySchema = z.object({
  status: z.enum(VISITOR_STATUSES).optional(),
  resident: z.string().length(24).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
