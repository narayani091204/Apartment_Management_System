import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UserCheck,
  Plus,
  Clock,
  CheckCircle2,
  LogOut,
  Search,
  Phone,
  User,
  Building2,
  Calendar,
  X,
  Loader2,
  ShieldAlert,
  Ban,
  Car,
  DoorOpen,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';
import type { User as AppUser, Visitor, VisitorStatus } from '@/types/api';

const createVisitorBaseSchema = z.object({
  name: z.string().min(2, 'Visitor name is required'),
  phone: z.string().optional(),
  purpose: z.string().min(2, 'Purpose is required'),
  vehicleNumber: z.string().optional(),
  apartmentNumber: z.string().optional(),
});

const residentVisitorSchema = createVisitorBaseSchema;
const securityVisitorSchema = createVisitorBaseSchema.extend({
  resident: z.string().min(1, 'Select resident'),
});

type ResidentVisitorForm = z.infer<typeof residentVisitorSchema>;
type SecurityVisitorForm = z.infer<typeof securityVisitorSchema>;

const STATUS_CONFIG: Record<
  VisitorStatus,
  { badge: string; icon: React.ReactNode; label: string }
> = {
  expected: {
    badge: 'bg-amber-100/90 text-amber-800',
    icon: <Clock className="h-3 w-3" />,
    label: 'Expected',
  },
  checked_in: {
    badge: 'bg-emerald-100/90 text-emerald-800',
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: 'Checked In',
  },
  checked_out: {
    badge: 'bg-sky-100/90 text-sky-800',
    icon: <LogOut className="h-3 w-3" />,
    label: 'Checked Out',
  },
  denied: {
    badge: 'bg-rose-100/90 text-rose-800',
    icon: <Ban className="h-3 w-3" />,
    label: 'Denied',
  },
};

function isPopulatedUser(value: string | AppUser): value is AppUser {
  return typeof value === 'object' && value !== null;
}

function visitorResidentName(visitor: Visitor): string {
  if (visitor.host && isPopulatedUser(visitor.host)) return visitor.host.name;
  if (isPopulatedUser(visitor.resident)) return visitor.resident.name;
  return '—';
}

function visitorUnitDisplay(visitor: Visitor): string {
  if (visitor.apartmentNumber) return visitor.apartmentNumber;
  if (isPopulatedUser(visitor.resident) && visitor.resident.apartmentNumber) {
    const apt = visitor.resident.apartmentNumber;
    return visitor.resident.block ? `${apt} · Block ${visitor.resident.block}` : apt;
  }
  return '—';
}

function getCheckOutTime(visitor: Visitor): string | undefined {
  return visitor.checkOutTime ?? visitor.checkedOutAt;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: VisitorStatus): string {
  return STATUS_CONFIG[status].label;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  description,
  accentClass,
  labelColor,
  iconBg,
  iconColor,
  icon: Icon,
}: Readonly<{
  label: string;
  value: number;
  description: string;
  accentClass: string;
  labelColor: string;
  iconBg: string;
  iconColor: string;
  icon: React.ElementType;
}>) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`absolute left-0 top-0 h-full w-1 ${accentClass}`} />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div>
          <p className={`text-sm font-semibold ${labelColor}`}>{label}</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Invite modal ─────────────────────────────────────────────────────────────

function InviteVisitorModal({
  onClose,
  isSecurity,
  residents,
}: Readonly<{
  onClose: () => void;
  isSecurity: boolean;
  residents: AppUser[];
}>) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SecurityVisitorForm>({
    resolver: zodResolver(isSecurity ? securityVisitorSchema : residentVisitorSchema),
    defaultValues: { purpose: 'Guest', resident: '' },
  });

  const createMutation = useMutation({
    mutationFn: (payload: SecurityVisitorForm | ResidentVisitorForm) =>
      api.post('/visitors', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default border-0 bg-slate-900/40 p-0 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Invite Visitor</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isSecurity
                ? 'Log a walk-in visitor for a resident at the gate.'
                : 'Pre-register an expected guest for quick entry.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          {isSecurity && (
            <div>
              <label htmlFor="visitor-resident" className="mb-1 block text-sm font-medium text-slate-700">
                Resident
              </label>
              <select
                id="visitor-resident"
                {...register('resident')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Select resident…</option>
                {(Array.isArray(residents) ? residents : []).map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                    {r.apartmentNumber ? ` · Unit ${r.apartmentNumber}` : ''}
                  </option>
                ))}
              </select>
              {errors.resident && <p className="mt-1 text-xs text-rose-600">{errors.resident.message}</p>}
            </div>
          )}

          <div>
            <label htmlFor="visitor-name" className="mb-1 block text-sm font-medium text-slate-700">
              Visitor name
            </label>
            <input
              id="visitor-name"
              {...register('name')}
              placeholder="Full name"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="visitor-phone" className="mb-1 block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                id="visitor-phone"
                {...register('phone')}
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label htmlFor="visitor-vehicle" className="mb-1 block text-sm font-medium text-slate-700">
                Vehicle
              </label>
              <input
                id="visitor-vehicle"
                {...register('vehicleNumber')}
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="visitor-purpose" className="mb-1 block text-sm font-medium text-slate-700">
              Purpose
            </label>
            <input
              id="visitor-purpose"
              {...register('purpose')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {errors.purpose && <p className="mt-1 text-xs text-rose-600">{errors.purpose.message}</p>}
          </div>

          {createMutation.isError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Failed to save visitor. Please try again.
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Visitor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Data field (center column) ───────────────────────────────────────────────

function DataField({
  label,
  icon: Icon,
  value,
}: Readonly<{
  label: string;
  icon: React.ElementType;
  value: string;
}>) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}

// ─── Visitor row ──────────────────────────────────────────────────────────────

function VisitorRow({
  visitor,
  canManage,
  onStatusChange,
}: Readonly<{
  visitor: Visitor;
  canManage: boolean;
  onStatusChange: (id: string, status: VisitorStatus) => void;
}>) {
  const cfg = STATUS_CONFIG[visitor.status];
  const hostName = visitorResidentName(visitor);
  const unit = visitorUnitDisplay(visitor);
  const checkIn = visitor.checkInTime ?? visitor.checkedInAt;
  const checkOut = getCheckOutTime(visitor);
  const gridCols = canManage
    ? 'lg:grid-cols-[minmax(200px,1fr)_minmax(280px,2fr)_minmax(180px,auto)_auto]'
    : 'lg:grid-cols-[minmax(200px,1fr)_minmax(280px,2fr)_minmax(180px,auto)]';

  return (
    <article className="group border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50/60">
      <div className={`grid grid-cols-1 items-start gap-5 lg:gap-6 lg:items-center ${gridCols}`}>
        {/* Left — identity */}
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-sm font-bold text-emerald-800 shadow-sm ring-2 ring-white">
            {getInitials(visitor.name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{visitor.name}</h3>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>
                {cfg.icon}
                {cfg.label}
              </span>
              {visitor.purpose && (
                <span className="inline-flex items-center rounded-full bg-violet-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-violet-800">
                  {visitor.purpose}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center — structured data */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <DataField label="Hosted by" icon={User} value={hostName} />
          <DataField label="Unit" icon={Building2} value={unit} />
          <DataField label="Phone" icon={Phone} value={visitor.phone ?? '—'} />
          <DataField label="Vehicle" icon={Car} value={visitor.vehicleNumber ?? '—'} />
        </div>

        {/* Right — timestamps */}
        <div className="space-y-1.5 text-sm lg:text-right">
          <p className="flex items-center gap-1.5 text-slate-600 lg:justify-end">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>
              <span className="text-slate-400">Check-in:</span>{' '}
              <span className="font-medium text-slate-700">{formatDateTime(checkIn)}</span>
            </span>
          </p>
          {checkOut && (
            <p className="flex items-center gap-1.5 text-slate-600 lg:justify-end">
              <DoorOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>
                <span className="text-slate-400">Check-out:</span>{' '}
                <span className="font-medium text-slate-700">{formatDateTime(checkOut)}</span>
              </span>
            </p>
          )}
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {visitor.status === 'expected' && (
              <>
                <button
                  type="button"
                  onClick={() => onStatusChange(visitor._id, 'checked_in')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Check In
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange(visitor._id, 'denied')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-100/90 px-3 py-2 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Deny
                </button>
              </>
            )}
            {visitor.status === 'checked_in' && (
              <button
                type="button"
                onClick={() => onStatusChange(visitor._id, 'checked_out')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-900"
              >
                <LogOut className="h-3.5 w-3.5" />
                Check Out
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VisitorsPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<VisitorStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const isResident = user?.role === 'resident';
  const isSecurity = user?.role === 'security';
  const canCreate = isResident || isSecurity;
  const canManage = user?.role === 'security' || user?.role === 'admin';

  const { data = [], isLoading, isError, refetch } = useQuery<Visitor[]>({
    queryKey: ['visitors'],
    queryFn: () => api.get('/visitors', { params: { limit: 100 } }).then((r) => r.data.items ?? []),
  });

  const { data: residents = [] } = useQuery<AppUser[]>({
    queryKey: ['users', 'resident', 'visitors'],
    queryFn: () => api.get('/users', { params: { role: 'resident', limit: 100 } }).then((r) => r.data.items ?? []),
    enabled: isSecurity,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VisitorStatus }) =>
      api.patch(`/visitors/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors'] }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (!q) return true;
      return [v.name, v.phone, visitorResidentName(v), visitorUnitDisplay(v), v.purpose]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [data, search, statusFilter]);

  const expected = data.filter((v) => v.status === 'expected').length;
  const checkedIn = data.filter((v) => v.status === 'checked_in').length;
  const checkedOut = data.filter((v) => v.status === 'checked_out').length;

  const statusTabs = ['all', 'expected', 'checked_in', 'checked_out', 'denied'] as const;

  const visitorsContent = (() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Loading visitors…</span>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="mb-3 h-10 w-10 text-rose-500" />
          <h3 className="text-sm font-bold text-slate-900">Failed to load visitors</h3>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            Retry
          </button>
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
            <UserCheck className="h-7 w-7 text-emerald-500" />
          </div>
          <h4 className="text-base font-bold text-slate-900">No visitors found</h4>
          <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
          {canCreate && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Invite a visitor
            </button>
          )}
        </div>
      );
    }

    return filtered.map((visitor) => (
      <VisitorRow
        key={visitor._id}
        visitor={visitor}
        canManage={canManage}
        onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
      />
    ));
  })();

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Visitors Dashboard"
        description="Track expected guests, manage gate check-ins, and monitor visitor activity across the building."
        icon={UserCheck}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-700"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Visitors' },
        ]}
        action={
          canCreate ? (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Invite Visitor
            </button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Expected"
          value={expected}
          description="Awaiting arrival at the gate"
          accentClass="bg-amber-500"
          labelColor="text-amber-600"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          icon={Clock}
        />
        <StatCard
          label="Checked In"
          value={checkedIn}
          description="Currently inside the premises"
          accentClass="bg-emerald-500"
          labelColor="text-emerald-600"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          icon={CheckCircle2}
        />
        <StatCard
          label="Checked Out"
          value={checkedOut}
          description="Completed visits today"
          accentClass="bg-sky-500"
          labelColor="text-sky-600"
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          icon={LogOut}
        />
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
            {statusTabs.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s === 'all' ? 'All' : statusLabel(s)}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search visitors, residents, phone…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className={`hidden border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:grid lg:gap-6 ${
          canManage
            ? 'lg:grid-cols-[minmax(200px,1fr)_minmax(280px,2fr)_minmax(180px,auto)_auto]'
            : 'lg:grid-cols-[minmax(200px,1fr)_minmax(280px,2fr)_minmax(180px,auto)]'
        }`}>
          <span>Visitor</span>
          <span>Details</span>
          <span className="lg:text-right">Timeline</span>
          {canManage && <span className="lg:text-right">Actions</span>}
        </div>
        {visitorsContent}
      </div>

      {showModal && (
        <InviteVisitorModal
          onClose={() => setShowModal(false)}
          isSecurity={isSecurity}
          residents={residents}
        />
      )}
    </div>
  );
}
