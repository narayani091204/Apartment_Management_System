import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wrench, UserCheck, Megaphone, Users, Clock, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/PageHeader';
import { apiGet } from '../lib/api';
import { timeAgo, capitalize } from '../lib/utils';
import type { MaintenanceRequest, Visitor, Notice, Role } from '../types/api';

const ROLE_BLURB: Record<string, string> = {
  admin: 'Manage residents, oversee maintenance, and broadcast notices.',
  resident: 'File maintenance requests, pre-register visitors, and read notices.',
  security: 'Log visitors, update maintenance status, and stay on top of notices.',
};

interface PaginatedResponse<T> {
  items: T[];
  pagination: { total: number };
}

interface NotificationsSummary {
  unreadCount: number;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatItem {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bg: string;
  to: string;
}

interface ActivityItem {
  id: string;
  text: string;
  meta?: string;
  time: string;
  icon: React.ElementType;
  color: string;
}

interface StatsContext {
  openRequests: number;
  todayVisitors: number;
  activeNotices: number;
  unreadNotifications: number;
  maintenance: PaginatedResponse<MaintenanceRequest> | undefined;
  visitors: PaginatedResponse<Visitor> | undefined;
  notices: PaginatedResponse<Notice> | undefined;
}

// ─── Per-role stat builders ───────────────────────────────────────────────────

function buildAdminStats(ctx: StatsContext): StatItem[] {
  return [
    { label: 'Open Requests', value: ctx.openRequests, icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-500/10', to: '/maintenance' },
    { label: 'Visitors Today', value: ctx.todayVisitors, icon: UserCheck, color: 'text-sky-500', bg: 'bg-sky-500/10', to: '/visitors' },
    { label: 'Active Notices', value: ctx.activeNotices, icon: Megaphone, color: 'text-pink-500', bg: 'bg-pink-500/10', to: '/notices' },
    { label: 'Residents', value: '—', icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10', to: '/users' },
  ];
}

function buildResidentStats(ctx: StatsContext): StatItem[] {
  return [
    {
      label: 'My Requests',
      value: ctx.maintenance?.items?.length ?? 0,
      icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-500/10', to: '/maintenance',
    },
    {
      label: 'Expected Visitors',
      value: ctx.visitors?.items?.filter((v) => v.status === 'expected').length ?? 0,
      icon: UserCheck, color: 'text-sky-500', bg: 'bg-sky-500/10', to: '/visitors',
    },
    {
      label: 'Unread Alerts',
      value: ctx.unreadNotifications,
      icon: Megaphone, color: 'text-pink-500', bg: 'bg-pink-500/10', to: '/notices',
    },
    {
      label: 'In Progress',
      value: ctx.maintenance?.items?.filter((r) => r.status === 'in_progress').length ?? 0,
      icon: Clock, color: 'text-violet-500', bg: 'bg-violet-500/10', to: '/maintenance',
    },
  ];
}

function buildSecurityStats(ctx: StatsContext): StatItem[] {
  return [
    {
      label: 'Logged Today',
      value: ctx.todayVisitors,
      icon: UserCheck, color: 'text-sky-500', bg: 'bg-sky-500/10', to: '/visitors',
    },
    {
      label: 'Pending Gate',
      value: ctx.visitors?.items?.filter((v) => v.status === 'expected').length ?? 0,
      icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', to: '/visitors',
    },
    {
      label: 'Open Tickets',
      value: ctx.openRequests,
      icon: Wrench, color: 'text-violet-500', bg: 'bg-violet-500/10', to: '/maintenance',
    },
    {
      label: 'Notices',
      value: ctx.activeNotices,
      icon: Megaphone, color: 'text-pink-500', bg: 'bg-pink-500/10', to: '/notices',
    },
  ];
}

const STAT_BUILDERS: Record<Role, (ctx: StatsContext) => StatItem[]> = {
  admin: buildAdminStats,
  resident: buildResidentStats,
  security: buildSecurityStats,
};

export default function DashboardPage() {
  const { user, role } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const { data: maintenance } = useQuery({
    queryKey: ['maintenance', 'recent'],
    queryFn: () => apiGet<PaginatedResponse<MaintenanceRequest>>('/maintenance?limit=5'),
  });

  const { data: visitors } = useQuery({
    queryKey: ['visitors', 'recent'],
    queryFn: () => apiGet<PaginatedResponse<Visitor>>('/visitors?limit=5'),
  });

  const { data: notices } = useQuery({
    queryKey: ['notices', 'recent'],
    queryFn: () => apiGet<PaginatedResponse<Notice>>('/notices?limit=5'),
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'summary'],
    queryFn: () => apiGet<NotificationsSummary>('/notifications?limit=1'),
    enabled: role === 'resident',
  });

  const openRequests = maintenance?.items?.filter((r) => r.status === 'pending').length ?? 0;
  const todayVisitors = visitors?.pagination?.total ?? 0;
  const activeNotices = notices?.pagination?.total ?? 0;
  const unreadNotifications = notifications?.unreadCount ?? 0;

  const stats = useMemo<StatItem[]>(() => {
    if (!role) return [];
    return STAT_BUILDERS[role]({
      openRequests,
      todayVisitors,
      activeNotices,
      unreadNotifications,
      maintenance,
      visitors,
      notices,
    });
  }, [role, openRequests, todayVisitors, activeNotices, unreadNotifications, maintenance, visitors, notices]);

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...(maintenance?.items ?? []).map((r) => ({
        id: r._id,
        text: `Maintenance #${r._id.slice(-4).toUpperCase()} — ${r.title}`,
        meta: capitalize(r.status.replace('_', ' ')),
        time: r.updatedAt,
        icon: Wrench,
        color: r.priority === 'urgent' ? 'text-red-500' : 'text-amber-500',
      })),
      ...(notices?.items ?? []).map((n) => ({
        id: n._id,
        text: n.title,
        meta: capitalize(n.category),
        time: n.createdAt,
        icon: Megaphone,
        color: 'text-pink-500',
      })),
    ];

    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 6);
  }, [maintenance?.items, notices?.items]);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={role ? ROLE_BLURB[role] : undefined}
        icon={LayoutDashboard}
        iconBg="bg-indigo-50"
        iconColor="text-indigo-700"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              to={s.to}
              className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </span>
                <div className={`rounded-lg p-1.5 ${s.bg}`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="mt-6 rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Recent Activity</h2>
        </div>
        {recentActivity.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No recent activity yet.
          </p>
        ) : (
          <ul className="divide-y">
            {recentActivity.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-5 py-3 text-sm"
                >
                  <div className="rounded-md bg-muted p-1.5">
                    <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {item.text}
                  </span>
                  {item.meta && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {item.meta}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(item.time)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'New maintenance request', to: '/maintenance', icon: Wrench, show: role !== 'admin' },
          { label: 'Pre-register a visitor', to: '/visitors', icon: UserCheck, show: role === 'resident' },
          { label: 'Read latest notices', to: '/notices', icon: Megaphone, show: true },
        ]
          .filter((q) => q.show)
          .map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.label}
                to={q.to}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                {q.label}
              </Link>
            );
          })}
      </div>
    </div>
  );
}
