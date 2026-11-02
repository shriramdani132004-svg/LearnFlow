'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ClipboardList, Clock, EyeOff, RotateCcw, Search, Target, Trophy, XCircle } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery } from '@/hooks/use-api';
import type { HistoryItem } from '@/lib/types';
import { Badge, EmptyState, ErrorState, Input, PageHeader, PageSkeleton, StatCard, StatusBadge } from '@/components/ui/primitives';
import { formatDateTime, percent } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Filter = 'ALL' | 'PASSED' | 'FAILED' | 'PENDING';

export default function HistoryPage() {
  const { data, loading, error, refetch } = useApiQuery<{ data: HistoryItem[] }>('/attempts/me/history');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');

  const attempts = data?.data ?? [];
  const filtered = useMemo(
    () =>
      attempts.filter((attempt) => {
        const matchesSearch =
          !search.trim() ||
          attempt.assessmentTitle.toLowerCase().includes(search.toLowerCase()) ||
          attempt.course.title.toLowerCase().includes(search.toLowerCase());
        const matchesFilter =
          filter === 'ALL' ||
          (filter === 'PASSED' && attempt.resultsReleased && attempt.passed === true) ||
          (filter === 'FAILED' && attempt.resultsReleased && attempt.passed === false) ||
          (filter === 'PENDING' && !attempt.resultsReleased);
        return matchesSearch && matchesFilter;
      }),
    [attempts, filter, search],
  );

  const released = attempts.filter((attempt) => attempt.resultsReleased && attempt.percentage !== null);
  const passed = released.filter((attempt) => attempt.passed).length;
  const average = released.length
    ? released.reduce((sum, attempt) => sum + (attempt.percentage ?? 0), 0) / released.length
    : null;
  const best = released.length ? Math.max(...released.map((attempt) => attempt.percentage ?? 0)) : null;

  const counts: Record<Filter, number> = {
    ALL: attempts.length,
    PASSED: attempts.filter((attempt) => attempt.resultsReleased && attempt.passed).length,
    FAILED: attempts.filter((attempt) => attempt.resultsReleased && attempt.passed === false).length,
    PENDING: attempts.filter((attempt) => !attempt.resultsReleased).length,
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Attempt history"
        title="Every assessment you have taken"
        description="Submitted attempts, released scores and results awaiting instructor release."
        actions={<Link href="/assessments/" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo px-3.5 text-[0.8rem] font-semibold text-white transition hover:bg-indigo-600"><ClipboardList className="h-4 w-4" />Assessments</Link>}
      />

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Attempts" value={attempts.length} hint={`${counts.PENDING} awaiting results`} icon={RotateCcw} tone="indigo" />
            <StatCard label="Passed" value={passed} hint={`${counts.FAILED} below pass mark`} icon={Trophy} tone="teal" />
            <StatCard label="Average score" value={percent(average)} hint="Released results only" icon={Target} tone="amber" />
            <StatCard label="Best score" value={percent(best)} hint="Highest released percentage" icon={CheckCircle2} tone="violet" />
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by assessment or course" className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-canvas p-1">
              {(['ALL', 'PASSED', 'FAILED', 'PENDING'] as Filter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[0.7rem] font-bold capitalize transition',
                    filter === option ? 'bg-white text-indigo shadow-sm' : 'text-slate-500 hover:text-ink',
                  )}
                >
                  {option.toLowerCase()} <span className="text-slate-400">{counts[option]}</span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            attempts.length === 0 ? (
              <EmptyState
                className="mt-5"
                icon={ClipboardList}
                title="No attempts yet"
                description="Once you submit an assessment, it will appear here with its score and review link."
                action={{ label: 'View available assessments', href: '/assessments/' }}
              />
            ) : (
              <EmptyState className="mt-5" icon={Search} title="No attempts match" description="Try a different search term or filter." />
            )
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-white bg-white shadow-card">
              <div className="hidden overflow-x-auto sm:block">
                <table className="lf-table min-w-[760px]">
                  <thead>
                    <tr>
                      <th className="pl-5">Assessment</th>
                      <th>Attempt</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Result</th>
                      <th className="pr-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((attempt) => (
                      <tr key={attempt.id}>
                        <td className="pl-5">
                          <p className="font-semibold text-ink">{attempt.assessmentTitle}</p>
                          <p className="text-[0.68rem] text-slate-400">{attempt.course.title}</p>
                        </td>
                        <td>#{attempt.attemptNumber}</td>
                        <td className="whitespace-nowrap text-xs">{formatDateTime(attempt.submittedAt)}</td>
                        <td><StatusBadge status={attempt.status} /></td>
                        <td>
                          {attempt.resultsReleased && attempt.percentage !== null ? (
                            <span className="font-bold text-ink">{percent(attempt.percentage)}</span>
                          ) : (
                            <span className="text-xs text-slate-400">Hidden</span>
                          )}
                        </td>
                        <td>
                          {!attempt.resultsReleased ? (
                            <Badge tone="amber"><EyeOff className="h-3 w-3" />Pending</Badge>
                          ) : attempt.passed ? (
                            <Badge tone="teal"><CheckCircle2 className="h-3 w-3" />Passed</Badge>
                          ) : (
                            <Badge tone="coral"><XCircle className="h-3 w-3" />Not passed</Badge>
                          )}
                        </td>
                        <td className="pr-5 text-right">
                          <Link href={`/results/?attempt=${attempt.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-indigo hover:underline">
                            {attempt.resultsReleased ? 'View result' : 'View status'}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-50 sm:hidden">
                {filtered.map((attempt) => (
                  <div key={attempt.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink">{attempt.assessmentTitle}</p>
                        <p className="text-[0.68rem] text-slate-400">{attempt.course.title} · attempt #{attempt.attemptNumber}</p>
                      </div>
                      <StatusBadge status={attempt.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.68rem] text-slate-500">
                      <span>{formatDateTime(attempt.submittedAt)}</span>
                      {attempt.resultsReleased ? (
                        <Badge tone={attempt.passed ? 'teal' : 'coral'}>{percent(attempt.percentage)} · {attempt.passed ? 'Passed' : 'Failed'}</Badge>
                      ) : (
                        <Badge tone="amber">Result pending</Badge>
                      )}
                    </div>
                    <Link href={`/results/?attempt=${attempt.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo">
                      {attempt.resultsReleased ? 'View result' : 'View status'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-gradient-to-br from-lavender to-white p-5 ring-1 ring-indigo/10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo shadow-sm"><Target className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">Scores hidden for unreleased assessments</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">Instructors choose whether results are immediate or released after the assessment window. Pending attempts stay in this list.</p>
              </div>
              <Link href="/analytics/" className="inline-flex items-center gap-1 text-xs font-bold text-indigo hover:underline">
                Explore analytics
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
