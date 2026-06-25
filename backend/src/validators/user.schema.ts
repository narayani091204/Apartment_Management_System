import { z } from 'zod';
import { ROLES } from '../models/User.js';

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(ROLES),
  phone: z.string().min(7).max(20).optional(),
  apartmentNumber: z.string().max(20).optional(),
  block: z.string().max(20).optional(),
  department: z.string().max(100).optional(),
  shiftStart: z.string().max(10).optional(),
  shiftEnd: z.string().max(10).optional(),
  accountExpiresAt: z.coerce.date().optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(7).max(20).optional(),
    apartmentNumber: z.string().max(20).optional(),
    block: z.string().max(20).optional(),
    role: z.enum(ROLES).optional(),
    department: z.string().max(100).optional(),
    shiftStart: z.string().max(10).optional(),
    shiftEnd: z.string().max(10).optional(),
    accountExpiresAt: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export const listUsersQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
