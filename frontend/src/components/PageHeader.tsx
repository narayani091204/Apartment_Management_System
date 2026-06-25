import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface PageBreadcrumb {
  label: string;
  to?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  iconBg = 'bg-sky-50',
  iconColor = 'text-sky-700',
  breadcrumbs,
  action,
}: Readonly<{
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  breadcrumbs?: PageBreadcrumb[];
  action?: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        )}
        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-slate-400">
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.label} className="inline-flex items-center gap-2">
                  {index > 0 && <span>/</span>}
                  {crumb.to ? (
                    <Link to={crumb.to} className="transition-colors hover:text-sky-600">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-slate-600">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
