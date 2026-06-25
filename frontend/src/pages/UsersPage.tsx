import { useMemo, useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  Plus,
  UserCog,
  X,
  Users,
  Search,
  ChevronDown,
  MoreHorizontal,
  ShieldAlert,
  UserMinus,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  User as UserIcon,
  Briefcase,
  Clock,
  Mail,
  Info,
  Upload,
} from 'lucide-react';
import { Modal } from 'antd';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/ui/button';
import { apiGet, apiPost, apiDelete, getApiErrorMessage } from '@/lib/api';
import type { Role, User } from '@/types/api';

type CreateRole = 'security' | 'resident';
type RoleFilter = Role | 'all';
type SortOption = 'newest' | 'oldest' | 'name';
type StaffProfile = 'security_guard' | 'maintenance_staff' | 'resident';

const registerUserSchema = z
  .object({
    staffProfile: z.enum(['security_guard', 'maintenance_staff', 'resident']),
    name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().min(7, 'Phone is required for alerts and verification'),
    password: z.string().optional(),
    sendInviteEmail: z.boolean().default(false),
    forcePasswordReset: z.boolean().default(true),
    department: z.string().optional(),
    shiftStart: z.string().optional(),
    shiftEnd: z.string().optional(),
    accountExpiresAt: z.string().optional(),
    apartmentNumber: z.string().optional(),
    block: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.sendInviteEmail) {
      if (!data.password || data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password must be at least 8 characters',
          path: ['password'],
        });
      }
    }
  });

type RegisterUserForm = z.infer<typeof registerUserSchema>;

function profileToRole(profile: StaffProfile): CreateRole {
  return profile === 'resident' ? 'resident' : 'security';
}

function defaultProfileForTab(role: CreateRole): StaffProfile {
  return role === 'resident' ? 'resident' : 'security_guard';
}

function defaultDepartment(profile: StaffProfile): string {
  if (profile === 'security_guard') return 'Security';
  if (profile === 'maintenance_staff') return 'Maintenance';
  return '';
}

function generateStrongPassword(length = 16): string {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function DrawerSection({
  title,
  description,
  icon: Icon,
  children,
}: Readonly<{
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}>) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-violet-50 p-2">
          <Icon className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function fieldClassName() {
  return 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20';
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  resident: 'Resident',
  security: 'Worker',
};

const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-violet-100/90 text-violet-800',
  resident: 'bg-sky-100/90 text-sky-800',
  security: 'bg-slate-100/90 text-slate-700',
};

const ROLE_FILTER_LABELS: Record<RoleFilter, string> = {
  all: 'All users',
  security: 'Workers',
  resident: 'Residents',
  admin: 'Admins',
};

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  name: 'Name A–Z',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function userStatusLabel(user: User): string {
  if (!user.isActive) return 'Inactive';
  if (user.role === 'resident') {
    if (user.apartmentNumber) {
      return user.block ? `Unit ${user.apartmentNumber} · Block ${user.block}` : `Unit ${user.apartmentNumber}`;
    }
    return 'No unit assigned';
  }
  if (user.role === 'security') return user.department ?? 'Security Team';
  if (user.role === 'admin') return 'Administrator';
  return 'Active';
}

function addButtonLabel(roleFilter: RoleFilter): string {
  if (roleFilter === 'security') return 'Register Worker';
  if (roleFilter === 'resident') return 'Register Resident';
  return 'Add New User';
}

// ─── Register user drawer ─────────────────────────────────────────────────────

function RegisterUserDrawer({
  initialRole,
  onClose,
}: Readonly<{
  initialRole: CreateRole;
  onClose: () => void;
}>) {
  const queryClient = useQueryClient();
  const { user: admin } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password?: string; name: string } | null>(null);

  const defaultProfile = defaultProfileForTab(initialRole);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterUserForm>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      staffProfile: defaultProfile,
      sendInviteEmail: false,
      forcePasswordReset: true,
      department: defaultDepartment(defaultProfile),
      shiftStart: '08:00',
      shiftEnd: '16:00',
    },
  });

  const staffProfile = watch('staffProfile');
  const sendInviteEmail = watch('sendInviteEmail');
  const isResident = staffProfile === 'resident';

  const createMutation = useMutation({
    mutationFn: (data: RegisterUserForm) => {
      const role = profileToRole(data.staffProfile);
      const password = data.sendInviteEmail ? generateStrongPassword(20) : data.password!;
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password,
        role,
        department: data.department || undefined,
        shiftStart: isResident ? undefined : data.shiftStart || undefined,
        shiftEnd: isResident ? undefined : data.shiftEnd || undefined,
        accountExpiresAt: data.accountExpiresAt || undefined,
        apartmentNumber: isResident ? data.apartmentNumber : undefined,
        block: isResident ? data.block : undefined,
      };
      return apiPost<{ user: User }>('/users', payload).then((res) => ({ res, password: data.sendInviteEmail ? undefined : password }));
    },
    onSuccess: ({ password }, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreated({ email: variables.email, password, name: variables.name });
    },
    onError: (err) => setFormError(getApiErrorMessage(err)),
  });

  function handleProfileChange(profile: StaffProfile) {
    setValue('staffProfile', profile);
    setValue('department', defaultDepartment(profile));
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 cursor-default border-0 bg-slate-900/40 p-0 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Register User</h2>
            <p className="text-xs text-slate-500">Create a new building account with role-based access</p>
          </div>
        </div>

        {created ? (
          <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="font-semibold text-emerald-900">Account created successfully</h3>
              <p className="mt-1 text-sm text-emerald-800">
                <strong>{created.name}</strong> can now access the building portal.
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-emerald-700">Email</dt>
                  <dd className="text-emerald-900">{created.email}</dd>
                </div>
                {created.password && (
                  <div>
                    <dt className="font-medium text-emerald-700">Temporary password</dt>
                    <dd className="font-mono text-emerald-900">{created.password}</dd>
                    <p className="mt-1 text-xs text-emerald-700">Share securely. User should change it on first login.</p>
                  </div>
                )}
              </dl>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((d) => {
              setFormError(null);
              createMutation.mutate(d);
            })}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* 1. Account credentials */}
              <DrawerSection
                title="Account Credentials & Security"
                description="Define access level and how the user will sign in."
                icon={Shield}
              >
                <div className="space-y-4">
                  <div>
                    <label htmlFor="staff-profile" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Role / Permission <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="staff-profile"
                      {...register('staffProfile', {
                        onChange: (e) => handleProfileChange(e.target.value as StaffProfile),
                      })}
                      className={fieldClassName()}
                    >
                      <option value="security_guard">Security Guard</option>
                      <option value="maintenance_staff">Maintenance Staff</option>
                      <option value="resident">Resident</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      Defaults to the lowest access role. Admin accounts cannot be created here.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 opacity-60">
                    <input type="checkbox" disabled className="mt-0.5" />
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        <Mail className="h-3.5 w-3.5" />
                        Send invitation email to set password
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Coming soon — requires SMTP configuration. A secure password will be generated for now.
                      </span>
                    </span>
                  </label>

                  <input type="hidden" {...register('sendInviteEmail')} />

                  {!sendInviteEmail && (
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="user-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                          Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              id="user-password"
                              type={showPassword ? 'text' : 'password'}
                              {...register('password')}
                              placeholder="Minimum 8 characters"
                              className={`${fieldClassName()} pr-10`}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setValue('password', generateStrongPassword())}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Generate
                          </button>
                        </div>
                        {errors.password && (
                          <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
                        )}
                      </div>

                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          {...register('forcePasswordReset')}
                          className="rounded border-slate-300 text-violet-600"
                        />
                        Force password reset on first login
                      </label>
                    </div>
                  )}

                  <div>
                    <label htmlFor="account-expires" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Account expiration date <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="account-expires"
                      type="date"
                      {...register('accountExpiresAt')}
                      className={fieldClassName()}
                    />
                    <p className="mt-1 text-xs text-slate-500">For temporary contractors or seasonal staff.</p>
                  </div>
                </div>
              </DrawerSection>

              {/* 2. Personal profile */}
              <DrawerSection
                title="Personal & Contact Profile"
                description="Identity details used across the building portal."
                icon={UserIcon}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-lg font-bold text-violet-800 ring-2 ring-white">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon className="h-7 w-7 text-violet-500" />
                      )}
                    </div>
                    <div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Upload className="h-3.5 w-3.5" />
                        Upload photo
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      </label>
                      <p className="mt-1 text-xs text-slate-400">Preview only — storage sync coming soon.</p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="user-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Full name <span className="text-rose-500">*</span>
                    </label>
                    <input id="user-name" {...register('name')} className={fieldClassName()} />
                    {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="user-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Email <span className="text-rose-500">*</span>
                    </label>
                    <input id="user-email" type="email" {...register('email')} className={fieldClassName()} />
                    {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="user-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Phone <span className="text-rose-500">*</span>
                    </label>
                    <input id="user-phone" type="tel" {...register('phone')} className={fieldClassName()} />
                    {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone.message}</p>}
                    <p className="mt-1 text-xs text-slate-500">Used for SMS alerts and incident notifications.</p>
                  </div>

                  {isResident && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="user-unit" className="mb-1.5 block text-sm font-medium text-slate-700">Unit</label>
                        <input id="user-unit" placeholder="e.g. 404B" {...register('apartmentNumber')} className={fieldClassName()} />
                      </div>
                      <div>
                        <label htmlFor="user-block" className="mb-1.5 block text-sm font-medium text-slate-700">Block</label>
                        <input id="user-block" placeholder="e.g. A" {...register('block')} className={fieldClassName()} />
                      </div>
                    </div>
                  )}
                </div>
              </DrawerSection>

              {/* 3. Work assignments */}
              {!isResident && (
                <DrawerSection
                  title="Work & Access Assignments"
                  description="Shift and agency details for staff compliance."
                  icon={Briefcase}
                >
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="department" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Department / Agency
                      </label>
                      <input
                        id="department"
                        {...register('department')}
                        placeholder="e.g. Apex Security Services"
                        className={fieldClassName()}
                      />
                    </div>

                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        <Clock className="h-4 w-4 text-slate-400" />
                        Assigned shift / working hours
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="shift-start" className="mb-1 block text-xs text-slate-500">Start</label>
                          <input id="shift-start" type="time" {...register('shiftStart')} className={fieldClassName()} />
                        </div>
                        <div>
                          <label htmlFor="shift-end" className="mb-1 block text-xs text-slate-500">End</label>
                          <input id="shift-end" type="time" {...register('shiftEnd')} className={fieldClassName()} />
                        </div>
                      </div>
                    </div>
                  </div>
                </DrawerSection>
              )}

              {formError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {formError}
                </p>
              )}

              <p className="flex items-start gap-2 text-xs text-slate-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This action will be logged under your administrator audit trail
                {admin?.name ? ` (${admin.name})` : ''}.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-violet-600 hover:bg-violet-700">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}

// ─── Add user button ──────────────────────────────────────────────────────────

function AddUserButton({
  roleFilter,
  onAdd,
}: Readonly<{
  roleFilter: RoleFilter;
  onAdd: (role: CreateRole) => void;
}>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (roleFilter === 'security') {
    return (
      <Button onClick={() => onAdd('security')} className="bg-violet-600 hover:bg-violet-700">
        <Plus className="h-4 w-4" />
        Register Worker
      </Button>
    );
  }

  if (roleFilter === 'resident') {
    return (
      <Button onClick={() => onAdd('resident')} className="bg-violet-600 hover:bg-violet-700">
        <Plus className="h-4 w-4" />
        Register Resident
      </Button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        onClick={() => setOpen((v) => !v)}
        className="bg-violet-600 hover:bg-violet-700"
      >
        <Plus className="h-4 w-4" />
        Add New User
        <ChevronDown className="h-4 w-4 opacity-80" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAdd('security');
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <UserCog className="h-4 w-4 text-slate-500" />
            Register Worker
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAdd('resident');
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Users className="h-4 w-4 text-slate-500" />
            Register Resident
          </button>
        </div>
      )}
    </div>
  );
}

// ─── User row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onDeactivate,
}: Readonly<{
  user: User;
  onDeactivate: (user: User) => void;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <article className={`grid grid-cols-1 items-center gap-4 border-b border-slate-100 px-5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-slate-50/80 lg:grid-cols-[minmax(220px,1.4fr)_minmax(120px,0.8fr)_minmax(160px,1fr)_auto] lg:gap-6 ${menuOpen ? 'relative z-50' : ''}`}>
      {/* Name & contact */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-violet-50 text-xs font-bold text-violet-800 ring-2 ring-white">
          {getInitials(user.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{user.name}</p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
        </div>
      </div>

      {/* Role */}
      <div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE[user.role]}`}>
          {ROLE_LABELS[user.role]}
        </span>
      </div>

      {/* Status / unit */}
      <div>
        <p className={`text-sm font-medium ${user.isActive ? 'text-slate-700' : 'text-rose-600'}`}>
          {userStatusLabel(user)}
        </p>
        {user.phone && (
          <p className="mt-0.5 text-xs text-slate-400">{user.phone}</p>
        )}
      </div>

      {/* Actions */}
      <div className={`relative flex justify-start lg:justify-end ${menuOpen ? 'z-50' : ''}`} ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="More actions"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen && user.isActive && user.role !== 'admin' && (
          <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDeactivate(user);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-700 hover:bg-rose-50"
            >
              <UserMinus className="h-4 w-4" />
              Deactivate account
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('security');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [createModal, setCreateModal] = useState<{ open: true; role: CreateRole } | { open: false }>({
    open: false,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', 'list', roleFilter, search],
    queryFn: () =>
      apiGet<{ items: User[] }>('/users', {
        role: roleFilter === 'all' ? undefined : roleFilter,
        search: search.trim() || undefined,
        limit: 100,
      }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const users = useMemo(() => {
    const list = [...(data?.items ?? [])];
    if (sort === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [data?.items, sort]);

  function handleDeactivate(user: User) {
    Modal.confirm({
      title: 'Deactivate account',
      content: `Deactivate ${user.name}? They will no longer be able to sign in.`,
      okText: 'Deactivate',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        deactivateMutation.mutate(user._id);
      },
    });
  }

  const listContent = (() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-violet-600" />
          <span className="text-sm font-medium">Loading users…</span>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="mb-3 h-10 w-10 text-rose-500" />
          <p className="text-sm font-medium text-slate-700">Failed to load users.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
          >
            Retry
          </button>
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserCog className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No users found.</p>
          <p className="mt-1 text-xs text-slate-400">Try a different search or filter.</p>
          {roleFilter !== 'all' && (
            <button
              type="button"
              onClick={() =>
                setCreateModal({
                  open: true,
                  role: roleFilter === 'resident' ? 'resident' : 'security',
                })
              }
              className="mt-4 text-sm font-semibold text-violet-600 hover:text-violet-700"
            >
              {addButtonLabel(roleFilter)} →
            </button>
          )}
        </div>
      );
    }

    return users.map((u) => (
      <UserRow key={u._id} user={u} onDeactivate={handleDeactivate} />
    ));
  })();

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Staff & Residents"
        description="Register maintenance workers, manage building staff, and view all registered residents."
        icon={Users}
        iconBg="bg-violet-50"
        iconColor="text-violet-700"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Staff' },
        ]}
        action={
          <AddUserButton
            roleFilter={roleFilter}
            onAdd={(role) => setCreateModal({ open: true, role })}
          />
        }
      />

      {/* Tabs */}
      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        {(['security', 'resident', 'all'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              roleFilter === r
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {ROLE_FILTER_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Search & filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="user-sort" className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sort by
            </label>
            <select
              id="user-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:grid lg:grid-cols-[minmax(220px,1.4fr)_minmax(120px,0.8fr)_minmax(160px,1fr)_auto] lg:gap-6">
          <span>Name & Contact</span>
          <span>Role</span>
          <span>Status / Unit</span>
          <span className="text-right">Actions</span>
        </div>
        {listContent}
      </div>

      {createModal.open && (
        <RegisterUserDrawer
          initialRole={createModal.role}
          onClose={() => setCreateModal({ open: false })}
        />
      )}
    </div>
  );
}
