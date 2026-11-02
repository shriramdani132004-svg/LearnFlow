'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap, PlayCircle, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery } from '@/hooks/use-api';
import type { MyEnrollment } from '@/lib/types';
import {
  Badge,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  StatCard,
} from '@/components/ui/primitives';
import { LinkButton } from '@/components/ui/link-button';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Filter = 'ALL' | 'ACTIVE' | 'COMPLETED';

export default function MyCoursesPage() {
  const { data, loading, error, refetch } = useApiQuery<{ data: MyEnrollment[] }>('/enrollments/me');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  const enrollments = data?.data ?? [];
  const filtered = enrollments.filter((item) => {
    const matchesSearch =
      !search.trim() ||
      item.course.title.toLowerCase().includes(search.toLowerCase()) ||
      item.course.category.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || item.status === filter;
    return matchesSearch && matchesFilter;
  });

  const active = enrollments.filter((item) => item.status === 'ACTIVE').length;
  const completed = enrollments.filter((item) => item.status === 'COMPLETED').length;
  const lessonsDone = enrollments.reduce((sum, item) => sum + item.completedLessons, 0);
  const averageProgress = enrollments.length
    ? Math.round(enrollments.reduce((sum, item) => sum + item.progressPercentage, 0) / enrollments.length)
    : 0;

  return (
    <AppShell requiredRoles={['STUDENT']}>
      <PageHeader
        eyebrow="My learning"
        title="Your courses"
        description="Every course you are enrolled in, with live lesson progress."
        actions={<LinkButton href="/courses/" size="sm">Find another course</LinkButton>}
      />

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Courses" value={enrollments.length} hint={`${active} in progress`} icon={BookOpen} tone="indigo" />
            <StatCard label="Completed" value={completed} hint="Finished all published lessons" icon={GraduationCap} tone="teal" />
            <StatCard label="Lessons completed" value={lessonsDone} hint="Across every enrolment" icon={PlayCircle} tone="amber" />
            <StatCard label="Average progress" value={`${averageProgress}%`} hint="Across your courses" icon={ArrowRight} tone="violet" />
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your courses" className="pl-10" />
            </div>
            <div className="flex gap-1.5 rounded-xl bg-canvas p-1">
              {(['ALL', 'ACTIVE', 'COMPLETED'] as Filter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-bold transition',
                    filter === option ? 'bg-white text-indigo shadow-sm' : 'text-slate-500 hover:text-ink',
                  )}
                >
                  {option === 'ALL' ? 'All' : option === 'ACTIVE' ? 'In progress' : 'Completed'}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            enrollments.length === 0 ? (
              <EmptyState
                className="mt-5"
                icon={BookOpen}
                title="Your learning shelf is empty"
                description="Enrol in a published course to unlock lessons, assessments and progress tracking."
                action={{ label: 'Browse courses', href: '/courses/' }}
              />
            ) : (
              <EmptyState className="mt-5" icon={Search} title="No courses match" description="Try a different search term or filter." />
            )
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((enrollment) => (
                <div key={enrollment.id} className="flex flex-col overflow-hidden rounded-2xl border border-white bg-white shadow-card">
                  <div className="relative h-28 overflow-hidden bg-gradient-to-br from-indigo via-[#7679F5] to-violet p-5">
                    <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-white/65">{enrollment.course.category}</p>
                        <h2 className="mt-1 line-clamp-2 text-base font-extrabold leading-5 text-white">{enrollment.course.title}</h2>
                      </div>
                      <Badge tone={enrollment.status === 'COMPLETED' ? 'teal' : 'amber'}>
                        {enrollment.status === 'COMPLETED' ? 'Completed' : 'In progress'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[0.68rem] text-slate-400">
                      {enrollment.course.instructor.name} · enrolled {formatDate(enrollment.enrolledAt)}
                    </p>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>{enrollment.completedLessons} of {enrollment.totalLessons} lessons</span>
                        <span className="text-ink">{enrollment.progressPercentage}%</span>
                      </div>
                      <ProgressBar value={enrollment.progressPercentage} tone={enrollment.progressPercentage >= 100 ? 'teal' : 'indigo'} className="mt-2" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {enrollment.course.modules.slice(0, 3).map((module) => (
                        <span key={module.id} className="rounded-full bg-canvas px-2.5 py-1 text-[0.62rem] font-semibold text-slate-500">
                          {module.lessons.length} lessons
                        </span>
                      ))}
                      {enrollment.course.modules.length > 3 && (
                        <span className="rounded-full bg-canvas px-2.5 py-1 text-[0.62rem] font-semibold text-slate-400">
                          +{enrollment.course.modules.length - 3} modules
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-5">
                      <LinkButton href={`/learn/?course=${enrollment.course.id}`} size="sm" className="flex-1">
                        <PlayCircle className="h-4 w-4" />
                        {enrollment.progressPercentage >= 100 ? 'Revisit lessons' : 'Continue'}
                      </LinkButton>
                      <Link href={`/courses/view/?id=${enrollment.course.id}`} className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo/30 hover:text-indigo">
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
