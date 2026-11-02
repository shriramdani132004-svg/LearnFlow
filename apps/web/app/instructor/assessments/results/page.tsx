'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle2,
  Download,
  FileQuestion,
  Filter,
  Search,
  Send,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type {
  AssessmentAttemptRow,
  AssessmentReport,
  AssessmentSummary,
  Paginated,
} from '@/lib/types';
import {
  Badge,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  Select,
  StatCard,
  StatusBadge,
} from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DistributionChart, TopicBarChart, TrendAreaChart } from '@/components/ui/charts';
import { formatDateTime, percent } from '@/lib/utils';

export default function AssessmentResultsPage() {
  const assessmentId = useQueryParam('id');
  const toast = useToast();

  const report = useApiQuery<AssessmentReport>(assessmentId ? `/assessments/${assessmentId}/report` : null);
  const detail = useApiQuery<AssessmentSummary>(assessmentId ? `/assessments/${assessmentId}` : null);

  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState('');
  const [page, setPage] = useState(1);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const query = useMemo(
    () => ({
      page,
      limit: 15,
      search: applied || undefined,
      status: status || undefined,
      result: result || undefined,
    }),
    [page, applied, status, result],
  );
  const attempts = useApiQuery<Paginated<AssessmentAttemptRow>>(
    assessmentId ? `/assessments/${assessmentId}/attempts` : null,
    query,
  );

  async function release() {
    if (!assessmentId) return;
    setReleasing(true);
    try {
      await api.post(`/assessments/${assessmentId}/release-results`);
      toast.success('Results released. Students can now see their scores.');
      setReleaseOpen(false);
      report.refetch();
      detail.refetch();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setReleasing(false);
    }
  }

  async function downloadCsv() {
    if (!assessmentId || !report.data) return;
    setDownloading(true);
    try {
      const slug = report.data.assessment.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 50);
      await api.download(`/assessments/${assessmentId}/report.csv`, `${slug || 'assessment'}-results.csv`);
      toast.success('CSV report downloaded.');
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setDownloading(false);
    }
  }

  if (!assessmentId) {
    return (
      <AppShell requiredRoles={['INSTRUCTOR']}>
        <ErrorState message="No assessment selected. Open an assessment report from the assessment studio." />
      </AppShell>
    );
  }

  const showRelease =
    detail.data &&
    detail.data.published &&
    !detail.data.showResultsImmediately &&
    !detail.data.resultsReleasedAt;

  return (
    <AppShell requiredRoles={['INSTRUCTOR']}>
      <PageHeader
        breadcrumbs={[
          { label: 'Assessments', href: '/instructor/assessments/' },
          { label: report.data?.assessment.title ?? 'Results', href: assessmentId ? `/instructor/assessments/view/?id=${assessmentId}` : undefined },
          { label: 'Results' },
        ]}
        eyebrow="Assessment report"
        title={report.data?.assessment.title ?? 'Assessment results'}
        description="Live scores, question accuracy and attempt outcomes from real student submissions."
        actions={
          <>
            {showRelease && (
              <Button size="sm" variant="teal" onClick={() => setReleaseOpen(true)}>
                <Send className="h-4 w-4" />
                Release results
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={downloadCsv} loading={downloading}>
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
            <LinkButton href={`/instructor/assessments/view/?id=${assessmentId}`} size="sm" variant="ghost">
              Manage
            </LinkButton>
          </>
        }
      />

      {report.loading && !report.data ? (
        <PageSkeleton />
      ) : report.error || !report.data ? (
        <ErrorState message={report.error ?? 'Report unavailable.'} onRetry={report.refetch} />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-white bg-white px-4 py-3 shadow-card">
            <Badge tone={report.data.assessment.published ? 'teal' : 'amber'}>
              {report.data.assessment.published ? 'Published' : 'Draft'}
            </Badge>
            <Badge tone="indigo">{report.data.assessment.course.title}</Badge>
            <span className="text-[0.68rem] text-slate-400">
              {report.data.assessment.totalQuestions} served questions · {report.data.assessment.totalMarks} marks · pass {report.data.assessment.passPercentage}%
            </span>
            {detail.data && !detail.data.showResultsImmediately && (
              <Badge tone={detail.data.resultsReleasedAt ? 'teal' : 'coral'} className="ml-auto">
                {detail.data.resultsReleasedAt ? 'Results released' : 'Results held'}
              </Badge>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Final attempts" value={report.data.totals.completed} hint={`${report.data.totals.uniqueStudents} unique students`} icon={Users} tone="indigo" />
            <StatCard label="Average score" value={percent(report.data.scores.average)} hint={`Median ${percent(report.data.scores.median)}`} icon={BarChart3} tone="teal" />
            <StatCard label="Pass rate" value={percent(report.data.scores.passRate)} hint={`${report.data.totals.passed} passed · ${report.data.totals.failed} failed`} icon={Trophy} tone="amber" />
            <StatCard label="In progress" value={report.data.totals.inProgress} hint={`${report.data.totals.completionRate === null ? 'No' : report.data.totals.completionRate + '%'} completion`} icon={Target} tone="violet" />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">Score distribution</p>
                  <p className="mt-0.5 text-xs text-slate-400">Completed attempts grouped into ten-point bands</p>
                </div>
                <Badge tone="slate">{report.data.totals.completed} graded</Badge>
              </div>
              {report.data.totals.completed > 0 ? (
                <div className="mt-4">
                  <DistributionChart data={report.data.scores.distribution} />
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-canvas px-4 py-10 text-center text-sm text-slate-400">
                  Scores appear after students submit and attempts are graded.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">Recent score trend</p>
                  <p className="mt-0.5 text-xs text-slate-400">Last twelve graded submissions</p>
                </div>
                <BarChart3 className="h-4 w-4 text-slate-300" />
              </div>
              {report.data.trend.length > 0 ? (
                <div className="mt-4">
                  <TrendAreaChart
                    data={report.data.trend.map((point) => ({
                      label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(point.submittedAt)),
                      value: Math.round(point.percentage),
                    }))}
                  />
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-canvas px-4 py-10 text-center text-sm text-slate-400">
                  The trend builds as graded attempts come in.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">Topic accuracy</p>
                  <p className="mt-0.5 text-xs text-slate-400">Correct responses across all graded attempts</p>
                </div>
                <Target className="h-4 w-4 text-slate-300" />
              </div>
              {report.data.topics.length > 0 ? (
                <>
                  <div className="mt-4">
                    <TopicBarChart data={report.data.topics.slice(0, 8).map((topic) => ({ name: topic.topic, value: Math.round(topic.accuracy ?? 0) }))} />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {report.data.topics.map((topic) => (
                      <div key={topic.topic} className="rounded-xl bg-canvas px-3 py-2">
                        <div className="flex items-center justify-between gap-2 text-[0.68rem]">
                          <span className="truncate font-semibold text-slate-600">{topic.topic}</span>
                          <span className="shrink-0 font-bold text-ink">{percent(topic.accuracy)}</span>
                        </div>
                        <ProgressBar value={topic.accuracy ?? 0} tone={(topic.accuracy ?? 0) >= 70 ? 'teal' : (topic.accuracy ?? 0) >= 40 ? 'amber' : 'coral'} className="mt-1.5" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-4 rounded-xl bg-canvas px-4 py-10 text-center text-sm text-slate-400">
                  Topic accuracy appears after the first graded attempt.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">Question performance</p>
                  <p className="mt-0.5 text-xs text-slate-400">Lowest accuracy first, with unanswered counts</p>
                </div>
                <FileQuestion className="h-4 w-4 text-slate-300" />
              </div>
              {report.data.questions.length > 0 ? (
                <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {report.data.questions.map((question, index) => (
                    <div key={question.questionId} className="rounded-xl border border-slate-100 p-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-canvas text-[0.6rem] font-bold text-slate-500">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs font-semibold leading-5 text-ink">{question.questionText}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.62rem] text-slate-400">
                            <Badge tone="indigo">{question.topic}</Badge>
                            <span>{question.correct}/{question.attempts} correct</span>
                            {question.unanswered > 0 && <span className="text-amber">{question.unanswered} unanswered</span>}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <ProgressBar value={question.accuracy ?? 0} tone={(question.accuracy ?? 0) >= 70 ? 'teal' : (question.accuracy ?? 0) >= 40 ? 'amber' : 'coral'} className="flex-1" />
                            <span className="w-10 text-right text-[0.62rem] font-bold text-ink">{percent(question.accuracy)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-canvas px-4 py-10 text-center text-sm text-slate-400">
                  Question performance appears after grading.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white bg-white p-5 shadow-card">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-ink">Student attempts</p>
                <p className="mt-0.5 text-xs text-slate-400">Every attempt, including in-progress sessions. Scores are server-authoritative.</p>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setPage(1);
                  setApplied(search.trim());
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student" className="pl-10 sm:w-52" />
                </div>
                <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter by status" className="sm:w-40">
                  <option value="">Any status</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="GRADED">Graded</option>
                  <option value="TIMED_OUT">Timed out</option>
                  <option value="SUBMITTED">Submitted</option>
                </Select>
                <Select value={result} onChange={(event) => { setResult(event.target.value); setPage(1); }} aria-label="Filter by result" className="sm:w-36">
                  <option value="">Any result</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                </Select>
                <Button type="submit" size="sm" variant="secondary">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </form>
            </div>

            {attempts.loading && !attempts.data ? (
              <div className="mt-4 space-y-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-canvas" />)}</div>
            ) : attempts.error ? (
              <ErrorState className="mt-4" message={attempts.error} onRetry={attempts.refetch} />
            ) : (attempts.data?.data.length ?? 0) === 0 ? (
              <EmptyState className="mt-4" icon={Users} title="No attempts yet" description="Attempts will appear here as soon as enrolled students start this assessment." />
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">
                        <th className="pb-2 pr-4">Student</th>
                        <th className="pb-2 pr-4">Attempt</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2 pr-4">Score</th>
                        <th className="pb-2 pr-4">Percentage</th>
                        <th className="pb-2 pr-4">Outcome</th>
                        <th className="pb-2">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {attempts.data?.data.map((attempt) => (
                        <tr key={attempt.id}>
                          <td className="py-3 pr-4">
                            <p className="font-bold text-ink">{attempt.student.name}</p>
                            <p className="text-[0.65rem] text-slate-400">{attempt.student.email}</p>
                          </td>
                          <td className="py-3 pr-4 font-semibold text-slate-600">#{attempt.attemptNumber}</td>
                          <td className="py-3 pr-4"><StatusBadge status={attempt.status} /></td>
                          <td className="py-3 pr-4 font-semibold text-ink">
                            {attempt.score === null || attempt.score === undefined ? '—' : attempt.score}
                          </td>
                          <td className="py-3 pr-4 font-bold text-ink">{percent(attempt.percentage)}</td>
                          <td className="py-3 pr-4">
                            {attempt.passed === null || attempt.passed === undefined ? (
                              <Badge tone="slate">Pending</Badge>
                            ) : (
                              <Badge tone={attempt.passed ? 'teal' : 'coral'}>{attempt.passed ? 'Passed' : 'Failed'}</Badge>
                            )}
                          </td>
                          <td className="py-3 text-slate-500">{attempt.submittedAt ? formatDateTime(attempt.submittedAt) : 'Not submitted'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination meta={attempts.data?.meta} onPageChange={setPage} />
              </>
            )}
          </div>

          {detail.data && !detail.data.showResultsImmediately && detail.data.resultsReleasedAt && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-teal/20 bg-softteal/40 p-4 text-xs leading-5 text-teal">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Results were released on {formatDateTime(detail.data.resultsReleasedAt)}. Students can review their scores
              {detail.data.allowAnswerReview ? ' and answers.' : '.'}
            </div>
          )}
          {detail.data && !detail.data.showResultsImmediately && !detail.data.resultsReleasedAt && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber/20 bg-amber-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[#92400E]">
                Scores are held from students until you release results. Grading still happens automatically.
              </p>
              <Button size="sm" variant="teal" onClick={() => setReleaseOpen(true)}>
                <Send className="h-4 w-4" />
                Release results
              </Button>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link href="/instructor/assessments/" className="text-xs font-semibold text-slate-400 transition hover:text-indigo">
              Back to assessment studio
            </Link>
          </div>
        </>
      )}

      <ConfirmDialog
        open={releaseOpen}
        onClose={() => setReleaseOpen(false)}
        onConfirm={release}
        loading={releasing}
        title="Release results to students?"
        description="Every graded attempt becomes visible in student history and analytics. This cannot be undone."
        confirmLabel="Release results"
        tone="primary"
      />
    </AppShell>
  );
}
