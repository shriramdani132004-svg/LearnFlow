'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  Flame,
  Info,
  Lock,
  PlayCircle,
  ShieldCheck,
  Target,
  Timer,
  Trophy,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type { AssessmentAttemptSummary } from '@/lib/types';
import { Badge, ErrorState, PageHeader, PageSkeleton, StatusBadge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { formatDateTime, percent } from '@/lib/utils';

interface StudentAssessment {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  passPercentage: number;
  maxAttempts: number;
  availableFrom?: string | null;
  availableUntil?: string | null;
  published: boolean;
  showResultsImmediately: boolean;
  allowAnswerReview: boolean;
  resultsReleasedAt?: string | null;
  course: { id: string; title: string; category?: string };
  instructor: { id: string; name: string };
  attemptsUsed: number;
  attemptsRemaining: number;
  inProgressAttemptId?: string | null;
  attempts: AssessmentAttemptSummary[];
  canStart: boolean;
}

export default function AssessmentDetailPage() {
  const id = useQueryParam('id');
  const router = useRouter();
  const toast = useToast();
  const [starting, setStarting] = useState(false);
  const { data, loading, error, refetch } = useApiQuery<StudentAssessment>(id ? `/assessments/${id}` : null);

  const now = Date.now();
  const upcoming = data?.availableFrom ? new Date(data.availableFrom).getTime() > now : false;
  const closed = data?.availableUntil ? new Date(data.availableUntil).getTime() < now : false;

  async function start() {
    if (!data) return;
    if (data.inProgressAttemptId) {
      router.push(`/exam/?attempt=${data.inProgressAttemptId}`);
      return;
    }
    setStarting(true);
    try {
      const attempt = await api.post<{ id: string }>(`/assessments/${data.id}/attempts`);
      router.push(`/exam/?attempt=${attempt.id}`);
    } catch (caught) {
      toast.error(errorMessage(caught));
      refetch();
    } finally {
      setStarting(false);
    }
  }

  return (
    <AppShell requiredRoles={['STUDENT']}>
      {!id ? (
        <ErrorState message="No assessment selected." />
      ) : loading ? (
        <PageSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? 'Assessment not found.'} onRetry={refetch} />
      ) : (
        <>
          <PageHeader
            breadcrumbs={[
              { label: 'Assessments', href: '/assessments/' },
              { label: data.title },
            ]}
            eyebrow={data.course.title}
            title={data.title}
            description={data.description ?? 'Read the assessment rules carefully before you begin.'}
            actions={
              data.inProgressAttemptId ? (
                <Button size="sm" onClick={start} loading={starting}>
                  <PlayCircle className="h-4 w-4" />
                  Resume attempt
                </Button>
              ) : data.canStart ? (
                <Button size="sm" onClick={start} loading={starting}>
                  <PlayCircle className="h-4 w-4" />
                  Start assessment
                </Button>
              ) : (
                <Badge tone={closed ? 'coral' : upcoming ? 'amber' : 'slate'}>
                  <Lock className="h-3 w-3" />
                  {closed ? 'Closed' : upcoming ? 'Not open yet' : 'Unavailable'}
                </Badge>
              )
            }
          />

          <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <p className="text-sm font-bold text-ink">Assessment rules</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Rule icon={Timer} label="Time limit" value={`${data.durationMinutes} minutes`} />
                  <Rule icon={ClipboardList} label="Questions" value={String(data.totalQuestions)} />
                  <Rule icon={Target} label="Pass mark" value={`${data.passPercentage}%`} />
                  <Rule icon={Trophy} label="Total marks" value={String(data.totalMarks)} />
                  <Rule icon={Flame} label="Attempts" value={`${data.attemptsRemaining} of ${data.maxAttempts} left`} />
                  <Rule icon={Eye} label="Answer review" value={data.allowAnswerReview ? 'Available after' : 'Not available'} />
                </div>
              </div>

              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Info className="h-4 w-4 text-indigo" />
                  Before you start
                </p>
                <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-teal" />
                    The timer is enforced by the server from the moment the attempt starts — closing the tab does not pause it.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-teal" />
                    Each answer autosaves. You can move between questions and change answers until you submit.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-teal" />
                    When time expires, the attempt is finalised automatically with the answers already saved.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-teal" />
                    Results are {data.showResultsImmediately ? 'visible immediately after submission' : 'released by your instructor after the assessment window'}.
                  </li>
                </ul>
                {data.instructions && (
                  <div className="mt-4 rounded-xl bg-lavender/60 p-4">
                    <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-indigo">Instructor instructions</p>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-600">{data.instructions}</p>
                  </div>
                )}
              </div>

              {data.attempts.length > 0 && (
                <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-ink">Your attempts</p>
                    <Link href="/history/" className="text-xs font-bold text-indigo hover:underline">All history</Link>
                  </div>
                  <div className="mt-3 divide-y divide-slate-50">
                    {data.attempts.map((attempt) => (
                      <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div>
                          <p className="text-xs font-bold text-ink">Attempt {attempt.attemptNumber}</p>
                          <p className="text-[0.65rem] text-slate-400">Submitted {formatDateTime(attempt.submittedAt)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {attempt.percentage !== null && attempt.percentage !== undefined && (
                            <p className="text-sm font-extrabold text-ink">{percent(attempt.percentage)}</p>
                          )}
                          <StatusBadge status={attempt.status} />
                          <Link href={`/results/?attempt=${attempt.id}`} className="text-xs font-bold text-indigo hover:underline">Result</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-ink to-[#273B8F] p-5 text-white shadow-lift">
                <ShieldCheck className="h-5 w-5 text-[#B9BBFF]" />
                <p className="mt-2 text-sm font-bold">Server-authoritative exam</p>
                <p className="mt-1 text-xs leading-5 text-white/55">
                  The deadline lives on the server, so refreshing or switching devices cannot extend
                  your time. Answers are validated against this attempt only.
                </p>
              </div>

              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-slate-400">Availability</p>
                <div className="mt-3 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Opens</span>
                    <span className="font-semibold text-ink">{data.availableFrom ? formatDateTime(data.availableFrom) : 'Anytime'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Closes</span>
                    <span className="font-semibold text-ink">{data.availableUntil ? formatDateTime(data.availableUntil) : 'No deadline'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Results</span>
                    <span className="font-semibold text-ink">
                      {data.showResultsImmediately ? 'Immediate' : data.resultsReleasedAt ? 'Released' : 'Instructor release'}
                    </span>
                  </div>
                </div>
                <Link href={`/courses/view/?id=${data.course.id}`} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo hover:underline">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to course
                </Link>
              </div>

              <div className="rounded-2xl border border-amber/20 bg-amber-50/60 p-5">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <CalendarClock className="h-4 w-4 text-amber" />
                  Ready to begin?
                </p>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  {data.inProgressAttemptId
                    ? 'You have an attempt in progress. Resume it to keep the same server deadline.'
                    : data.canStart
                      ? `Once started, you will have ${data.durationMinutes} minutes to submit.`
                      : 'This assessment cannot be started right now. Check the availability window and attempt count.'}
                </p>
                {data.inProgressAttemptId ? (
                  <Button size="sm" fullWidth className="mt-3" onClick={start} loading={starting}>
                    Resume attempt
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : data.canStart ? (
                  <Button size="sm" fullWidth className="mt-3" onClick={start} loading={starting}>
                    Start now
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </aside>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Rule({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-canvas p-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-indigo shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2 text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xs font-extrabold text-ink">{value}</p>
    </div>
  );
}
