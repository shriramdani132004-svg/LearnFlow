'use client';

import { BookOpen, ClipboardCheck, GraduationCap, Sparkles, Trophy } from 'lucide-react';
import type { ActivityEvent } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

const iconFor = (type: string) => {
  if (type.includes('ASSESSMENT') || type.includes('ATTEMPT')) return ClipboardCheck;
  if (type.includes('COURSE') || type.includes('LESSON')) return BookOpen;
  if (type.includes('ENROLL')) return GraduationCap;
  if (type.includes('ROLE') || type.includes('USER')) return Sparkles;
  return Trophy;
};

export function ActivityFeed({
  events,
  emptyLabel = 'No activity yet.',
  compact = false,
}: {
  events: ActivityEvent[];
  emptyLabel?: string;
  compact?: boolean;
}) {
  if (!events.length) {
    return <p className="py-6 text-center text-sm text-slate-400">{emptyLabel}</p>;
  }

  return (
    <ul className={compact ? 'space-y-3' : 'divide-y divide-slate-50'}>
      {events.map((event) => {
        const Icon = iconFor(event.type);
        return (
          <li key={event.id} className={compact ? 'flex items-start gap-3' : 'flex items-start gap-3 py-3.5 first:pt-0 last:pb-0'}>
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lavender text-indigo">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-5 text-ink">{event.message}</p>
              <p className="mt-0.5 text-[0.68rem] text-slate-400">
                {event.user?.name ? `${event.user.name} · ` : ''}
                {formatDateTime(event.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
