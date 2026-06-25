import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import type { Role } from '@/types/api';
import { FullScreenLoader } from '@/components/FullScreenLoader';

interface ProtectedRouteProps {
  /** If provided, only these roles may access the nested routes. */
  roles?: Role[];
}

/**
 * Guards nested routes. Redirects unauthenticated users to /login (preserving
 * the attempted location), and users without an allowed role to /forbidden.
 */
export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && role && !roles.includes(role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
