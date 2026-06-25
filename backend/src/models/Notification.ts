import { Schema, model, type Document, type Types } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'maintenance',
  'visitor',
  'notice',
  'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  /* Optional link target on the client, e.g. /maintenance/:id */
  link?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const Notification = model<INotification>('Notification', notificationSchema);
