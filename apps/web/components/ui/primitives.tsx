'use client';

import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, ArrowRight, Inbox, RefreshCw } from 'lucide-react';
import type {
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import Link from 'next/link';
import { cn, initials } from '@/lib/utils';
import { Button } from './button';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-white bg-white p-5 shadow-card', className)}
      {...props}
    />
  );
}

type Tone =
  | 'indigo'
  | 'teal'
  | 'amber'
  | 'coral'
  | 'violet'
  | 'sky'
  | 'slate'
  | 'green';

const toneClasses: Record<Tone, string> = {
  indigo: 'bg-lavender text-indigo',
  teal: 'bg-softteal text-teal',
  amber: 'bg-amber-50 text-[#B45309]',
  coral: 'bg-softcoral text-[#C2410C]',
  violet: 'bg-[#F3EEFF] text-violet',
  sky: 'bg-sky-50 text-[#0369A1]',
  slate: 'bg-slate-100 text-slate-600',
  green: 'bg-emerald-50 text-emerald-700',
};

export function Badge({
  children,
  tone = 'slate',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status?: string | null): Tone {
  switch (status) {
    case 'PUBLISHED':
    case 'COMPLETED':
    case 'GRADED':
    case 'ACTIVE':
      return 'teal';
    case 'DRAFT':
    case 'IN_PROGRESS':
    case 'UPCOMING':
      return 'amber';
    case 'ARCHIVED':
    case 'CANCELLED':
    case 'TIMED_OUT':
      return 'coral';
    case 'SUBMITTED':
      return 'indigo';
    case 'EASY':
      return 'teal';
    case 'MEDIUM':
      return 'amber';
    case 'HARD':
      return 'coral';
    default:
      return 'slate';
  }
}

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <Badge tone="slate">Unknown</Badge>;
  return <Badge tone={statusTone(status)}>{status.replaceAll('_', ' ')}</Badge>;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[0.8rem] font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-indigo focus:ring-4 focus:ring-indigo/10 disabled:bg-slate-50',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-indigo focus:ring-4 focus:ring-indigo/10',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-ink outline-none transition focus:border-indigo focus:ring-4 focus:ring-indigo/10',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function ProgressBar({
  value,
  tone = 'indigo',
  showLabel = false,
  className,
}: {
  value: number;
  tone?: 'indigo' | 'teal' | 'amber' | 'coral' | 'violet';
  showLabel?: boolean;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const bar: Record<string, string> = {
    indigo: 'bg-indigo',
    teal: 'bg-teal',
    amber: 'bg-amber',
    coral: 'bg-coral',
    violet: 'bg-violet',
  };
  return (
    <div className={cn('space-y-1.5', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Progress</span>
          <span className="text-ink">{safe}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all duration-500', bar[tone])}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 'md',
}: {
  name?: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dimensions = { sm: 'h-8 w-8 text-[0.65rem]', md: 'h-10 w-10 text-xs', lg: 'h-14 w-14 text-base' };
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name ? `${name} avatar` : 'User avatar'}
      className={cn('rounded-full object-cover ring-2 ring-white', dimensions[size])}
    />
  ) : (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-br from-indigo to-violet font-bold text-white ring-2 ring-white',
        dimensions[size],
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-xl bg-[linear-gradient(90deg,#eef1f8_25%,#f7f8fd_50%,#eef1f8_75%)] bg-[length:400px_100%]',
        className,
      )}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-indigo/15 bg-white/60 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lavender text-indigo">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
        >
          {action.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-coral/20 bg-softcoral/40 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-softcoral text-coral">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <p className="max-w-md text-sm font-medium text-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}

const statTones: Record<string, { bg: string; icon: string; accent: string }> = {
  indigo: { bg: 'bg-lavender', icon: 'text-indigo', accent: 'from-indigo/15' },
  teal: { bg: 'bg-softteal', icon: 'text-teal', accent: 'from-teal/15' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber', accent: 'from-amber/15' },
  coral: { bg: 'bg-softcoral', icon: 'text-coral', accent: 'from-coral/15' },
  violet: { bg: 'bg-[#F3EEFF]', icon: 'text-violet', accent: 'from-violet/15' },
  sky: { bg: 'bg-sky-50', icon: 'text-sky', accent: 'from-sky/15' },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'indigo',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof statTones;
}) {
  const palette = statTones[tone] ?? statTones.indigo;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent opacity-60',
          palette.accent,
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-2 text-[1.7rem] font-extrabold leading-none tracking-tight text-ink">
            {value}
          </p>
          {hint && <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p>}
        </div>
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', palette.bg, palette.icon)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-400">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1.5">
              {crumb.href ? (
                <Link href={crumb.href} className="transition hover:text-indigo">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-600">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && <span>/</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && (
            <p className="mb-1 text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-indigo">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[1.7rem]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
