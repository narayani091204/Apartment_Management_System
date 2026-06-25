import {
  LayoutDashboard,
  Wrench,
  Users,
  UserCheck,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types/api';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Omit to show for all authenticated users. */
  roles?: Role[];
}

/**
 * Sidebar navigation. Items are filtered by the current user's role so each
 * role sees only the sections relevant to them (see backend RBAC table).
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Maintenance', to: '/maintenance', icon: Wrench },
  { label: 'Visitors', to: '/visitors', icon: UserCheck },
  { label: 'Notices', to: '/notices', icon: Megaphone },
  { label: 'Staff', to: '/users', icon: Users, roles: ['admin'] },
];

export function navItemsForRole(role: Role | null): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));
}
