'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  LogOut,
  Menu,
  Save,
  Send,
  ShieldCheck,
  Timer,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { Logo } from '@/components/ui/logo';
import { Avatar, Badge, PageSkeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { RichText } from '@/components/ui/rich-text';
import { api, errorMessage } from '@/lib/api';
import { useQueryParam } from '@/hooks/use-api';
import type { Attempt } from '@/lib/types';
import { cn, formatDuration } from '@/lib/utils';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function ExamPage() {
  const attemptId = useQueryParam('attempt');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(0);
  const [savingQuestion, setSavingQuestion] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const deadlineRef = useRef<number>(0);
  const submittedRef = useRef(false);
  const autoSubmittingRef = useRef(false);
  const attemptRef = useRef<Attempt | null>(null);

  useEffect(() => {
    if (authLoading || user) return;
    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login/?next=${encodeURIComponent(next)}`);
  }, [authLoading, user, router]);

  const doSubmit = useCallback(
    async (automatic = false) => {
      if (!attemptId || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        await api.post(`/attempts/${attemptId}/submit`);
        if (automatic) toast.toast('Time expired. Your saved answers were submitted automatically.', 'info');
        else toast.success('Assessment submitted. Calculating your result…');
        router.replace(`/results/?attempt=${attemptId}`);
      } catch (caught) {
        submittedRef.current = false;
        autoSubmittingRef.current = false;
        toast.error(errorMessage(caught));
        setSubmitting(false);
      }
    },
    [attemptId, router, toast],
  );

  useEffect(() => {
    if (!attemptId || !user) return;
    let active = true;
    api
      .get<Attempt>(`/attempts/${attemptId}`)
      .then((data) => {
        if (!active) return;
        if (data.status !== 'IN_PROGRESS') {
          router.replace(`/results/?attempt=${attemptId}`);
          return;
        }
        setAttempt(data);
        attemptRef.current = data;
        const initial: Record<string, string> = {};
        for (const question of data.questions) {
          if (question.selectedOptionId) initial[question.id] = question.selectedOptionId;
        }
        setAnswers(initial);
        deadlineRef.current = Date.now() + data.remainingSeconds * 1000;
        setRemaining(data.remainingSeconds);
      })
      .catch((caught) => {
        if (active) setLoadError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [attemptId, user, router]);

  useEffect(() => {
    if (!attempt) return;
    const interval = window.setInterval(() => {
      const next = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0 && !autoSubmittingRef.current && !submittedRef.current) {
        autoSubmittingRef.current = true;
        void doSubmit(true);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [attempt, doSubmit]);

  useEffect(() => {
    if (!attempt) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (submittedRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [attempt]);

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      if (!submittedRef.current) {
        window.history.pushState(null, '', window.location.href);
        toast.toast('Submit the attempt before leaving the exam.', 'info');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [toast]);

  const questions = attempt?.questions ?? [];
  const current = questions[currentIndex];
  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id]).length,
    [questions, answers],
  );
  const unanswered = questions.length - answeredCount;

  async function selectAnswer(questionId: string, optionId: string) {
    if (!attempt || submitting) return;
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
    setSaveState('saving');
    setSavingQuestion(questionId);
    try {
      const response = await api.put<{ saved: boolean; remainingSeconds: number }>(
        `/attempts/${attempt.id}/answers/${questionId}`,
        { selectedAttemptOptionId: optionId },
      );
      deadlineRef.current = Date.now() + response.remainingSeconds * 1000;
      setRemaining(response.remainingSeconds);
      setSaveState('saved');
      window.setTimeout(() => setSaveState((value) => (value === 'saved' ? 'idle' : value)), 1600);
    } catch (caught) {
      setSaveState('error');
      toast.error(errorMessage(caught));
      if (String((caught as { message?: string })?.message ?? '').toLowerCase().includes('expired')) {
        void doSubmit(true);
      }
    } finally {
      setSavingQuestion(null);
    }
  }

  if (authLoading || (!attempt && !loadError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-5xl"><PageSkeleton /></div>
      </div>
    );
  }

  if (loadError || !attempt || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-softcoral text-coral">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-ink">Unable to open this attempt</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{loadError ?? 'The attempt could not be loaded.'}</p>
        <Link href="/assessments/" className="mt-5 inline-flex h-10 items-center rounded-xl bg-indigo px-5 text-sm font-semibold text-white">
          Back to assessments
        </Link>
      </div>
    );
  }

  const urgent = remaining <= 300;
  const critical = remaining <= 60;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="LearnFlow home"><Logo compact /></Link>
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="truncate text-sm font-bold text-ink">{attempt.assessment.title}</p>
            <p className="truncate text-[0.68rem] text-slate-400">{attempt.assessment.course.title} · Attempt {attempt.attemptNumber}</p>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold tabular-nums transition',
                critical ? 'bg-softcoral text-[#B91C1C] animate-pulse' : urgent ? 'bg-amber-50 text-[#B45309]' : 'bg-lavender text-indigo',
              )}
              role="timer"
              aria-live="polite"
            >
              {critical ? <AlertTriangle className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
              {formatDuration(remaining)}
            </div>
            <button type="button" onClick={() => setNavOpen(true)} className="rounded-xl bg-canvas p-2.5 text-slate-500 transition hover:bg-lavender hover:text-indigo lg:hidden" aria-label="Open question navigator">
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden items-center gap-2 lg:flex">
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            </div>
          </div>
        </div>
        <div className="h-0.5 w-full bg-slate-100">
          <div
            className={cn('h-full transition-all duration-500', critical ? 'bg-coral' : urgent ? 'bg-amber' : 'bg-indigo')}
            style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row">
        <section className="order-2 min-w-0 flex-1 lg:order-1">
          <div className="rounded-2xl border border-white bg-white p-5 shadow-card sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge tone="indigo">Question {currentIndex + 1} of {questions.length}</Badge>
                <Badge tone="slate">{current?.topic}</Badge>
              </div>
              <div className="flex items-center gap-2 text-[0.68rem] font-semibold">
                <span className={cn('inline-flex items-center gap-1', saveState === 'saving' && 'text-indigo', saveState === 'saved' && 'text-teal', saveState === 'error' && 'text-coral', saveState === 'idle' && 'text-slate-400')}>
                  {saveState === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saveState === 'saved' ? <Check className="h-3.5 w-3.5" /> : saveState === 'error' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : 'Autosave on'}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">{current?.marks} mark{(current?.marks ?? 1) === 1 ? '' : 's'}</span>
              </div>
            </div>

            <h1 className="mt-4 text-lg font-bold leading-8 text-ink sm:text-xl">{current?.questionText}</h1>

            <div className="mt-5 space-y-2.5" role="radiogroup" aria-label="Answer options">
              {(current?.options ?? []).map((option, index) => {
                const selected = answers[current.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => selectAnswer(current.id, option.id)}
                    disabled={submitting}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition disabled:cursor-not-allowed',
                      selected ? 'border-indigo bg-lavender/70 shadow-sm' : 'border-slate-100 bg-white hover:border-indigo/30 hover:bg-canvas',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold',
                        selected ? 'bg-indigo text-white' : 'bg-canvas text-slate-500',
                      )}
                    >
                      {selected ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 pt-1">
                      <span className="text-sm font-medium leading-6 text-ink">{option.text}</span>
                    </span>
                    {savingQuestion === current.id && selected && <Loader2 className="mt-1.5 h-4 w-4 animate-spin text-indigo" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <Button variant="secondary" size="sm" onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <p className="hidden text-[0.68rem] font-medium text-slate-400 sm:block">{answeredCount} of {questions.length} answered</p>
              {currentIndex < questions.length - 1 ? (
                <Button size="sm" onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" variant="teal" onClick={() => setConfirmOpen(true)}>
                  <Send className="h-4 w-4" />
                  Review & submit
                </Button>
              )}
            </div>
          </div>
        </section>

        <aside className="order-1 w-full shrink-0 lg:order-2 lg:w-[310px]">
          <div className="rounded-2xl border border-white bg-white p-5 shadow-card lg:sticky lg:top-[88px]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink">Question navigator</p>
              <Badge tone={unanswered === 0 ? 'teal' : 'amber'}>{answeredCount}/{questions.length}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-6">
              {questions.map((question, index) => {
                const answered = Boolean(answers[question.id]);
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(index);
                      setNavOpen(false);
                      if (window.innerWidth < 1024) window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={cn(
                      'flex h-9 items-center justify-center rounded-lg text-xs font-bold transition',
                      index === currentIndex
                        ? 'bg-indigo text-white ring-2 ring-indigo/30 ring-offset-1'
                        : answered
                          ? 'bg-softteal text-teal'
                          : 'bg-canvas text-slate-400 hover:bg-lavender hover:text-indigo',
                    )}
                    aria-label={`Question ${index + 1}${answered ? ', answered' : ', unanswered'}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[0.62rem] font-semibold text-slate-400">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-softteal ring-1 ring-teal/20" />Answered</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-canvas ring-1 ring-slate-200" />Unanswered</span>
            </div>

            <div className="mt-5 rounded-xl bg-canvas p-3.5">
              <p className="flex items-center gap-1.5 text-[0.68rem] font-bold text-ink"><Clock className="h-3.5 w-3.5 text-indigo" />Time remaining</p>
              <p className={cn('mt-1 text-2xl font-extrabold tabular-nums', critical ? 'text-coral' : urgent ? 'text-[#B45309]' : 'text-ink')}>{formatDuration(remaining)}</p>
              <p className="mt-1 text-[0.62rem] leading-4 text-slate-400">The server finalises this attempt when the timer reaches zero.</p>
            </div>

            <Button variant="teal" fullWidth className="mt-4" onClick={() => setConfirmOpen(true)} disabled={submitting}>
              <Send className="h-4 w-4" />
              Submit assessment
            </Button>
            <p className="mt-2 text-center text-[0.62rem] text-slate-400">
              {unanswered > 0 ? `${unanswered} unanswered question${unanswered === 1 ? '' : 's'}` : 'All questions answered'}
            </p>
          </div>
        </aside>
      </main>

      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setNavOpen(false)} aria-label="Close navigator" />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink">Jump to a question</p>
              <button type="button" onClick={() => setNavOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 grid grid-cols-8 gap-2">
              {questions.map((question, index) => {
                const answered = Boolean(answers[question.id]);
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => { setCurrentIndex(index); setNavOpen(false); }}
                    className={cn('flex h-10 items-center justify-center rounded-lg text-xs font-bold', index === currentIndex ? 'bg-indigo text-white' : answered ? 'bg-softteal text-teal' : 'bg-canvas text-slate-500')}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit this assessment?"
        description="Your submitted answers are final. The attempt will be graded immediately."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)} disabled={submitting}>Keep working</Button>
            <Button variant="teal" size="sm" onClick={() => doSubmit(false)} loading={submitting}>
              Submit & finish
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-canvas p-3 text-center">
              <p className="text-lg font-extrabold text-ink">{answeredCount}</p>
              <p className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">Answered</p>
            </div>
            <div className={cn('rounded-xl p-3 text-center', unanswered > 0 ? 'bg-softcoral/60' : 'bg-softteal/60')}>
              <p className={cn('text-lg font-extrabold', unanswered > 0 ? 'text-coral' : 'text-teal')}>{unanswered}</p>
              <p className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">Unanswered</p>
            </div>
            <div className="rounded-xl bg-canvas p-3 text-center">
              <p className="text-lg font-extrabold text-ink">{formatDuration(remaining)}</p>
              <p className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">Left</p>
            </div>
          </div>
          {unanswered > 0 && (
            <p className="flex items-start gap-2 rounded-xl border border-amber/25 bg-amber-50/70 p-3 text-xs leading-5 text-[#92400E]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              You still have {unanswered} unanswered question{unanswered === 1 ? '' : 's'}. Unanswered questions score zero.
            </p>
          )}
          <p className="flex items-start gap-2 rounded-xl bg-canvas p-3 text-[0.7rem] leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
            Answers were autosaved to the server. Submission is graded transactionally against the question snapshots for this attempt.
          </p>
        </div>
      </Modal>
    </div>
  );
}
