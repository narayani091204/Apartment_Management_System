import { z } from 'zod';
import { NOTICE_AUDIENCES, NOTICE_CATEGORIES } from '../models/Notice.js';

export const createNoticeSchema = z.object({
  title: z.string().min(3).max(150),
  content: z.string().min(1).max(5000),
  category: z.enum(NOTICE_CATEGORIES).optional(),
  audience: z.enum(NOTICE_AUDIENCES).optional(),
  pinned: z.boolean().optional(),
});

export const updateNoticeSchema = createNoticeSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'No fields to update' },
);

export const listNoticeQuerySchema = z.object({
  category: z.enum(NOTICE_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
