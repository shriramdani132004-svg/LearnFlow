'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Flame,
  Lock,
  PlayCircle,
  RotateCcw,
  Search,
  Timer,
  Trophy,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type { AvailableAssessment } from '@/lib/types';
import { Badge, EmptyState, ErrorState, Input, PageHeader, PageSkeleton, StatCard } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { formatDateTime, percent } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Tab = 'OPEN' | 'UPCOMING' | 'CLOSED' | 'ALL';

export default function AssessmentsPage() {
  const { data, loading, error, refetch } = useApiQuery<{ data: AvailableAssessment[] }>('/assessments/available');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('OPEN');
  const [startingId, setStartingId] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const assessments = data?.data ?? [];
  const filtered = useMemo(
    () =>
      assessments.filter((item) => {
        const matchesSearch =
          !search.trim() ||
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.course.title.toLowerCase().includes(search.toLowerCase());
        const matchesTab = tab === 'ALL' || item.windowState === tab;
        return matchesSearch && matchesTab;
      }),
    [assessments, search, tab],
  );

  const counts = {
    OPEN: assessments.filter((item) => item.windowState === 'OPEN').length,
    UPCOMING: assessments.filter((item) => item.windowState === 'UPCOMING').length,
    CLOSED: assessments.filter((item) => item.windowState === 'CLOSED').length,
    ALL: assessments.length,
  };
  const completed = assessments.filter((item) => item.attemptsUsed > 0).length;

  async function start(assessment: AvailableAssessment) {
    if (assessment.inProgressAttemptId) {
      router.push(`/exam/?attempt=${assessment.inProgressAttemptId}`);
      return;
    }
    setStartingId(assessment.id);
    try {
      const attempt = await api.post<{ id: string }>(`/assessments/${assessment.id}/attempts`);
      router.push(`/exam/?attempt=${attempt.id}`);
    } catch (caught) {
      toast.error(errorMessage(caught));
      refetch();
    } finally {
      setStartingId(null);
    }
  }

  return (
    <AppShell requiredRoles={['STUDENT']}>
      <PageHeader
        eyebrow="Assessments"
        title="Test your understanding"
        description="Timed assessments from your enrolled courses. Answers save automatically while you work."
        actions={<Link href="/history/" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo/20 bg-white px-3.5 text-[0.8rem] font-semibold text-indigo transition hover:bg-indigo-50"><RotateCcw className="h-4 w-4" />Attempt history</Link>}
      />

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Open now" value={counts.OPEN} hint="Can be started or resumed" icon={PlayCircle} tone="teal" />
            <StatCard label="Upcoming" value={counts.UPCOMING} hint="Not open yet" icon={CalendarClock} tone="amber" />
            <StatCard label="Closed" value={counts.CLOSED} hint="Availability window ended" icon={Lock} tone="coral" />
            <StatCard label="Attempted" value={completed} hint={`${assessments.length} total assessments`} icon={Trophy} tone="indigo" />
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assessments or courses" className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-canvas p-1">
              {(['OPEN', 'UPCOMING', 'CLOSED', 'ALL'] as Tab[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTab(option)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[0.7rem] font-bold capitalize transition',
                    tab === option ? 'bg-white text-indigo shadow-sm' : 'text-slate-500 hover:text-ink',
                  )}
                >
                  {option === 'ALL' ? 'All' : option.toLowerCase()} <span className="text-slate-400">{counts[option]}</span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            assessments.length === 0 ? (
              <EmptyState
                className="mt-5"
                icon={ClipboardList}
                title="No assessments available yet"
                description="Assessments appear here when you are enrolled in a course and the instructor publishes one."
                action={{ label: 'Browse courses', href: '/courses/' }}
              />
            ) : (
              <EmptyState className="mt-5" icon={Search} title="Nothing in this view" description="Try another tab or clear your search." />
            )
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {filtered.map((assessment) => {
                const closed = assessment.windowState === 'CLOSED';
                const upcoming = assessment.windowState === 'UPCOMING';
                const exhausted = assessment.attemptsRemaining === 0;
                return (
                  <div key={assessment.id} className="flex flex-col rounded-2xl border border-white bg-white p-5 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={assessment.windowState === 'OPEN' ? 'teal' : upcoming ? 'amber' : 'coral'}>
                            {assessment.windowState === 'OPEN' ? 'Open now' : assessment.windowState === 'UPCOMING' ? 'Upcoming' : 'Closed'}
                          </Badge>
                          {assessment.inProgressAttemptId && <Badge tone="indigo">In progress</Badge>}
                          {exhausted && <Badge tone="slate">No attempts left</Badge>}
                        </div>
                        <h2 className="mt-2 text-base font-extrabold leading-6 text-ink">{assessment.title}</h2>
                        <p className="mt-0.5 text-[0.68rem] font-medium text-slate-400">{assessment.course.title} · {assessment.instructor.name}</p>
                      </div>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lavender text-indigo">
                        <ClipboardList className="h-5 w-5" />
                      </span>
                    </div>

                    {assessment.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{assessment.description}</p>}

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Metric icon={Clock} label="Duration" value={`${assessment.durationMinutes} min`} />
                      <Metric icon={ClipboardList} label="Questions" value={String(assessment.totalQuestions)} />
                      <Metric icon={Flame} label="Attempts" value={`${assessment.attemptsUsed}/${assessment.maxAttempts}`} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.65rem] text-slate-400">
                      <span>Pass mark: <strong className="text-slate-600">{assessment.passPercentage}%</strong></span>
                      <span>Total marks: <strong className="text-slate-600">{assessment.totalMarks}</strong></span>
                      {assessment.availableUntil && (
                        <span className="inline-flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          Closes {formatDateTime(assessment.availableUntil)}
                        </span>
                      )}
                    </div>

                    {assessment.lastAttempt && (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-canvas px-3.5 py-2.5">
                        <div>
                          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">Last attempt</p>
                          <p className="mt-0.5 text-xs font-semibold text-ink">
                            {assessment.lastAttempt.resultsReleased
                              ? `${percent(assessment.lastAttempt.percentage)} · ${assessment.lastAttempt.passed ? 'Passed' : 'Not passed'}`
                              : 'Awaiting result release'}
                          </p>
                        </div>
                        {assessment.lastAttempt.resultsReleased ? (
                          <Link href={`/results/?attempt=${assessment.lastAttempt.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-indigo hover:underline">
                            Review
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <Badge tone="amber">Pending</Badge>
                        )}
                      </div>
                    )}

                    <div className="mt-auto flex items-center gap-2 pt-4">
                      {assessment.inProgressAttemptId ? (
                        <Button size="sm" className="flex-1" onClick={() => start(assessment)} loading={startingId === assessment.id}>
                          <PlayCircle className="h-4 w-4" />
                          Resume attempt
                        </Button>
                      ) : assessment.canStart ? (
                        <Button size="sm" className="flex-1" onClick={() => start(assessment)} loading={startingId === assessment.id}>
                          <PlayCircle className="h-4 w-4" />
                          Start {assessment.attemptsUsed > 0 ? 'another attempt' : 'assessment'}
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" className="flex-1" disabled>
                          <Lock className="h-4 w-4" />
                          {closed ? 'Closed' : upcoming ? 'Not open yet' : exhausted ? 'Attempts used' : 'Unavailable'}
                        </Button>
                      )}
                      <Link href={`/assessments/view/?id=${assessment.id}`} className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo/30 hover:text-indigo">
                        Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-canvas px-2.5 py-2 text-center">
      <Icon className="mx-auto h-3.5 w-3.5 text-slate-400" />
      <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xs font-extrabold text-ink">{value}</p>
    </div>
  );
}
