import { Schema, model, type Document, type Types } from 'mongoose';

export const VISITOR_STATUSES = [
  'expected',
  'checked_in',
  'checked_out',
  'denied',
] as const;
export type VisitorStatus = (typeof VISITOR_STATUSES)[number];

export interface IVisitor extends Document {
  _id: Types.ObjectId;
  name: string;
  phone?: string;
  purpose: string;
  /* The resident being visited */
  resident: Types.ObjectId;
  apartmentNumber?: string;
  vehicleNumber?: string;
  status: VisitorStatus;
  checkInTime?: Date;
  checkOutTime?: Date;
  /* Security guard who logged the entry */
  loggedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const visitorSchema = new Schema<IVisitor>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    purpose: { type: String, required: true, trim: true },
    resident: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    apartmentNumber: { type: String, trim: true },
    vehicleNumber: { type: String, trim: true },
    status: { type: String, enum: VISITOR_STATUSES, default: 'expected', index: true },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    loggedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Visitor = model<IVisitor>('Visitor', visitorSchema);
