import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal' | 'dark';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-indigo text-white shadow-[0_10px_24px_-12px_rgba(91,95,239,0.85)] hover:bg-indigo-600 active:bg-indigo-700',
  secondary:
    'border border-indigo/20 bg-white text-indigo hover:border-indigo/40 hover:bg-indigo-50',
  ghost: 'text-slate-600 hover:bg-lavender hover:text-indigo',
  danger: 'bg-coral text-white shadow-[0_10px_24px_-12px_rgba(249,115,115,0.8)] hover:bg-[#ef5f5f]',
  teal: 'bg-teal text-white shadow-[0_10px_24px_-12px_rgba(13,148,136,0.8)] hover:bg-teal-600',
  dark: 'bg-ink text-white hover:bg-[#1f3268]',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[0.8rem] gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[0.95rem] gap-2 rounded-xl',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo/20 disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
