import { Schema, model, type Document, type Types } from 'mongoose';

export const NOTICE_CATEGORIES = [
  'general',
  'maintenance',
  'event',
  'emergency',
  'billing',
] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

/* Who the notice targets. 'all' reaches every role. */
export const NOTICE_AUDIENCES = ['all', 'residents', 'security'] as const;
export type NoticeAudience = (typeof NOTICE_AUDIENCES)[number];

export interface INotice extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string;
  category: NoticeCategory;
  audience: NoticeAudience;
  pinned: boolean;
  postedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const noticeSchema = new Schema<INotice>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    category: { type: String, enum: NOTICE_CATEGORIES, default: 'general' },
    audience: { type: String, enum: NOTICE_AUDIENCES, default: 'all', index: true },
    pinned: { type: Boolean, default: false },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const Notice = model<INotice>('Notice', noticeSchema);
