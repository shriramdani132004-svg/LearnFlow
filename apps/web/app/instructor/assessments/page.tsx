'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FileQuestion,
  Plus,
  Search,
  Send,
  Timer,
  Trash2,
  Undo2,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type { AssessmentSummary, CourseSummary, Paginated } from '@/lib/types';
import { Badge, EmptyState, ErrorState, Input, PageHeader, PageSkeleton, Select, StatCard, StatusBadge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn, formatDateTime } from '@/lib/utils';

type Action = 'publish' | 'unpublish' | 'release' | 'delete';

export default function InstructorAssessmentsPage() {
  const courseParam = useQueryParam('course');
  const router = useRouter();
  const toast = useToast();
  const [courseId, setCourseId] = useState('');
  const [status, setStatus] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ assessment: AssessmentSummary; action: Action } | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (courseParam) setCourseId(courseParam);
  }, [courseParam]);

  const courses = useApiQuery<Paginated<CourseSummary>>('/courses', { mine: true, limit: 100 });
  const query = useMemo(
    () => ({
      page,
      limit: 12,
      courseId: courseId || undefined,
      status: status === 'ALL' ? undefined : status,
      search: applied || undefined,
    }),
    [page, courseId, status, applied],
  );
  const { data, loading, error, refetch } = useApiQuery<Paginated<AssessmentSummary>>('/assessments', query);
  const all = useApiQuery<Paginated<AssessmentSummary>>('/assessments', { limit: 100 });
  const assessments = data?.data ?? [];
  const allAssessments = all.data?.data ?? [];

  const stats = {
    total: all.data?.meta.total ?? 0,
    published: allAssessments.filter((item) => item.published).length,
    attempts: allAssessments.reduce((sum, item) => sum + (item.attemptCount ?? 0), 0),
    awaitingRelease: allAssessments.filter((item) => item.published && !item.showResultsImmediately && !item.resultsReleasedAt).length,
  };

  async function perform() {
    if (!confirm) return;
    setWorking(true);
    try {
      const { assessment, action } = confirm;
      if (action === 'delete') {
        await api.delete(`/assessments/${assessment.id}`);
        toast.success('Assessment deleted.');
      } else {
        await api.post(`/assessments/${assessment.id}/${action === 'release' ? 'release-results' : action}`);
        toast.success(
          action === 'publish' ? 'Assessment published.' : action === 'unpublish' ? 'Assessment moved to draft.' : 'Results released to students.',
        );
      }
      setConfirm(null);
      refetch();
      all.refetch();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setWorking(false);
    }
  }

  return (
    <AppShell requiredRoles={['INSTRUCTOR']}>
      <PageHeader
        eyebrow="Assessment studio"
        title="Assessments"
        description="Build timed assessments from your question pool, control availability and release results."
        actions={<LinkButton href="/instructor/assessments/new/" size="sm"><Plus className="h-4 w-4" />New assessment</LinkButton>}
      />

      {loading && !all.data ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Assessments" value={stats.total} hint={`${stats.published} published`} icon={ClipboardList} tone="indigo" />
            <StatCard label="Attempts" value={stats.attempts} hint="Across all assessments" icon={Users} tone="teal" />
            <StatCard label="Awaiting release" value={stats.awaitingRelease} hint="Results held back from students" icon={Timer} tone="amber" />
            <StatCard label="Question bank" value={allAssessments.reduce((sum, item) => sum + (item.poolSize ?? 0), 0)} hint="Questions in assessment pools" icon={FileQuestion} tone="violet" />
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <form onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied(search.trim()); }} className="relative flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assessments" className="pl-10" />
              </form>
              <Select value={courseId} onChange={(event) => { setCourseId(event.target.value); setPage(1); }} aria-label="Filter by course" className="sm:w-56">
                <option value="">All courses</option>
                {(courses.data?.data ?? []).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </Select>
            </div>
            <div className="flex gap-1.5 rounded-xl bg-canvas p-1">
              {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map((option) => (
                <button key={option} type="button" onClick={() => { setStatus(option); setPage(1); }} className={cn('rounded-lg px-3 py-1.5 text-[0.7rem] font-bold transition', status === option ? 'bg-white text-indigo shadow-sm' : 'text-slate-500 hover:text-ink')}>
                  {option === 'ALL' ? 'All' : option === 'PUBLISHED' ? 'Published' : 'Drafts'}
                </button>
              ))}
            </div>
          </div>

          {assessments.length === 0 ? (
            allAssessments.length === 0 ? (
              <EmptyState
                className="mt-5"
                icon={ClipboardList}
                title="No assessments yet"
                description="Add questions to a course, then assemble them into a timed assessment with randomised order and a server deadline."
                action={{ label: 'Create an assessment', href: '/instructor/assessments/new/' }}
              />
            ) : (
              <EmptyState className="mt-5" icon={Search} title="No assessments match" description="Try a different course or status filter." />
            )
          ) : (
            <div className="mt-5 space-y-3">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="rounded-2xl border border-white bg-white p-4 shadow-card sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={assessment.published ? 'teal' : 'amber'}>{assessment.published ? 'Published' : 'Draft'}</Badge>
                        {assessment.published && !assessment.showResultsImmediately && (
                          <Badge tone={assessment.resultsReleasedAt ? 'indigo' : 'coral'}>{assessment.resultsReleasedAt ? 'Results released' : 'Results held'}</Badge>
                        )}
                        <span className="text-[0.65rem] text-slate-400">{assessment.course.title}</span>
                      </div>
                      <Link href={`/instructor/assessments/view/?id=${assessment.id}`} className="mt-1.5 block text-sm font-extrabold text-ink hover:text-indigo">
                        {assessment.title}
                      </Link>
                      {assessment.description && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{assessment.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.65rem] font-medium text-slate-400">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{assessment.durationMinutes} min</span>
                        <span className="inline-flex items-center gap-1"><FileQuestion className="h-3 w-3" />{assessment.totalQuestions} questions</span>
                        <span className="inline-flex items-center gap-1"><BarChart3 className="h-3 w-3" />{assessment.attemptCount ?? 0} attempts</span>
                        <span>{assessment.totalMarks} marks · pass {assessment.passPercentage}%</span>
                        {assessment.availableUntil && <span>Closes {formatDateTime(assessment.availableUntil)}</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <LinkButton href={`/instructor/assessments/results/?id=${assessment.id}`} size="sm" variant="secondary">
                        <BarChart3 className="h-4 w-4" />
                        Results
                      </LinkButton>
                      <Link href={`/instructor/assessments/view/?id=${assessment.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-500 transition hover:bg-canvas hover:text-indigo">
                        <Eye className="h-3.5 w-3.5" />
                        Manage
                      </Link>
                      {assessment.published ? (
                        <Button size="sm" variant="ghost" onClick={() => setConfirm({ assessment, action: 'unpublish' })}>
                          <Undo2 className="h-4 w-4" />
                          Unpublish
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => setConfirm({ assessment, action: 'publish' })}>
                          <CheckCircle2 className="h-4 w-4" />
                          Publish
                        </Button>
                      )}
                      {assessment.published && !assessment.showResultsImmediately && !assessment.resultsReleasedAt && (
                        <Button size="sm" variant="teal" onClick={() => setConfirm({ assessment, action: 'release' })}>
                          <Send className="h-4 w-4" />
                          Release
                        </Button>
                      )}
                      <button type="button" onClick={() => setConfirm({ assessment, action: 'delete' })} className="rounded-lg p-2 text-slate-400 transition hover:bg-softcoral hover:text-coral" title="Delete assessment" aria-label="Delete assessment">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
        onConfirm={perform}
        loading={working}
        title={
          confirm?.action === 'publish' ? 'Publish this assessment?' :
          confirm?.action === 'unpublish' ? 'Move assessment to draft?' :
          confirm?.action === 'release' ? 'Release results to students?' : 'Delete this assessment?'
        }
        description={
          confirm?.action === 'publish' ? 'Students enrolled in the course will be able to start attempts during the availability window.' :
          confirm?.action === 'unpublish' ? 'The assessment will disappear from student views. Attempts already made are preserved.' :
          confirm?.action === 'release' ? 'All graded attempts become visible to students, including scores and answer review where enabled.' :
          'Deletion is refused if any attempts exist. Unpublish instead to stop new attempts.'
        }
        confirmLabel={
          confirm?.action === 'publish' ? 'Publish' :
          confirm?.action === 'unpublish' ? 'Unpublish' :
          confirm?.action === 'release' ? 'Release results' : 'Delete assessment'
        }
        tone={confirm?.action === 'publish' || confirm?.action === 'release' ? 'primary' : 'danger'}
      />
    </AppShell>
  );
}
