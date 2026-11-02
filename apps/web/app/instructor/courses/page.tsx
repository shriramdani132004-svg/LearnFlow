'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type { CourseSummary, Paginated } from '@/lib/types';
import { Badge, EmptyState, ErrorState, Input, PageHeader, PageSkeleton, StatCard, StatusBadge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn, formatDate } from '@/lib/utils';

type StatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export default function InstructorCoursesPage() {
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ course: CourseSummary; action: 'publish' | 'archive' } | null>(null);
  const router = useRouter();
  const toast = useToast();

  const query = useMemo(
    () => ({
      mine: true,
      page,
      limit: 12,
      search: applied || undefined,
      status: status === 'ALL' ? undefined : status,
    }),
    [page, applied, status],
  );
  const { data, loading, error, refetch } = useApiQuery<Paginated<CourseSummary>>('/courses', query);

  const summary = useApiQuery<Paginated<CourseSummary>>('/courses', { mine: true, limit: 100 });
  const all = summary.data?.data ?? [];
  const courses = data?.data ?? [];

  async function runAction(course: CourseSummary, action: 'publish' | 'archive') {
    setBusy(course.id);
    try {
      await api.post(`/courses/${course.id}/${action}`);
      toast.success(action === 'publish' ? 'Course published.' : 'Course archived.');
      setConfirm(null);
      refetch();
      summary.refetch();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell requiredRoles={['INSTRUCTOR']}>
      <PageHeader
        eyebrow="Instructor studio"
        title="My courses"
        description="Author modules and lessons, publish when ready, and keep an eye on enrolment."
        actions={
          <LinkButton href="/instructor/courses/new/" size="sm">
            <Plus className="h-4 w-4" />
            New course
          </LinkButton>
        }
      />

      {loading && !summary.data ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="All courses" value={all.length} hint="Across every status" icon={BookOpen} tone="indigo" />
            <StatCard label="Published" value={all.filter((course) => course.status === 'PUBLISHED').length} hint="Visible in the catalogue" icon={CheckCircle2} tone="teal" />
            <StatCard label="Drafts" value={all.filter((course) => course.status === 'DRAFT').length} hint="Still being authored" icon={Layers} tone="amber" />
            <StatCard label="Enrolments" value={all.reduce((sum, course) => sum + (course.enrollmentCount ?? 0), 0)} hint="Students across your courses" icon={Users} tone="violet" />
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                setApplied(search.trim());
              }}
              className="relative flex-1 lg:max-w-sm"
            >
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your courses" className="pl-10" />
            </form>
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-canvas p-1">
              {(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as StatusFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => { setStatus(option); setPage(1); }}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[0.7rem] font-bold capitalize transition',
                    status === option ? 'bg-white text-indigo shadow-sm' : 'text-slate-500 hover:text-ink',
                  )}
                >
                  {option === 'ALL' ? 'All' : option.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {courses.length === 0 ? (
            all.length === 0 ? (
              <EmptyState
                className="mt-5"
                icon={BookOpen}
                title="Create your first course"
                description="Start with a title, description and category, then add modules and lessons. Publish when the curriculum is ready."
                action={{ label: 'Create a course', href: '/instructor/courses/new/' }}
              />
            ) : (
              <EmptyState className="mt-5" icon={Search} title="No courses match" description="Try a different search term or status filter." />
            )
          ) : (
            <div className="mt-5 space-y-3">
              {courses.map((course) => (
                <div key={course.id} className="flex flex-col gap-4 rounded-2xl border border-white bg-white p-4 shadow-card sm:p-5 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-violet text-white sm:flex">
                      <BookOpen className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={course.status} />
                        <Badge tone="slate">{course.level}</Badge>
                        <Badge tone="indigo">{course.category}</Badge>
                      </div>
                      <Link href={`/instructor/courses/view/?id=${course.id}`} className="mt-1.5 block truncate text-sm font-extrabold text-ink hover:text-indigo">
                        {course.title}
                      </Link>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{course.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.65rem] font-medium text-slate-400">
                        <span>{course.moduleCount ?? 0} modules</span>
                        <span>{course.enrollmentCount ?? 0} enrolled</span>
                        <span>{course.assessmentCount ?? 0} assessments</span>
                        <span>Updated {formatDate(course.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <LinkButton href={`/instructor/courses/view/?id=${course.id}`} size="sm" variant="secondary">
                      <Layers className="h-4 w-4" />
                      Manage
                    </LinkButton>
                    <Link href={`/courses/view/?id=${course.id}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-500 transition hover:bg-canvas hover:text-indigo">
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Link>
                    {course.status === 'DRAFT' && (
                      <Button size="sm" onClick={() => setConfirm({ course, action: 'publish' })}>
                        Publish
                      </Button>
                    )}
                    {course.status === 'PUBLISHED' && (
                      <Button size="sm" variant="ghost" onClick={() => setConfirm({ course, action: 'archive' })}>
                        <Archive className="h-4 w-4" />
                        Archive
                      </Button>
                    )}
                    {course.status !== 'ARCHIVED' && (
                      <Link href={`/instructor/students/?course=${course.id}`} className="inline-flex h-9 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-slate-400 transition hover:text-indigo" title="View roster">
                        <Users className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              <Pagination meta={data?.meta} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && runAction(confirm.course, confirm.action)}
        title={confirm?.action === 'publish' ? 'Publish this course?' : 'Archive this course?'}
        description={
          confirm?.action === 'publish'
            ? 'Publishing makes the course visible in the catalogue and allows students to enrol. It must contain at least one lesson.'
            : 'Archiving hides the course from the catalogue. Existing enrolments and results are preserved.'
        }
        confirmLabel={confirm?.action === 'publish' ? 'Publish course' : 'Archive course'}
        tone={confirm?.action === 'publish' ? 'primary' : 'danger'}
        loading={Boolean(busy)}
      />
    </AppShell>
  );
}
