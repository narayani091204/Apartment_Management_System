import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceCategory,
  User,
} from "../types/api";
import {
  Wrench,
  Plus,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Trash2,
  RefreshCw,
  UserCog,
  Search,
  Building2,
  Calendar,
  User as UserIcon,
  Star,
  Zap,
} from "lucide-react";
import { Modal } from "antd";
import { api } from "../lib/api";
import { useAuth } from "../auth/useAuth";
import { PageHeader } from "../components/PageHeader";

const ADMIN_STATUSES: MaintenanceStatus[] = [
  "pending",
  "in_progress",
  "resolved",
  "rejected",
];

const WORKER_STATUSES: MaintenanceStatus[] = ["in_progress", "resolved"];

const baseRequestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Please describe the issue in more detail"),
  category: z.enum([
    "plumbing",
    "electrical",
    "carpentry",
    "appliance",
    "cleaning",
    "security",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

const residentRequestSchema = baseRequestSchema;
const adminRequestSchema = baseRequestSchema.extend({
  residentId: z.string().min(1, "Select the resident this request is for"),
});

type ResidentRequestForm = z.infer<typeof residentRequestSchema>;
type AdminRequestForm = z.infer<typeof adminRequestSchema>;

const STATUS_CONFIG: Record<
  MaintenanceStatus,
  { label: string; pill: string; dot: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  in_progress: {
    label: "In Progress",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
  resolved: {
    label: "Resolved",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "Rejected",
    pill: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-500",
    icon: <X className="w-3.5 h-3.5" />,
  },
};

const PRIORITY_BADGE: Record<
  MaintenancePriority,
  { label: string; className: string }
> = {
  urgent: { label: "URGENT", className: "bg-red-50 text-red-600 border-red-100" },
  high: { label: "HIGH PRIORITY", className: "bg-red-50 text-red-600 border-red-100" },
  medium: { label: "MEDIUM", className: "bg-amber-50 text-amber-600 border-amber-100" },
  low: { label: "LOW", className: "bg-slate-50 text-slate-500 border-slate-200" },
};

const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  carpentry: "Carpentry",
  appliance: "Appliance",
  cleaning: "Cleaning",
  security: "Security",
  other: "Other",
};

function isPopulatedUser(value: string | User): value is User {
  return typeof value === "object" && value !== null;
}

function getAssigneeId(assignedTo?: string | User): string {
  if (!assignedTo) return "";
  return isPopulatedUser(assignedTo) ? assignedTo._id : assignedTo;
}

function isAssignedToUser(request: MaintenanceRequest, userId: string): boolean {
  return getAssigneeId(request.assignedTo) === userId;
}

function formatTicketId(id: string): string {
  return `TKT-${id.slice(-6).toUpperCase()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function filterTabLabel(status: MaintenanceStatus | "all"): string {
  if (status === "all") return "All";
  if (status === "in_progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function pageDescription(isAdmin: boolean, isWorker: boolean): string {
  if (isAdmin) {
    return "Log, track, and process facility work tickets across all apartment wings.";
  }
  if (isWorker) {
    return "View and update maintenance jobs assigned to you.";
  }
  return "Submit and track your maintenance requests.";
}

function PriorityBadge({ priority }: Readonly<{ priority: MaintenancePriority }>) {
  const cfg = PRIORITY_BADGE[priority];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: Readonly<{ status: MaintenanceStatus }>) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${cfg.pill}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── New Request Modal ────────────────────────────────────────────────────────

function NewRequestModal({
  onClose,
  isAdmin,
  residents,
}: Readonly<{
  onClose: () => void;
  isAdmin: boolean;
  residents: User[];
}>) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminRequestForm>({
    resolver: zodResolver(isAdmin ? adminRequestSchema : residentRequestSchema),
    defaultValues: { category: "plumbing", priority: "medium", residentId: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: AdminRequestForm | ResidentRequestForm) =>
      api.post("/maintenance", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm border-0 p-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Log New Request</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isAdmin
                ? "File a request on behalf of a resident who cannot use the app themselves."
                : "Describe the issue and our team will assign someone to look into it."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((d) => createMutation.mutate(d))}
          className="space-y-4"
        >
          {isAdmin && (
            <div>
              <label htmlFor="maintenance-resident" className="block text-sm font-medium text-slate-700 mb-1">
                Resident
              </label>
              <div className="relative">
                <select
                  id="maintenance-resident"
                  {...register("residentId")}
                  className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 pr-8"
                >
                  <option value="">Select resident…</option>
                  {residents.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                      {r.apartmentNumber ? ` · Unit ${r.apartmentNumber}` : ""}
                      {r.block ? ` Block ${r.block}` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {isAdmin && errors.residentId && (
                <p className="mt-1 text-xs text-red-600">{errors.residentId.message}</p>
              )}
            </div>
          )}
          <div>
            <label htmlFor="maintenance-title" className="block text-sm font-medium text-slate-700 mb-1">
              Title
            </label>
            <input
              id="maintenance-title"
              {...register("title")}
              placeholder="e.g. Hallway light burnt out"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="maintenance-description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="maintenance-description"
              {...register("description")}
              rows={3}
              placeholder="Describe what's happening and when it started…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="maintenance-category" className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <div className="relative">
                <select
                  id="maintenance-category"
                  {...register("category")}
                  className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 pr-8"
                >
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label htmlFor="maintenance-priority" className="block text-sm font-medium text-slate-700 mb-1">
                Priority
              </label>
              <div className="relative">
                <select
                  id="maintenance-priority"
                  {...register("priority")}
                  className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 pr-8"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {createMutation.isError && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Something went wrong. Please try again.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-60 flex items-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assign worker (admin only) ───────────────────────────────────────────────

function AssignToSelect({
  request,
  workers,
}: Readonly<{ request: MaintenanceRequest; workers: User[] }>) {
  const queryClient = useQueryClient();
  const assignMutation = useMutation({
    mutationFn: (assignedTo: string) =>
      api
        .patch(`/maintenance/${request._id}/status`, {
          status: request.status,
          assignedTo,
        })
        .then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  const currentAssigneeId = getAssigneeId(request.assignedTo);

  return (
    <div className="relative">
      <UserCog className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      <select
        aria-label="Assign staff"
        value={currentAssigneeId}
        onChange={(e) => {
          if (e.target.value) assignMutation.mutate(e.target.value);
        }}
        disabled={assignMutation.isPending}
        className="appearance-none pl-8 pr-8 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 min-w-[140px]"
      >
        <option value="">Assign Staff…</option>
        {(Array.isArray(workers) ? workers : []).map((w) => (
          <option key={w._id} value={w._id}>{w.name}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
    </div>
  );
}

// ─── Status dropdown ────────────────────────────────────────────────────────────

function StatusDropdown({
  request,
  allowedStatuses,
}: Readonly<{
  request: MaintenanceRequest;
  allowedStatuses: MaintenanceStatus[];
}>) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[request.status];

  const patchMutation = useMutation({
    mutationFn: (status: MaintenanceStatus) =>
      api.patch(`/maintenance/${request._id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setOpen(false);
    },
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${cfg.pill}`}
      >
        {cfg.icon}
        {cfg.label}
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-40 py-1 overflow-hidden">
          {allowedStatuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => patchMutation.mutate(s)}
              disabled={s === request.status || patchMutation.isPending}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Request card ─────────────────────────────────────────────────────────────

function RequestCard({
  request,
  isAdmin,
  isWorker,
  currentUserId,
  workers,
  onDelete,
}: Readonly<{
  request: MaintenanceRequest;
  isAdmin: boolean;
  isWorker: boolean;
  currentUserId: string;
  workers: User[];
  onDelete: (id: string) => void;
}>) {
  const statusCfg = STATUS_CONFIG[request.status];
  const canUpdateStatus =
    isAdmin || (isWorker && isAssignedToUser(request, currentUserId));
  const allowedStatuses = isAdmin ? ADMIN_STATUSES : WORKER_STATUSES;
  const resident = isPopulatedUser(request.resident) ? request.resident : null;

  return (
    <article className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={request.priority} />
          <span className="text-xs font-mono text-slate-400 tracking-wide">
            {formatTicketId(request._id)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && <AssignToSelect request={request} workers={workers} />}

          {canUpdateStatus ? (
            <StatusDropdown request={request} allowedStatuses={allowedStatuses} />
          ) : (
            <StatusBadge status={request.status} />
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                Modal.confirm({
                  title: "Delete Maintenance Request",
                  content: "Are you sure you want to delete this request?",
                  okText: "Yes, Delete",
                  okType: "danger",
                  cancelText: "Cancel",
                  onOk() { onDelete(request._id); },
                });
              }}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete request"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Title + description */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`} />
          <h3 className="text-base font-bold text-slate-900">{request.title}</h3>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
          {request.description}
        </p>
      </div>

      {/* Tags + date */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-medium">
          <Zap className="w-3 h-3" />
          {CATEGORY_LABELS[request.category]}
        </span>

        {resident && (
          <>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
              <Building2 className="w-3 h-3" />
              Unit {resident.apartmentNumber ?? "—"} · Block {resident.block ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
              <UserIcon className="w-3 h-3" />
              {resident.name}
            </span>
          </>
        )}

        <span className="inline-flex items-center gap-1.5 ml-auto text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(request.createdAt)}
        </span>
      </div>
    </article>
  );
}

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  description,
  borderColor,
  labelColor,
  iconBg,
  iconColor,
  icon: Icon,
}: Readonly<{
  label: string;
  value: number;
  description: string;
  borderColor: string;
  labelColor: string;
  iconBg: string;
  iconColor: string;
  icon: React.ElementType;
}>) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 border-t-4 ${borderColor} p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${labelColor}`}>{label}</p>
          <p className="text-4xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">{description}</p>
        </div>
        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyFilteredState({ onReset }: Readonly<{ onReset: () => void }>) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-5">
        <Search className="w-8 h-8 text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">No Matching Tickets Found</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-sm leading-relaxed">
        Try relaxing your search terms or filters to find the required maintenance logs.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 shadow-sm shadow-violet-200 transition-colors"
      >
        Reset All Filters
      </button>
    </div>
  );
}

function EmptyNoTicketsState({
  isWorkerView,
  canCreateRequest,
  onOpenModal,
}: Readonly<{
  isWorkerView: boolean;
  canCreateRequest: boolean;
  onOpenModal: () => void;
}>) {
  const message = isWorkerView
    ? "No jobs assigned to you yet."
    : "No maintenance tickets yet.";

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-5">
        <Wrench className="w-8 h-8 text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">{message}</h3>
      {canCreateRequest && (
        <button
          type="button"
          onClick={onOpenModal}
          className="mt-6 text-sm text-violet-600 font-medium hover:underline"
        >
          Log your first request →
        </button>
      )}
    </div>
  );
}

// ─── List body ────────────────────────────────────────────────────────────────

function RequestListBody({
  isLoading,
  isError,
  refetch,
  filtered,
  totalCount,
  hasActiveFilters,
  isAdmin,
  isWorker,
  currentUserId,
  workers,
  isWorkerView,
  onDelete,
  onOpenModal,
  onResetFilters,
  canCreateRequest,
}: Readonly<{
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  filtered: MaintenanceRequest[];
  totalCount: number;
  hasActiveFilters: boolean;
  isAdmin: boolean;
  isWorker: boolean;
  currentUserId: string;
  workers: User[];
  isWorkerView: boolean;
  onDelete: (id: string) => void;
  onOpenModal: () => void;
  onResetFilters: () => void;
  canCreateRequest: boolean;
}>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm">Loading tickets…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm">Failed to load maintenance requests.</p>
        <button type="button" onClick={() => refetch()} className="text-sm text-violet-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (filtered.length === 0) {
    const content =
      totalCount > 0 || hasActiveFilters ? (
        <EmptyFilteredState onReset={onResetFilters} />
      ) : (
        <EmptyNoTicketsState
          isWorkerView={isWorkerView}
          canCreateRequest={canCreateRequest}
          onOpenModal={onOpenModal}
        />
      );

    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
      <div className="space-y-4">
        {filtered.map((req) => (
          <RequestCard
            key={req._id}
            request={req}
            isAdmin={isAdmin}
            isWorker={isWorker}
            currentUserId={currentUserId}
            workers={workers}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<MaintenanceStatus | "all">("all");
  const [filterCategory, setFilterCategory] = useState<MaintenanceCategory | "all">("all");
  const [filterPriority, setFilterPriority] = useState<MaintenancePriority | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = user?.role === "admin";
  const isWorker = user?.role === "security";
  const canCreateRequest = isAdmin || user?.role === "resident";
  const currentUserId = user?._id ?? "";

  const { data: workers = [] } = useQuery<User[]>({
    queryKey: ["maintenance", "workers"],
    queryFn: () =>
      api.get("/users", { params: { role: "security", limit: 100 } }).then((r) => r.data.items ?? []),
    enabled: isAdmin,
  });

  const { data: residents = [] } = useQuery<User[]>({
    queryKey: ["maintenance", "residents"],
    queryFn: () =>
      api.get("/users", { params: { role: "resident", limit: 100 } }).then((r) => r.data.items ?? []),
    enabled: isAdmin,
  });

  const { data = [], isLoading, isError, refetch } = useQuery<MaintenanceRequest[]>({
    queryKey: ["maintenance"],
    queryFn: () => api.get("/maintenance").then((r) => r.data.items ?? []),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/maintenance/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  const requests = data ?? [];

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterCategory !== "all" && r.category !== filterCategory) return false;
      if (filterPriority !== "all" && r.priority !== filterPriority) return false;
      if (!q) return true;

      const resident = isPopulatedUser(r.resident) ? r.resident : null;
      const haystack = [
        r.title,
        r.description,
        formatTicketId(r._id),
        resident?.name ?? "",
        resident?.apartmentNumber ?? "",
        resident?.block ?? "",
      ].join(" ").toLowerCase();

      return haystack.includes(q);
    });
  }, [requests, filterStatus, filterCategory, filterPriority, searchQuery]);

  const pending = requests.filter((r) => r.status === "pending").length;
  const inProgress = requests.filter((r) => r.status === "in_progress").length;
  const resolved = requests.filter((r) => r.status === "resolved").length;

  const statusTabs = ["all", "pending", "in_progress", "resolved"] as const;

  const hasActiveFilters =
    filterStatus !== "all" ||
    filterCategory !== "all" ||
    filterPriority !== "all" ||
    searchQuery.trim().length > 0;

  function resetAllFilters() {
    setFilterStatus("all");
    setFilterCategory("all");
    setFilterPriority("all");
    setSearchQuery("");
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Maintenance Dashboard"
        description={pageDescription(isAdmin, isWorker)}
        icon={Wrench}
        iconBg="bg-violet-50"
        iconColor="text-violet-700"
        breadcrumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Maintenance" },
        ]}
        action={
          canCreateRequest ? (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 shadow-sm shadow-violet-200 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Log New Request
            </button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Pending Review"
            value={pending}
            description="Active queue waiting for assignment"
            borderColor="border-t-amber-500"
            labelColor="text-amber-600"
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            icon={Clock}
          />
          <StatCard
            label="In Progress"
            value={inProgress}
            description="Scheduled / ongoing repair missions"
            borderColor="border-t-blue-500"
            labelColor="text-blue-600"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            icon={Star}
          />
          <StatCard
            label="Resolved"
            value={resolved}
            description="Successfully closed tasks this month"
            borderColor="border-t-emerald-500"
            labelColor="text-emerald-600"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            icon={CheckCircle2}
          />
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Segmented tabs */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl shrink-0">
              {statusTabs.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    filterStatus === s
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {filterTabLabel(s)}
                </button>
              ))}
            </div>

            {/* Search + dropdowns */}
            <div className="flex flex-col sm:flex-row flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tickets, units…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white"
                />
              </div>

              <div className="relative">
                <select
                  aria-label="Filter by category"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as MaintenanceCategory | "all")}
                  className="appearance-none w-full sm:w-auto pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  aria-label="Filter by priority"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as MaintenancePriority | "all")}
                  className="appearance-none w-full sm:w-auto pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Ticket list */}
        <RequestListBody
          isLoading={isLoading}
          isError={isError}
          refetch={refetch}
          filtered={filtered}
          totalCount={requests.length}
          hasActiveFilters={hasActiveFilters}
          isAdmin={isAdmin}
          isWorker={isWorker}
          currentUserId={currentUserId}
          workers={workers}
          isWorkerView={isWorker}
          onDelete={(id) => deleteMutation.mutate(id)}
          onOpenModal={() => setShowModal(true)}
          onResetFilters={resetAllFilters}
          canCreateRequest={canCreateRequest}
        />

        {showModal && (
          <NewRequestModal
            onClose={() => setShowModal(false)}
            isAdmin={isAdmin}
            residents={residents}
          />
        )}
    </div>
  );
}
