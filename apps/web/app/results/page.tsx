'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  EyeOff,
  MinusCircle,
  RotateCcw,
  Target,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import type { AttemptResult } from '@/lib/types';
import { Badge, ErrorState, PageHeader, PageSkeleton, StatusBadge } from '@/components/ui/primitives';
import { ScoreRing } from '@/components/ui/score-ring';
import { LinkButton } from '@/components/ui/link-button';
import { formatDateTime, percent, titleCase } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function ResultPage() {
  const attemptId = useQueryParam('attempt');
  const { data, loading, error, refetch } = useApiQuery<AttemptResult>(attemptId ? `/attempts/${attemptId}/result` : null);

  return (
    <AppShell>
      {!attemptId ? (
        <ErrorState message="No attempt selected." />
      ) : loading ? (
        <PageSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? 'Result not found.'} onRetry={refetch} />
      ) : !data.released ? (
        <>
          <PageHeader
            breadcrumbs={[{ label: 'Assessments', href: '/assessments/' }, { label: 'Result' }]}
            eyebrow="Result"
            title="Your result is not released yet"
            description="The attempt has been submitted and graded. Your instructor controls when results become visible."
          />
          <div className="rounded-2xl border border-amber/20 bg-amber-50/60 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-amber shadow-sm">
                <EyeOff className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-bold text-ink">Submitted and safely recorded</p>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-600">
                  {data.message ?? 'Your result will be available once your instructor releases it.'}
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  Submitted {formatDateTime(data.submittedAt)} · Status {titleCase(data.status)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <LinkButton href="/assessments/" size="sm">Back to assessments</LinkButton>
                  <LinkButton href="/history/" size="sm" variant="secondary">Attempt history</LinkButton>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <PageHeader
            breadcrumbs={[
              { label: 'Assessments', href: '/assessments/' },
              { label: data.assessment?.title ?? 'Assessment' },
              { label: 'Result' },
            ]}
            eyebrow={data.assessment?.course.title ?? 'Assessment result'}
            title={data.assessment?.title ?? 'Assessment result'}
            description={`Attempt submitted ${formatDateTime(data.submittedAt)}`}
            actions={
              <Badge tone={data.result?.passed ? 'teal' : 'coral'}>
                {data.result?.passed ? 'Passed' : 'Not passed'}
              </Badge>
            }
          />

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-5">
              <div
                className={cn(
                  'overflow-hidden rounded-2xl border shadow-card',
                  data.result?.passed ? 'border-teal/20 bg-gradient-to-br from-softteal/80 to-white' : 'border-coral/20 bg-gradient-to-br from-softcoral/70 to-white',
                )}
              >
                <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
                  <ScoreRing
                    percentage={data.result?.percentage ?? 0}
                    tone={data.result?.passed ? 'pass' : 'fail'}
                    label={data.result?.passed ? 'Passed' : 'Below pass mark'}
                  />
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className={cn('text-[0.68rem] font-extrabold uppercase tracking-[0.18em]', data.result?.passed ? 'text-teal' : 'text-coral')}>
                      {data.result?.passed ? 'Assessment passed' : 'Keep going — review and retry'}
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
                      {data.result?.score} / {data.result?.totalMarks} marks
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-600">
                      You answered {data.result?.correctCount} of {data.result?.totalQuestions} questions correctly.
                      The pass mark is {data.assessment?.passPercentage}%.
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                      <Badge tone="indigo">{data.result?.percentage}% score</Badge>
                      <Badge tone="slate">Pass mark {data.assessment?.passPercentage}%</Badge>
                      <StatusBadge status={data.status} />
                    </div>
                  </div>
                </div>
              </div>

              {data.reviewAllowed && data.review && data.review.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-ink">Answer review</p>
                      <p className="text-xs text-slate-400">Correct answers and explanations for this attempt</p>
                    </div>
                    <Badge tone="teal">{data.review.filter((question) => question.options.find((option) => option.isSelected)?.id === question.options.find((option) => option.isCorrect)?.id).length} correct</Badge>
                  </div>
                  {data.review.map((question, index) => {
                    const correct = question.options.find((option) => option.isCorrect);
                    const selected = question.options.find((option) => option.isSelected);
                    const isCorrect = Boolean(correct && selected && correct.id === selected.id);
                    return (
                      <div key={question.id} className="overflow-hidden rounded-2xl border border-white bg-white shadow-card">
                        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold', isCorrect ? 'bg-softteal text-teal' : selected ? 'bg-softcoral text-coral' : 'bg-slate-100 text-slate-400')}>
                            {isCorrect ? <Check className="h-4 w-4" /> : selected ? <X className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[0.62rem] font-extrabold uppercase tracking-wide text-slate-400">Question {index + 1}</span>
                              <Badge tone="slate">{question.topic}</Badge>
                              <span className="text-[0.62rem] font-semibold text-slate-400">{question.marks} mark{question.marks === 1 ? '' : 's'}</span>
                            </div>
                            <p className="mt-1 text-sm font-semibold leading-6 text-ink">{question.questionText}</p>
                          </div>
                        </div>
                        <div className="space-y-2 px-5 py-4">
                          {question.options.map((option) => {
                            const isSelected = option.isSelected;
                            const isAnswer = option.isCorrect;
                            return (
                              <div
                                key={option.id}
                                className={cn(
                                  'flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm',
                                  isAnswer ? 'border-teal/30 bg-softteal/60' : isSelected ? 'border-coral/30 bg-softcoral/50' : 'border-slate-100 bg-white',
                                )}
                              >
                                <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', isAnswer ? 'bg-teal text-white' : isSelected ? 'bg-coral text-white' : 'bg-slate-100 text-slate-400')}>
                                  {isAnswer ? <Check className="h-3 w-3" /> : isSelected ? <X className="h-3 w-3" /> : null}
                                </span>
                                <span className="flex-1 leading-6 text-slate-700">{option.text}</span>
                                {isAnswer && <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-wide text-teal">Correct</span>}
                                {isSelected && !isAnswer && <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-wide text-coral">Your answer</span>}
                              </div>
                            );
                          })}
                          {!selected && (
                            <p className="flex items-center gap-1.5 pl-1 text-[0.68rem] font-semibold text-slate-400">
                              <MinusCircle className="h-3.5 w-3.5" />
                              You left this question unanswered.
                            </p>
                          )}
                          {question.explanation && (
                            <div className="mt-2 rounded-xl bg-lavender/60 p-3.5">
                              <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-indigo">Explanation</p>
                              <p className="mt-1 text-xs leading-5 text-slate-600">{question.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-white bg-white p-6 text-center shadow-card">
                  <EyeOff className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="mt-2 text-sm font-bold text-ink">Answer review is disabled</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    The instructor has chosen not to reveal individual answers for this assessment.
                  </p>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-slate-400">Attempt summary</p>
                <div className="mt-4 space-y-3">
                  <SummaryRow label="Score" value={`${data.result?.score} / ${data.result?.totalMarks}`} />
                  <SummaryRow label="Percentage" value={percent(data.result?.percentage)} />
                  <SummaryRow label="Correct answers" value={`${data.result?.correctCount} of ${data.result?.totalQuestions}`} />
                  <SummaryRow label="Status" value={titleCase(data.status)} />
                  <SummaryRow label="Started" value={formatDateTime(data.startedAt)} />
                  <SummaryRow label="Submitted" value={formatDateTime(data.submittedAt)} />
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-ink to-[#273B8F] p-5 text-white shadow-lift">
                <Target className="h-5 w-5 text-[#B9BBFF]" />
                <p className="mt-2 text-sm font-bold">What next?</p>
                <p className="mt-1 text-xs leading-5 text-white/55">
                  Revisit the lessons behind your weakest topics, then use another attempt if the
                  assessment allows it.
                </p>
                <div className="mt-4 space-y-2">
                  <LinkButton href="/analytics/" variant="light" size="sm" className="w-full justify-start">
                    <Trophy className="h-4 w-4" />
                    View topic analytics
                  </LinkButton>
                  <LinkButton href="/history/" variant="light" size="sm" className="w-full justify-start">
                    <RotateCcw className="h-4 w-4" />
                    Attempt history
                  </LinkButton>
                </div>
              </div>

              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <p className="text-sm font-bold text-ink">Keep learning</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Return to the course to review the relevant lessons.
                </p>
                <LinkButton href="/my-courses/" size="sm" variant="secondary" className="mt-3 w-full">
                  <ArrowLeft className="h-4 w-4" />
                  My courses
                </LinkButton>
                <LinkButton href="/assessments/" size="sm" variant="ghost" className="mt-2 w-full">
                  <ClipboardList className="h-4 w-4" />
                  All assessments
                </LinkButton>
              </div>
            </aside>
          </div>
        </>
      )}
    </AppShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-bold text-ink">{value}</span>
    </div>
  );
}
