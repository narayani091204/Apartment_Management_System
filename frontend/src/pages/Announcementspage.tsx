import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  X,
  Loader2,
  ShieldAlert,
  Trash2,
  AlertTriangle,
  Flame,
  Info,
  Users,
  ChevronDown,
  Filter,
  Send,
  Eye,
  Pencil,
  Pin,
  Globe,
  Bell,
  PartyPopper,
  Receipt,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { Modal } from 'antd';
import { useAuth } from '@/auth/useAuth';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';
import type { User as AppUser } from '@/types/api';

// ─── Types (aligned with backend Notice model) ────────────────────────────────

type NoticeCategory = 'general' | 'maintenance' | 'event' | 'emergency' | 'billing';
type NoticeAudience = 'all' | 'residents' | 'security';

interface Notice {
  _id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  audience: NoticeAudience;
  pinned: boolean;
  postedBy: string | AppUser;
  createdAt: string;
  updatedAt: string;
}

const noticeFormSchema = z.object({
  title: z.string().min(3, 'Topic must be at least 3 characters'),
  content: z.string().min(10, 'Announcement must be at least 10 characters'),
  category: z.enum(['general', 'maintenance', 'event', 'emergency', 'billing']),
  audience: z.enum(['all', 'residents', 'security']),
  pinned: z.boolean().default(false),
});

type NoticeForm = z.infer<typeof noticeFormSchema>;

// ─── Design tokens ────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  NoticeCategory,
  { pill: string; label: string; icon: React.ReactNode; accent: string }
> = {
  emergency: {
    pill: 'bg-rose-50 text-rose-700 border-rose-200',
    label: 'Emergency',
    icon: <Flame className="w-3.5 h-3.5" />,
    accent: 'text-rose-600',
  },
  maintenance: {
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Maintenance',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    accent: 'text-amber-600',
  },
  general: {
    pill: 'bg-sky-50 text-sky-700 border-sky-200',
    label: 'General',
    icon: <Info className="w-3.5 h-3.5" />,
    accent: 'text-sky-600',
  },
  event: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Community Event',
    icon: <PartyPopper className="w-3.5 h-3.5" />,
    accent: 'text-emerald-600',
  },
  billing: {
    pill: 'bg-violet-50 text-violet-700 border-violet-200',
    label: 'Billing & Dues',
    icon: <Receipt className="w-3.5 h-3.5" />,
    accent: 'text-violet-600',
  },
};

const AUDIENCE_LABELS: Record<NoticeAudience, string> = {
  all: 'All Residents & Staff',
  residents: 'Residents Only',
  security: 'Security Staff',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getAuthorName(author: string | AppUser): string {
  if (typeof author === 'object' && author !== null) return author.name;
  return 'Building Admin';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function truncate(text: string, max = 140): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ name, size = 'md' }: Readonly<{ name: string; size?: 'sm' | 'md' }>) {
  const dims = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600 ${dims}`}
      title={name}
    >
      {getInitials(name)}
    </span>
  );
}

// ─── Side Drawer ──────────────────────────────────────────────────────────────

function NoticeDrawer({
  mode,
  notice,
  onClose,
}: Readonly<{
  mode: 'create' | 'edit' | 'view';
  notice?: Notice;
  onClose: () => void;
}>) {
  const queryClient = useQueryClient();
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const { register, handleSubmit, formState: { errors } } = useForm<NoticeForm>({
    resolver: zodResolver(noticeFormSchema),
    defaultValues: notice
      ? {
          title: notice.title,
          content: notice.content,
          category: notice.category,
          audience: notice.audience,
          pinned: notice.pinned,
        }
      : { category: 'general', audience: 'all', pinned: false },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: NoticeForm) =>
      isEdit && notice
        ? api.patch(`/notices/${notice._id}`, payload).then((r) => r.data)
        : api.post('/notices', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      onClose();
    },
  });

  const titleByMode = {
    create: 'Add Announcement',
    edit: 'Edit Announcement',
    view: 'View Announcement',
  } as const;
  const title = titleByMode[mode];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] border-0 p-0 cursor-default"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>

        {isView && notice ? (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Topic</p>
              <h3 className="text-xl font-bold text-slate-900">{notice.title}</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${CATEGORY_CONFIG[notice.category].pill}`}>
                {CATEGORY_CONFIG[notice.category].icon}
                {CATEGORY_CONFIG[notice.category].label}
              </span>
              {notice.pinned && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  <Pin className="h-3 w-3" />
                  Pinned
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Published
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Send To</p>
                <div className="flex items-center gap-2">
                  <UserAvatar name={AUDIENCE_LABELS[notice.audience]} size="sm" />
                  <span className="font-medium text-slate-700">{AUDIENCE_LABELS[notice.audience]}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Posted By</p>
                <div className="flex items-center gap-2">
                  <UserAvatar name={getAuthorName(notice.postedBy)} size="sm" />
                  <span className="font-medium text-slate-700">{getAuthorName(notice.postedBy)}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Published On</p>
              <p className="text-sm text-slate-600">{formatDateTime(notice.createdAt)}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Announcement</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {notice.content}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Bell className="h-4 w-4 text-sky-600" />
                Delivery
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Residents receive this notice on the building portal and in-app notification bell.
              </p>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-medium text-sky-800">
                  <Globe className="h-4 w-4" />
                  Building Portal
                </div>
                <span className="text-xs font-semibold text-sky-600">Sent</span>
              </div>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div>
                <label htmlFor="notice-title" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Topic <span className="text-rose-500">*</span>
                </label>
                <input
                  id="notice-title"
                  {...register('title')}
                  placeholder="e.g. Water supply shutdown — Block A"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="notice-category" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="notice-category"
                      {...register('category')}
                      className="w-full appearance-none rounded-lg border border-slate-300 px-3 py-2.5 pr-8 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      {(Object.keys(CATEGORY_CONFIG) as NoticeCategory[]).map((key) => (
                        <option key={key} value={key}>
                          {CATEGORY_CONFIG[key].label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label htmlFor="notice-audience" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Priority Tag
                  </label>
                  <div className="relative">
                    <select
                      id="notice-pinned"
                      {...register('pinned', {
                        setValueAs: (v) => v === 'true' || v === true,
                      })}
                      className="w-full appearance-none rounded-lg border border-slate-300 px-3 py-2.5 pr-8 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="false">Standard Notice</option>
                      <option value="true">Pin to Top</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="notice-content" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Announcement <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="notice-content"
                  rows={6}
                  {...register('content')}
                  placeholder="Share maintenance schedules, policy updates, emergency alerts, or community events…"
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm leading-relaxed text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                {errors.content && <p className="mt-1 text-xs text-rose-600">{errors.content.message}</p>}
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-sky-50 p-2">
                    <Calendar className="h-4 w-4 text-sky-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">Publish Timing</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Notices are delivered immediately when saved.
                    </p>
                    <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name="schedule" defaultChecked readOnly className="text-sky-600" />
                      <span>Publish Now</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="notice-audience-select" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Send To <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="notice-audience-select"
                    {...register('audience')}
                    className="w-full appearance-none rounded-lg border border-slate-300 px-3 py-2.5 pr-8 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  >
                    {(Object.keys(AUDIENCE_LABELS) as NoticeAudience[]).map((key) => (
                      <option key={key} value={key}>
                        {AUDIENCE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-sky-50 p-2">
                    <Bell className="h-4 w-4 text-sky-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">Notification Method</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      How residents and staff will be notified about this announcement.
                    </p>
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-sky-100 bg-sky-50 px-3 py-2.5">
                      <div className="flex items-center gap-2 text-sm font-medium text-sky-900">
                        <Globe className="h-4 w-4" />
                        Building Portal & In-App
                      </div>
                      <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        On
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {saveMutation.isError && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Failed to save announcement. Please try again.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:opacity-60"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        )}

        {isView && (
          <div className="flex justify-end border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            >
              Close
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accentClass,
}: Readonly<{ label: string; value: number; accentClass: string }>) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`absolute left-0 top-0 h-full w-1 ${accentClass}`} />
      <p className="pl-3 text-sm font-medium text-slate-500">{label}</p>
      <p className="pl-3 mt-1 text-4xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function ReachCard({ notices }: Readonly<{ notices: Notice[] }>) {
  const counts = {
    all: notices.filter((n) => n.audience === 'all').length,
    residents: notices.filter((n) => n.audience === 'residents').length,
    security: notices.filter((n) => n.audience === 'security').length,
  };

  const items = [
    { label: 'Everyone', value: counts.all, icon: Users, color: 'text-sky-600' },
    { label: 'Residents', value: counts.residents, icon: Users, color: 'text-emerald-600' },
    { label: 'Security', value: counts.security, icon: ShieldAlert, color: 'text-amber-600' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">Audience Reach</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {items.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="text-center">
            <Icon className={`mx-auto h-5 w-5 ${color}`} />
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</p>
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function NoticeRow({
  item,
  isAdmin,
  onView,
  onEdit,
  onDelete,
}: Readonly<{
  item: Notice;
  isAdmin: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
}>) {
  const cfg = CATEGORY_CONFIG[item.category];
  const author = getAuthorName(item.postedBy);

  return (
    <article className="group grid grid-cols-1 gap-4 border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50/80 lg:grid-cols-[minmax(0,1fr)_180px_180px_96px] lg:items-start">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Send className="h-3.5 w-3.5" />
            {formatDateTime(item.createdAt)}
          </span>
          <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-semibold ${cfg.pill}`}>
            {cfg.icon}
            {cfg.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Published
          </span>
          {item.pinned && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
              <Pin className="h-3 w-3" />
              Pinned
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Description
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
          {truncate(item.content)}
        </p>
      </div>

      <div className="lg:pt-1">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
          Send To
        </p>
        <div className="flex items-center gap-2">
          <UserAvatar name={AUDIENCE_LABELS[item.audience]} size="sm" />
          <span className="text-sm font-medium text-slate-700">{AUDIENCE_LABELS[item.audience]}</span>
        </div>
      </div>

      <div className="lg:pt-1">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
          Posted By
        </p>
        <div className="flex items-center gap-2">
          <UserAvatar name={author} size="sm" />
          <span className="truncate text-sm font-medium text-slate-700">{author}</span>
        </div>
      </div>

      <div className="flex items-center justify-start gap-1 lg:justify-end lg:pt-1">
        <button
          type="button"
          onClick={onView}
          title="View announcement"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-700"
        >
          <Eye className="h-4 w-4" />
        </button>
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={onEdit}
              title="Edit announcement"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                Modal.confirm({
                  title: 'Delete Announcement',
                  content: 'Are you sure you want to remove this announcement?',
                  okText: 'Yes, Delete',
                  okType: 'danger',
                  cancelText: 'Cancel',
                  onOk() {
                    onDelete(item._id);
                  },
                })
              }
              title="Delete announcement"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type DrawerState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit' | 'view'; notice: Notice };

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const [categoryFilter, setCategoryFilter] = useState<NoticeCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin';

  const { data = [], isLoading, isError, refetch } = useQuery<Notice[]>({
    queryKey: ['notices'],
    queryFn: () => api.get('/notices', { params: { limit: 100 } }).then((r) => r.data.items ?? []),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notices/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...data]
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .filter((n) => {
        if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
        if (!q) return true;
        return [n.title, n.content, getAuthorName(n.postedBy), CATEGORY_CONFIG[n.category].label]
          .join(' ')
          .toLowerCase()
          .includes(q);
      });
  }, [data, search, categoryFilter]);

  const pinnedCount = data.filter((n) => n.pinned).length;
  const publishedCount = data.length;

  const categoryTabs = ['all', 'emergency', 'maintenance', 'general', 'event', 'billing'] as const;

  const closeDrawer = () => setDrawer({ open: false });

  const listContent = (() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-sky-600" />
          <span className="text-sm font-medium">Loading announcements…</span>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="mb-3 h-10 w-10 text-rose-500" />
          <h3 className="text-sm font-bold text-slate-900">Failed to Load Announcements</h3>
          <p className="mt-1 text-xs text-slate-500">Unable to fetch building notices.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
          >
            Retry
          </button>
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-slate-100 bg-slate-50">
            <Megaphone className="h-7 w-7 text-slate-400" />
          </div>
          <h4 className="text-base font-bold text-slate-900">No announcements found</h4>
          <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setDrawer({ open: true, mode: 'create' })}
              className="mt-4 rounded-lg bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
            >
              Add New Announcement
            </button>
          )}
        </div>
      );
    }

    return filtered.map((item) => (
      <NoticeRow
        key={item._id}
        item={item}
        isAdmin={isAdmin}
        onView={() => setDrawer({ open: true, mode: 'view', notice: item })}
        onEdit={() => setDrawer({ open: true, mode: 'edit', notice: item })}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    ));
  })();

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Announcements"
        description="Broadcast maintenance alerts, policy updates, emergencies, and community events to residents and staff."
        icon={Megaphone}
        iconBg="bg-sky-50"
        iconColor="text-sky-700"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Announcements' },
        ]}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notices, categories…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-10 text-sm text-slate-800 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              showFilters
                ? 'border-sky-300 bg-sky-50 text-sky-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setDrawer({ open: true, mode: 'create' })}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-800 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-900"
            >
              <Plus className="h-4 w-4" />
              Add New
            </button>
          )}
          </div>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Pinned" value={pinnedCount} accentClass="bg-amber-500" />
        <SummaryCard label="Published" value={publishedCount} accentClass="bg-sky-600" />
        <ReachCard notices={data} />
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Category</p>
          <div className="flex flex-wrap gap-2">
            {categoryTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCategoryFilter(tab)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  categoryFilter === tab
                    ? 'bg-sky-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'all' ? 'All' : CATEGORY_CONFIG[tab].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:grid lg:grid-cols-[minmax(0,1fr)_180px_180px_96px]">
          <span>Announcement</span>
          <span>Send To</span>
          <span>Posted By</span>
          <span className="text-right">Actions</span>
        </div>
        {listContent}
      </div>

      {drawer.open && drawer.mode === 'create' && (
        <NoticeDrawer mode="create" onClose={closeDrawer} />
      )}
      {drawer.open && drawer.mode !== 'create' && (
        <NoticeDrawer mode={drawer.mode} notice={drawer.notice} onClose={closeDrawer} />
      )}
    </div>
  );
}
