'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FileQuestion,
  Send,
  Settings2,
  Sparkles,
  Timer,
  Trash2,
  Undo2,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type { AssessmentSummary, CourseStatus, Difficulty, QuestionOption } from '@/lib/types';
import {
  Badge,
  ErrorState,
  Field,
  Input,
  PageHeader,
  PageSkeleton,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
} from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn, formatDateTime } from '@/lib/utils';

type PoolQuestion = {
  id: string;
  questionText: string;
  explanation?: string | null;
  difficulty: Difficulty;
  topic: string;
  marks: number;
  options: QuestionOption[];
  assessmentPosition: number;
};

type AssessmentDetail = AssessmentSummary & {
  pool: PoolQuestion[];
  course: { id: string; title: string; status: CourseStatus; category?: string };
};

type Action = 'publish' | 'unpublish' | 'release' | 'delete';

function toLocalInput(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function ManageAssessmentPage() {
  const assessmentId = useQueryParam('id');
  const router = useRouter();
  const toast = useToast();
  const { data, loading, error, refetch } = useApiQuery<AssessmentDetail>(
    assessmentId ? `/assessments/${assessmentId}` : null,
  );

  const [form, setForm] = useState({
    title: '',
    description: '',
    instructions: '',
    durationMinutes: 30,
    totalQuestions: 1,
    passPercentage: 40,
    maxAttempts: 1,
    availableFrom: '',
    availableUntil: '',
    shuffleQuestions: true,
    shuffleOptions: true,
    showResultsImmediately: true,
    allowAnswerReview: true,
  });
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [working, setWorking] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    if (!data || loadedFor === data.id) return;
    setLoadedFor(data.id);
    setForm({
      title: data.title,
      description: data.description ?? '',
      instructions: data.instructions ?? '',
      durationMinutes: data.durationMinutes,
      totalQuestions: data.totalQuestions,
      passPercentage: data.passPercentage,
      maxAttempts: data.maxAttempts,
      availableFrom: toLocalInput(data.availableFrom),
      availableUntil: toLocalInput(data.availableUntil),
      shuffleQuestions: data.shuffleQuestions,
      shuffleOptions: data.shuffleOptions,
      showResultsImmediately: data.showResultsImmediately,
      allowAnswerReview: data.allowAnswerReview,
    });
  }, [data, loadedFor]);

  const pool = data?.pool ?? [];
  const poolSize = data?.poolSize ?? pool.length;
  const marks = useMemo(() => new Set(pool.map((question) => question.marks)), [pool]);
  const uniformMarks = marks.size <= 1;
  const markValue = pool[0]?.marks ?? 1;
  const previewTotal = markValue * Number(form.totalQuestions || 0);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    setFormError(null);
    if (!form.title.trim() || form.title.trim().length < 3) {
      setFormError('Give the assessment a title of at least 3 characters.');
      return;
    }
    if (form.totalQuestions < 1 || form.totalQuestions > poolSize) {
      setFormError(`Questions served must be between 1 and the pool size (${poolSize}).`);
      return;
    }
    if (form.availableFrom && form.availableUntil && new Date(form.availableUntil) <= new Date(form.availableFrom)) {
      setFormError('Availability end must be after the start date.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/assessments/${data.id}`, {
        title: form.title.trim(),
        description: form.description.trim(),
        instructions: form.instructions.trim(),
        durationMinutes: Number(form.durationMinutes),
        totalQuestions: Number(form.totalQuestions),
        passPercentage: Number(form.passPercentage),
        maxAttempts: Number(form.maxAttempts),
        availableFrom: form.availableFrom ? new Date(form.availableFrom).toISOString() : null,
        availableUntil: form.availableUntil ? new Date(form.availableUntil).toISOString() : null,
        shuffleQuestions: form.shuffleQuestions,
        shuffleOptions: form.shuffleOptions,
        showResultsImmediately: form.showResultsImmediately,
        allowAnswerReview: form.allowAnswerReview,
      });
      toast.success('Assessment settings saved.');
      refetch();
    } catch (caught) {
      setFormError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function perform() {
    if (!data || !confirm) return;
    setWorking(true);
    try {
      if (confirm === 'delete') {
        await api.delete(`/assessments/${data.id}`);
        toast.success('Assessment deleted.');
        router.replace('/instructor/assessments/');
        return;
      }
      await api.post(`/assessments/${data.id}/${confirm === 'release' ? 'release-results' : confirm}`);
      toast.success(
        confirm === 'publish'
          ? 'Assessment published.'
          : confirm === 'unpublish'
            ? 'Assessment moved to draft.'
            : 'Results released to students.',
      );
      setConfirm(null);
      refetch();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setWorking(false);
    }
  }

  if (!assessmentId) {
    return (
      <AppShell requiredRoles={['INSTRUCTOR']}>
        <ErrorState message="No assessment selected. Open an assessment from the assessment studio." />
      </AppShell>
    );
  }

  return (
    <AppShell requiredRoles={['INSTRUCTOR']}>
      {loading && !data ? (
        <PageSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? 'Assessment not found.'} onRetry={refetch} />
      ) : (
        <>
          <PageHeader
            breadcrumbs={[
              { label: 'Assessments', href: '/instructor/assessments/' },
              { label: data.title },
            ]}
            eyebrow="Assessment management"
            title={data.title}
            description={data.description ?? 'Configure the window, scoring and release rules for this assessment.'}
            actions={
              <>
                <LinkButton href={`/instructor/assessments/results/?id=${data.id}`} size="sm" variant="secondary">
                  <BarChart3 className="h-4 w-4" />
                  Results
                </LinkButton>
                {data.published ? (
                  <Button size="sm" variant="secondary" onClick={() => setConfirm('unpublish')}>
                    <Undo2 className="h-4 w-4" />
                    Unpublish
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setConfirm('publish')}>
                    <CheckCircle2 className="h-4 w-4" />
                    Publish
                  </Button>
                )}
              </>
            }
          />

          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-white bg-white px-4 py-3 shadow-card">
            <Badge tone={data.published ? 'teal' : 'amber'}>{data.published ? 'Published' : 'Draft'}</Badge>
            {data.published && !data.showResultsImmediately && (
              <Badge tone={data.resultsReleasedAt ? 'indigo' : 'coral'}>
                {data.resultsReleasedAt ? `Results released ${formatDateTime(data.resultsReleasedAt)}` : 'Results held'}
              </Badge>
            )}
            <Badge tone="indigo">{data.course.title}</Badge>
            <span className="text-[0.68rem] text-slate-400">
              Created {formatDateTime(data.createdAt)} · Updated {formatDateTime(data.updatedAt)}
            </span>
            {data.published && !data.showResultsImmediately && !data.resultsReleasedAt && (
              <Button size="sm" variant="teal" className="ml-auto" onClick={() => setConfirm('release')}>
                <Send className="h-4 w-4" />
                Release results
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Questions served" value={data.totalQuestions} hint={`${poolSize} in the pool`} icon={FileQuestion} tone="indigo" />
            <StatCard label="Duration" value={`${data.durationMinutes} min`} hint={`${data.totalMarks} total marks`} icon={Timer} tone="teal" />
            <StatCard label="Attempts" value={data.attemptCount ?? 0} hint={`Up to ${data.maxAttempts} per student`} icon={Users} tone="amber" />
            <StatCard label="Pass mark" value={`${data.passPercentage}%`} hint="Graded server-side" icon={ClipboardList} tone="violet" />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-5">
              <form onSubmit={save} className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lavender text-indigo">
                    <Settings2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">Assessment settings</p>
                    <p className="text-[0.65rem] text-slate-400">Editing is blocked while a student attempt is in progress</p>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <Field label="Title" htmlFor="title">
                    <Input id="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} minLength={3} maxLength={160} required />
                  </Field>
                  <Field label="Description" htmlFor="description">
                    <Textarea id="description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={3000} rows={2} />
                  </Field>
                  <Field label="Instructions" htmlFor="instructions">
                    <Textarea id="instructions" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} maxLength={5000} rows={4} />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Duration (minutes)" htmlFor="duration">
                      <Input id="duration" type="number" min={1} max={600} value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} required />
                    </Field>
                    <Field label="Questions served" htmlFor="totalQuestions" hint={`1–${Math.max(1, poolSize)} from the pool.`}>
                      <Input id="totalQuestions" type="number" min={1} max={Math.max(1, poolSize)} value={form.totalQuestions} onChange={(event) => setForm({ ...form, totalQuestions: Number(event.target.value) })} required />
                    </Field>
                    <Field label="Pass percentage" htmlFor="pass">
                      <Input id="pass" type="number" min={0} max={100} value={form.passPercentage} onChange={(event) => setForm({ ...form, passPercentage: Number(event.target.value) })} required />
                    </Field>
                    <Field label="Maximum attempts" htmlFor="attempts">
                      <Input id="attempts" type="number" min={1} max={20} value={form.maxAttempts} onChange={(event) => setForm({ ...form, maxAttempts: Number(event.target.value) })} required />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Opens at" htmlFor="from">
                      <Input id="from" type="datetime-local" value={form.availableFrom} onChange={(event) => setForm({ ...form, availableFrom: event.target.value })} />
                    </Field>
                    <Field label="Closes at" htmlFor="until">
                      <Input id="until" type="datetime-local" value={form.availableUntil} onChange={(event) => setForm({ ...form, availableUntil: event.target.value })} />
                    </Field>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Toggle label="Shuffle questions" description="Randomise the served subset." checked={form.shuffleQuestions} onChange={(value) => setForm({ ...form, shuffleQuestions: value })} />
                    <Toggle label="Shuffle options" description="Randomise option order." checked={form.shuffleOptions} onChange={(value) => setForm({ ...form, shuffleOptions: value })} />
                    <Toggle label="Show results immediately" description="Scores visible after submission." checked={form.showResultsImmediately} onChange={(value) => setForm({ ...form, showResultsImmediately: value })} />
                    <Toggle label="Allow answer review" description="Show answers and explanations." checked={form.allowAnswerReview} onChange={(value) => setForm({ ...form, allowAnswerReview: value })} />
                  </div>

                  {formError && (
                    <p className="flex items-start gap-2 rounded-xl border border-coral/25 bg-softcoral/50 p-3 text-xs leading-5 text-[#B91C1C]">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {formError}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-[0.68rem] text-slate-400">
                      Serving {form.totalQuestions} × {markValue} mark{markValue === 1 ? '' : 's'} = <span className="font-bold text-ink">{uniformMarks ? previewTotal : '—'} marks</span>
                    </p>
                    <Button type="submit" loading={saving}>
                      Save settings
                    </Button>
                  </div>
                </div>
              </form>

              <section className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-softteal text-teal">
                      <FileQuestion className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">Question pool</p>
                      <p className="text-[0.65rem] text-slate-400">
                        {poolSize} question{poolSize === 1 ? '' : 's'} · {uniformMarks ? `${markValue} mark${markValue === 1 ? '' : 's'} each` : 'mixed mark values'}
                      </p>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setShowAnswers((value) => !value)}>
                    <Eye className="h-4 w-4" />
                    {showAnswers ? 'Hide answer key' : 'Show answer key'}
                  </Button>
                </div>

                {pool.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-canvas px-4 py-8 text-center text-xs text-slate-400">This assessment has no questions in its pool.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {pool.map((question) => (
                      <div key={question.id} className="rounded-xl border border-slate-100 p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-canvas text-[0.62rem] font-extrabold text-slate-500">
                            {question.assessmentPosition}
                          </span>
                          <StatusBadge status={question.difficulty} />
                          <Badge tone="indigo">{question.topic}</Badge>
                          <Badge tone="slate">{question.marks} mark{question.marks === 1 ? '' : 's'}</Badge>
                        </div>
                        <p className="mt-2 text-sm font-semibold leading-6 text-ink">{question.questionText}</p>
                        <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                          {question.options.map((option) => {
                            const correct = showAnswers && option.isCorrect;
                            return (
                              <div
                                key={option.id}
                                className={cn(
                                  'flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs',
                                  correct ? 'bg-softteal/70 font-semibold text-teal' : 'bg-canvas text-slate-500',
                                )}
                              >
                                {correct ? (
                                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                                )}
                                <span>{option.optionText}</span>
                              </div>
                            );
                          })}
                        </div>
                        {showAnswers && question.explanation && (
                          <p className="mt-2 rounded-lg bg-amber-50/70 p-2.5 text-[0.68rem] leading-5 text-[#92400E]">
                            <span className="font-bold">Explanation:</span> {question.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
              <div className="rounded-2xl bg-gradient-to-br from-ink to-[#273B8F] p-5 text-white shadow-lift">
                <Sparkles className="h-5 w-5 text-[#B9BBFF]" />
                <p className="mt-2 text-sm font-bold">Live configuration</p>
                <div className="mt-4 space-y-2.5">
                  <SummaryRow label="Course" value={data.course.title} />
                  <SummaryRow label="Pool" value={`${poolSize} question${poolSize === 1 ? '' : 's'}`} />
                  <SummaryRow label="Served" value={`${data.totalQuestions} random`} />
                  <SummaryRow label="Marks" value={String(data.totalMarks)} />
                  <SummaryRow label="Pass" value={`${data.passPercentage}%`} />
                  <SummaryRow label="Attempts used" value={String(data.attemptCount ?? 0)} />
                  <SummaryRow label="Availability" value={data.availableFrom || data.availableUntil ? 'Scheduled window' : 'Always open'} />
                  <SummaryRow label="Results" value={data.showResultsImmediately ? 'Immediate' : data.resultsReleasedAt ? 'Released' : 'Held'} />
                </div>
              </div>

              {data.availableFrom || data.availableUntil ? (
                <div className="rounded-2xl border border-white bg-white p-4 shadow-card">
                  <p className="flex items-center gap-2 text-xs font-bold text-ink">
                    <CalendarClock className="h-4 w-4 text-amber" />
                    Availability window
                  </p>
                  <p className="mt-2 text-[0.68rem] leading-5 text-slate-500">
                    Opens {data.availableFrom ? formatDateTime(data.availableFrom) : 'immediately'}
                    <br />
                    Closes {data.availableUntil ? formatDateTime(data.availableUntil) : 'when unpublished'}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-white bg-white p-4 shadow-card">
                  <p className="flex items-center gap-2 text-xs font-bold text-ink">
                    <Clock className="h-4 w-4 text-teal" />
                    Always available
                  </p>
                  <p className="mt-1.5 text-[0.68rem] leading-5 text-slate-500">
                    No window is configured. Students can start while the assessment is published and they have attempts left.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <p className="text-sm font-bold text-ink">Publishing controls</p>
                <p className="mt-1 text-[0.68rem] leading-5 text-slate-500">
                  Publishing makes the assessment available to enrolled students. Unpublishing hides it without deleting attempt history.
                </p>
                <div className="mt-3 space-y-2">
                  {data.published ? (
                    <Button variant="secondary" size="sm" fullWidth onClick={() => setConfirm('unpublish')}>
                      <Undo2 className="h-4 w-4" />
                      Move to draft
                    </Button>
                  ) : (
                    <Button size="sm" fullWidth onClick={() => setConfirm('publish')}>
                      <CheckCircle2 className="h-4 w-4" />
                      Publish assessment
                    </Button>
                  )}
                  {data.published && !data.showResultsImmediately && !data.resultsReleasedAt && (
                    <Button variant="teal" size="sm" fullWidth onClick={() => setConfirm('release')}>
                      <Send className="h-4 w-4" />
                      Release results
                    </Button>
                  )}
                  <LinkButton href={`/instructor/assessments/results/?id=${data.id}`} variant="ghost" size="sm" className="w-full">
                    <BarChart3 className="h-4 w-4" />
                    View results
                  </LinkButton>
                </div>
              </div>

              <div className="rounded-2xl border border-coral/20 bg-softcoral/30 p-4">
                <p className="text-xs font-bold text-ink">Danger zone</p>
                <p className="mt-1 text-[0.68rem] leading-5 text-slate-600">
                  Deletion is only possible when no attempts exist. Otherwise unpublish the assessment.
                </p>
                <Button variant="danger" size="sm" fullWidth className="mt-3" onClick={() => setConfirm('delete')}>
                  <Trash2 className="h-4 w-4" />
                  Delete assessment
                </Button>
              </div>

              <Link href="/instructor/assessments/" className="flex items-center justify-center gap-1.5 rounded-xl border border-white bg-white px-3 py-3 text-xs font-semibold text-slate-500 shadow-card transition hover:text-indigo">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to assessments
              </Link>
            </aside>
          </div>

          <ConfirmDialog
            open={Boolean(confirm)}
            onClose={() => setConfirm(null)}
            onConfirm={perform}
            loading={working}
            title={
              confirm === 'publish'
                ? 'Publish this assessment?'
                : confirm === 'unpublish'
                  ? 'Move assessment to draft?'
                  : confirm === 'release'
                    ? 'Release results to students?'
                    : 'Delete this assessment?'
            }
            description={
              confirm === 'publish'
                ? 'Enrolled students will be able to start attempts during the availability window.'
                : confirm === 'unpublish'
                  ? 'The assessment disappears from student views. Existing attempts are kept.'
                  : confirm === 'release'
                    ? 'Every graded attempt becomes visible to students, including answer review where enabled.'
                    : 'Deletion is refused when attempt history exists. Unpublish instead to stop new attempts.'
            }
            confirmLabel={
              confirm === 'publish'
                ? 'Publish'
                : confirm === 'unpublish'
                  ? 'Unpublish'
                  : confirm === 'release'
                    ? 'Release results'
                    : 'Delete assessment'
            }
            tone={confirm === 'publish' || confirm === 'release' ? 'primary' : 'danger'}
          />
        </>
      )}
    </AppShell>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-100 bg-canvas/60 p-3.5">
      <span>
        <span className="block text-xs font-bold text-ink">{label}</span>
        <span className="mt-0.5 block text-[0.65rem] leading-5 text-slate-500">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-indigo' : 'bg-slate-300')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-2.5 last:border-0 last:pb-0">
      <span className="text-[0.68rem] text-white/45">{label}</span>
      <span className="max-w-[60%] text-right text-[0.68rem] font-bold text-white">{value}</span>
    </div>
  );
}
