import { Schema, model, type Document, type Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['admin', 'resident', 'security'] as const;
export type Role = (typeof ROLES)[number];

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  /* Resident-specific fields */
  apartmentNumber?: string;
  block?: string;
  /* Staff profile */
  department?: string;
  shiftStart?: string;
  shiftEnd?: string;
  accountExpiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false, minlength: 8 },
    role: { type: String, enum: ROLES, required: true, default: 'resident' },
    phone: { type: String, trim: true },
    apartmentNumber: { type: String, trim: true },
    block: { type: String, trim: true },
    department: { type: String, trim: true },
    shiftStart: { type: String, trim: true },
    shiftEnd: { type: String, trim: true },
    accountExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete (ret as { password?: string }).password;
    delete (ret as { __v?: number }).__v;
    return ret;
  },
});

export const User = model<IUser>('User', userSchema);
