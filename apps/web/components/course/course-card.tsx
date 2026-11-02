'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Layers, Users } from 'lucide-react';
import type { CourseSummary } from '@/lib/types';
import { Badge, ProgressBar } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const levelTone: Record<string, string> = {
  Beginner: 'bg-softteal text-teal',
  Intermediate: 'bg-amber-50 text-[#B45309]',
  Advanced: 'bg-softcoral text-[#C2410C]',
};

export function CourseCard({
  course,
  progress,
  href,
  showStatus = false,
  footer,
  className,
}: {
  course: CourseSummary;
  progress?: number;
  href?: string;
  showStatus?: boolean;
  footer?: React.ReactNode;
  className?: string;
}) {
  const target = href ?? `/courses/view/?id=${course.id}`;
  const palette = (course.category?.length ?? 0) % 3;
  const gradients = [
    'from-indigo via-[#7679F5] to-violet',
    'from-teal via-[#25B3A6] to-sky',
    'from-[#F59E0B] via-[#F97373] to-violet',
  ];

  return (
    <div className={cn('group flex h-full flex-col overflow-hidden rounded-2xl border border-white bg-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-lift', className)}>
      <Link href={target} className="block">
        <div className={cn('relative h-40 overflow-hidden bg-gradient-to-br', gradients[palette])}>
          {course.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15" />
              <div className="absolute -bottom-12 left-10 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute inset-0 flex items-center justify-between p-5">
                <div>
                  <p className="text-[0.64rem] font-extrabold uppercase tracking-[0.18em] text-white/70">
                    {course.category}
                  </p>
                  <p className="mt-1.5 max-w-[15rem] text-lg font-extrabold leading-6 text-white">
                    {course.title}
                  </p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-inset ring-white/25">
                  <BookOpen className="h-5 w-5" />
                </span>
              </div>
            </>
          )}
          <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
            <span className={cn('rounded-full px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-wide', levelTone[course.level] ?? 'bg-white/90 text-ink')}>
              {course.level}
            </span>
            {showStatus && (
              <Badge tone={course.status === 'PUBLISHED' ? 'teal' : course.status === 'DRAFT' ? 'amber' : 'slate'}>
                {course.status}
              </Badge>
            )}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-2 text-sm leading-6 text-slate-500">{course.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.7rem] font-semibold text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {course.moduleCount ?? 0} modules
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {course.enrollmentCount ?? 0} enrolled
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {course.assessmentCount ?? 0} assessments
          </span>
        </div>

        {progress !== undefined && (
          <div className="mt-4">
            <ProgressBar value={progress} showLabel tone={progress >= 100 ? 'teal' : 'indigo'} />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-ink">{course.instructor?.name}</p>
            <p className="text-[0.65rem] text-slate-400">Instructor</p>
          </div>
          {footer ?? (
            <Link
              href={target}
              className="inline-flex items-center gap-1 rounded-xl bg-lavender px-3 py-2 text-xs font-bold text-indigo transition group-hover:bg-indigo group-hover:text-white"
            >
              View
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
