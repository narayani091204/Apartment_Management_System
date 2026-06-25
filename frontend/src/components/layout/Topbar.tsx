import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from './NotificationBell';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, role, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center justify-end gap-3">
        <NotificationBell />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight">{user?.name}</p>
          {role && (
            <Badge variant="secondary" className="mt-0.5 capitalize">
              {role}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" aria-label="Log out" onClick={logout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
