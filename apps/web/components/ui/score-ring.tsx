import { cn } from '@/lib/utils';

export function ScoreRing({
  percentage,
  size = 168,
  label,
  tone,
  className,
}: {
  percentage: number;
  size?: number;
  label?: string;
  tone?: 'pass' | 'fail' | 'neutral';
  className?: string;
}) {
  const safe = Math.max(0, Math.min(100, percentage));
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;
  const resolvedTone = tone ?? (safe >= 50 ? 'pass' : 'fail');
  const color = resolvedTone === 'pass' ? '#0D9488' : resolvedTone === 'fail' ? '#F97373' : '#5B5FEF';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EEF1F8"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[2rem] font-extrabold leading-none tracking-tight text-ink">
          {Math.round(safe)}%
        </span>
        {label && <span className="mt-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span>}
      </div>
    </div>
  );
}
