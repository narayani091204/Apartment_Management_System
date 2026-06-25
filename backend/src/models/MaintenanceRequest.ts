import { Schema, model, type Document, type Types } from 'mongoose';

export const MAINTENANCE_CATEGORIES = [
  'plumbing',
  'electrical',
  'carpentry',
  'appliance',
  'cleaning',
  'security',
  'other',
] as const;
export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];

export const MAINTENANCE_STATUSES = [
  'pending',
  'in_progress',
  'resolved',
  'rejected',
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

interface IComment {
  author: Types.ObjectId;
  message: string;
  createdAt: Date;
}

export interface IMaintenanceRequest extends Document {
  _id: Types.ObjectId;
  resident: Types.ObjectId;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: Priority;
  status: MaintenanceStatus;
  assignedTo?: Types.ObjectId;
  comments: IComment[];
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const maintenanceSchema = new Schema<IMaintenanceRequest>(
  {
    resident: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: MAINTENANCE_CATEGORIES, default: 'other' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    status: { type: String, enum: MAINTENANCE_STATUSES, default: 'pending', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    comments: { type: [commentSchema], default: [] },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

export const MaintenanceRequest = model<IMaintenanceRequest>(
  'MaintenanceRequest',
  maintenanceSchema,
);
