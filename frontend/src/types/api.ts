/**
 * Shared API types mirroring the backend models and response envelopes.
 * Keep in sync with backend/src/models and controllers.
 */

export type Role = 'admin' | 'resident' | 'security';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  apartmentNumber?: string;
  block?: string;
  department?: string;
  shiftStart?: string;
  shiftEnd?: string;
  accountExpiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ---- Auth ---- */
export interface AuthResponse {
  success: true;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  success: true;
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  success: true;
  user: User;
}

/* ---- Maintenance ---- */
export type MaintenanceStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';
export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'carpentry'
  | 'appliance'
  | 'cleaning'
  | 'security'
  | 'other';

export interface MaintenanceComment {
  _id: string;
  author: string | User;
  message: string;
  createdAt: string;
}

export interface MaintenanceRequest {
  _id: string;
  resident: string | User;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignedTo?: string | User;
  comments: MaintenanceComment[];
  createdAt: string;
  updatedAt: string;
}

/* ---- Visitors ---- */
export type VisitorStatus = 'expected' | 'checked_in' | 'checked_out' | 'denied';

export interface Visitor {
  _id: string;
  name: string;
  phone?: string;
  purpose: string;
  resident: string | User;
  host?: string | User;
  apartmentNumber?: string;
  vehicleNumber?: string;
  status: VisitorStatus;
  expectedAt?: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---- Notices ---- */
export type NoticeAudience = 'all' | 'residents' | 'security' | 'admins';

export interface Notice {
  _id: string;
  title: string;
  content: string;
  category: 'general' | 'maintenance' | 'event' | 'emergency' | 'billing';
  audience: NoticeAudience;
  pinned: boolean;
  postedBy: string | User;
  createdAt: string;
  updatedAt: string;
}

/* ---- Notifications ---- */
export interface Notification {
  _id: string;
  user: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

/* ---- Generic envelopes ---- */
export interface ApiErrorBody {
  success: false;
  message: string;
  details?: unknown;
}

export interface Paginated<T> {
  success: true;
  data: T[];
  page: number;
  limit: number;
  total: number;
}
