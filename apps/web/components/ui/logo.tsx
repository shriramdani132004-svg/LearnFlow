import { cn } from '@/lib/utils';

export function LearnFlowMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('h-10 w-10', className)}
      fill="none"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="14" fill="#5B5FEF" />
      <path
        d="M12 16.5C12 14.57 13.57 13 15.5 13H33L29.5 18H17V23.5H25.5L22 28H17V32H33.5L30 36.5H15.5C13.57 36.5 12 34.93 12 33V16.5Z"
        fill="white"
      />
      <circle cx="34" cy="15.5" r="3.5" fill="#0D9488" />
      <circle cx="14" cy="34" r="3" fill="#F59E0B" />
    </svg>
  );
}

export function Logo({
  variant = 'dark',
  compact = false,
}: {
  variant?: 'dark' | 'light';
  compact?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LearnFlowMark className={compact ? 'h-8 w-8' : 'h-10 w-10'} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'text-[1.35rem] font-extrabold tracking-tight',
            variant === 'dark' ? 'text-ink' : 'text-white',
          )}
        >
          Learn<span className={variant === 'dark' ? 'text-indigo' : 'text-[#B9BBFF]'}>Flow</span>
        </span>
        {!compact && (
          <span
            className={cn(
              'mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.22em]',
              variant === 'dark' ? 'text-slate-400' : 'text-white/50',
            )}
          >
            Learn · Practice · Grow
          </span>
        )}
      </span>
    </span>
  );
}
