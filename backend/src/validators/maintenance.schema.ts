import { z } from 'zod';
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_STATUSES,
  PRIORITIES,
} from '../models/MaintenanceRequest.js';

export const createMaintenanceSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(5).max(2000),
  category: z.enum(MAINTENANCE_CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  /** Admin only: file a request on behalf of this resident. */
  residentId: z.string().length(24).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(MAINTENANCE_STATUSES),
  assignedTo: z.string().length(24).optional(),
});

export const addCommentSchema = z.object({
  message: z.string().min(1).max(1000),
});

export const listMaintenanceQuerySchema = z.object({
  status: z.enum(MAINTENANCE_STATUSES).optional(),
  category: z.enum(MAINTENANCE_CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
