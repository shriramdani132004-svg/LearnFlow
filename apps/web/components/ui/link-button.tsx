import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'teal' | 'light';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-indigo text-white shadow-[0_10px_24px_-12px_rgba(91,95,239,0.85)] hover:bg-indigo-600',
  secondary:
    'border border-indigo/20 bg-white text-indigo hover:border-indigo/40 hover:bg-indigo-50',
  ghost: 'text-slate-600 hover:bg-lavender hover:text-indigo',
  dark: 'bg-ink text-white hover:bg-[#1f3268]',
  teal: 'bg-teal text-white shadow-[0_10px_24px_-12px_rgba(13,148,136,0.8)] hover:bg-teal-600',
  light: 'bg-white/15 text-white ring-1 ring-inset ring-white/25 hover:bg-white/25',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[0.8rem] gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[0.95rem] gap-2 rounded-xl',
};

export function LinkButton({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className,
  prefetch,
  target,
  title,
  onClick,
  'aria-label': ariaLabel,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  prefetch?: boolean;
  target?: string;
  title?: string;
  onClick?: () => void;
  'aria-label'?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo/20',
        variants[variant],
        sizes[size],
        className,
      )}
      prefetch={prefetch}
      target={target}
      title={title}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
