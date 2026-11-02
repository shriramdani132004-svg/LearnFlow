'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileQuestion,
  Info,
  Search,
  Shuffle,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type { AssessmentSummary, CourseSummary, Paginated, Question } from '@/lib/types';
import { Badge, ErrorState, Field, Input, PageHeader, PageSkeleton, Select, StatCard, StatusBadge, Textarea } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';

export default function NewAssessmentPage() {
  const router = useRouter();
  const courseParam = useQueryParam('course');
  const toast = useToast();

  const courses = useApiQuery<Paginated<CourseSummary>>('/courses', { mine: true, limit: 100 });
  const courseList = courses.data?.data ?? [];

  const [form, setForm] = useState({
    courseId: '',
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = useApiQuery<Paginated<Question>>(
    form.courseId ? '/questions' : null,
    form.courseId ? { courseId: form.courseId, limit: 100, page: 1 } : undefined,
  );
  const pool = questions.data?.data ?? [];

  useEffect(() => {
    if (courseParam && !form.courseId && courseList.some((course) => course.id === courseParam)) {
      setForm((current) => ({ ...current, courseId: courseParam }));
    }
  }, [courseParam, courseList, form.courseId]);

  useEffect(() => {
    setSelectedIds([]);
    setForm((current) => ({ ...current, totalQuestions: 1 }));
  }, [form.courseId]);

  const selectedQuestions = pool.filter((question) => selectedIds.includes(question.id));
  const marks = useMemo(() => new Set(selectedQuestions.map((question) => question.marks)), [selectedQuestions]);
  const uniformMarks = marks.size <= 1;
  const markValue = selectedQuestions[0]?.marks ?? 1;
  const computedTotal = markValue * form.totalQuestions;
  const filteredPool = pool.filter((question) => {
    const matchesSearch = !questionSearch.trim() || question.questionText.toLowerCase().includes(questionSearch.toLowerCase()) || question.topic.toLowerCase().includes(questionSearch.toLowerCase());
    const matchesDifficulty = !difficultyFilter || question.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  function toggleQuestion(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      const next = [...current, id];
      return next;
    });
  }

  useEffect(() => {
    if (!selectedIds.length) return;
    setForm((current) => ({
      ...current,
      totalQuestions: Math.min(Math.max(1, current.totalQuestions), selectedIds.length),
    }));
  }, [selectedIds]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.courseId) return setError('Select a course for this assessment.');
    if (selectedIds.length === 0) return setError('Select at least one question for the assessment pool.');
    if (form.totalQuestions < 1 || form.totalQuestions > selectedIds.length) return setError('Questions to serve must be between 1 and the pool size.');
    if (!uniformMarks) return setError('All selected questions must have the same mark value.');
    if (form.availableFrom && form.availableUntil && new Date(form.availableUntil) <= new Date(form.availableFrom)) {
      return setError('Availability end must be after the start date.');
    }
    setSaving(true);
    try {
      const assessment = await api.post<AssessmentSummary>('/assessments', {
        courseId: form.courseId,
        title: form.title.trim(),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        ...(form.instructions.trim() ? { instructions: form.instructions.trim() } : {}),
        durationMinutes: Number(form.durationMinutes),
        totalQuestions: Number(form.totalQuestions),
        passPercentage: Number(form.passPercentage),
        maxAttempts: Number(form.maxAttempts),
        ...(form.availableFrom ? { availableFrom: new Date(form.availableFrom).toISOString() } : {}),
        ...(form.availableUntil ? { availableUntil: new Date(form.availableUntil).toISOString() } : {}),
        shuffleQuestions: form.shuffleQuestions,
        shuffleOptions: form.shuffleOptions,
        showResultsImmediately: form.showResultsImmediately,
        allowAnswerReview: form.allowAnswerReview,
        questionIds: selectedIds,
      });
      toast.success('Assessment created as a draft.');
      router.replace(`/instructor/assessments/view/?id=${assessment.id}`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell requiredRoles={['INSTRUCTOR']}>
      <PageHeader
        breadcrumbs={[{ label: 'Assessments', href: '/instructor/assessments/' }, { label: 'New assessment' }]}
        eyebrow="Assessment builder"
        title="Create an assessment"
        description="Choose a question pool, set the clock and decide how results are released. It starts as a draft."
      />

      {courses.loading ? (
        <PageSkeleton />
      ) : courses.error ? (
        <ErrorState message={courses.error} onRetry={courses.refetch} />
      ) : courseList.length === 0 ? (
        <ErrorState message="Create a course first. Assessments belong to a course and draw questions from its bank." />
      ) : (
        <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lavender text-indigo"><ClipboardList className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-bold text-ink">Basics</p>
                  <p className="text-[0.65rem] text-slate-400">Title, course and instructions students see</p>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                <Field label="Course" htmlFor="course">
                  <Select id="course" value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })} required>
                    <option value="">Select a course</option>
                    {courseList.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                  </Select>
                </Field>
                <Field label="Assessment title" htmlFor="title">
                  <Input id="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} minLength={3} maxLength={160} required placeholder="e.g. JavaScript Foundations — Module 1 Check" />
                </Field>
                <Field label="Description (optional)" htmlFor="description">
                  <Textarea id="description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={3000} rows={2} placeholder="Short summary shown on the assessment card." />
                </Field>
                <Field label="Instructions (optional)" htmlFor="instructions">
                  <Textarea id="instructions" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} maxLength={5000} rows={3} placeholder="Anything students should know before starting." />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-softteal text-teal"><FileQuestion className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-bold text-ink">Question pool</p>
                    <p className="text-[0.65rem] text-slate-400">Selected questions are shuffled and sampled per attempt</p>
                  </div>
                </div>
                <Badge tone={selectedIds.length ? 'teal' : 'slate'}>{selectedIds.length} selected · {questions.data?.meta.total ?? 0} available</Badge>
              </div>

              {!form.courseId ? (
                <p className="mt-4 rounded-xl bg-canvas px-4 py-8 text-center text-xs text-slate-400">Select a course to load its question bank.</p>
              ) : questions.loading ? (
                <div className="mt-4 space-y-2">{[0, 1, 2].map((key) => <div key={key} className="h-16 animate-pulse rounded-xl bg-canvas" />)}</div>
              ) : pool.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-amber/30 bg-amber-50/60 px-4 py-8 text-center">
                  <Info className="mx-auto h-5 w-5 text-amber" />
                  <p className="mt-2 text-sm font-bold text-ink">This course has no questions</p>
                  <p className="mt-1 text-xs text-slate-500">Add questions to the bank first, then come back to build the assessment.</p>
                  <a href={`/instructor/questions/new/?course=${form.courseId}`} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo px-3.5 text-xs font-semibold text-white">
                    Add a question
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input value={questionSearch} onChange={(event) => setQuestionSearch(event.target.value)} placeholder="Search question or topic" className="pl-10" />
                    </div>
                    <Select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)} className="sm:w-40">
                      <option value="">Any difficulty</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </Select>
                  </div>
                  {!uniformMarks && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl border border-coral/25 bg-softcoral/50 p-3 text-xs leading-5 text-[#B91C1C]">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      Selected questions use different mark values ({Array.from(marks).join(', ')}). The API requires a uniform mark value so randomised selection gives a consistent total.
                    </p>
                  )}
                  <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {filteredPool.map((question) => {
                      const checked = selectedIds.includes(question.id);
                      return (
                        <label key={question.id} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition', checked ? 'border-indigo/40 bg-lavender/40' : 'border-slate-100 bg-white hover:border-indigo/20')}>
                          <input type="checkbox" checked={checked} onChange={() => toggleQuestion(question.id)} className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo focus:ring-indigo" />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <StatusBadge status={question.difficulty} />
                              <Badge tone="indigo">{question.topic}</Badge>
                              <span className="text-[0.62rem] font-semibold text-slate-400">{question.marks} mark{question.marks === 1 ? '' : 's'}</span>
                            </span>
                            <span className="mt-1 block line-clamp-2 text-xs font-medium leading-5 text-ink">{question.questionText}</span>
                          </span>
                        </label>
                      );
                    })}
                    {filteredPool.length === 0 && <p className="px-2 py-6 text-center text-xs text-slate-400">No questions match this search.</p>}
                  </div>
                  {(questions.data?.meta.total ?? 0) > pool.length && (
                    <p className="mt-3 text-[0.65rem] text-slate-400">Showing the first {pool.length} of {questions.data?.meta.total} questions.</p>
                  )}
                </>
              )}
            </section>

            <section className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber"><Timer className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-bold text-ink">Timing & scoring</p>
                  <p className="text-[0.65rem] text-slate-400">Server-enforced duration and pass threshold</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Duration (minutes)" htmlFor="duration" hint="1–600 minutes.">
                  <Input id="duration" type="number" min={1} max={600} value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} required />
                </Field>
                <Field label="Questions served" htmlFor="totalQuestions" hint={`1–${Math.max(1, selectedIds.length)} based on the selected pool.`}>
                  <Input id="totalQuestions" type="number" min={1} max={selectedIds.length || 200} value={form.totalQuestions} onChange={(event) => setForm({ ...form, totalQuestions: Number(event.target.value) })} required />
                </Field>
                <Field label="Pass percentage" htmlFor="pass" hint="0–100. Learners at or above this percentage pass.">
                  <Input id="pass" type="number" min={0} max={100} value={form.passPercentage} onChange={(event) => setForm({ ...form, passPercentage: Number(event.target.value) })} required />
                </Field>
                <Field label="Maximum attempts" htmlFor="attempts" hint="1–20 per student.">
                  <Input id="attempts" type="number" min={1} max={20} value={form.maxAttempts} onChange={(event) => setForm({ ...form, maxAttempts: Number(event.target.value) })} required />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lavender text-indigo"><CalendarClock className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-bold text-ink">Availability</p>
                  <p className="text-[0.65rem] text-slate-400">Optional window. Leave blank for always available.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Opens at" htmlFor="from">
                  <Input id="from" type="datetime-local" value={form.availableFrom} onChange={(event) => setForm({ ...form, availableFrom: event.target.value })} />
                </Field>
                <Field label="Closes at" htmlFor="until">
                  <Input id="until" type="datetime-local" value={form.availableUntil} onChange={(event) => setForm({ ...form, availableUntil: event.target.value })} />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-softteal text-teal"><Shuffle className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-bold text-ink">Attempt behaviour</p>
                  <p className="text-[0.65rem] text-slate-400">Randomisation and result visibility</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <Toggle label="Shuffle questions" description="Serve a random subset in a different order each attempt." checked={form.shuffleQuestions} onChange={(value) => setForm({ ...form, shuffleQuestions: value })} />
                <Toggle label="Shuffle options" description="Randomise option order within each question." checked={form.shuffleOptions} onChange={(value) => setForm({ ...form, shuffleOptions: value })} />
                <Toggle label="Show results immediately" description="Students see their score as soon as they submit." checked={form.showResultsImmediately} onChange={(value) => setForm({ ...form, showResultsImmediately: value })} />
                <Toggle label="Allow answer review" description="Show correct answers and explanations after submission." checked={form.allowAnswerReview} onChange={(value) => setForm({ ...form, allowAnswerReview: value })} />
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
            <div className="rounded-2xl bg-gradient-to-br from-ink to-[#273B8F] p-5 text-white shadow-lift">
              <Sparkles className="h-5 w-5 text-[#B9BBFF]" />
              <p className="mt-2 text-sm font-bold">Assessment summary</p>
              <div className="mt-4 space-y-2.5">
                <SummaryRow label="Course" value={form.courseId ? courseList.find((course) => course.id === form.courseId)?.title ?? '—' : 'Not selected'} />
                <SummaryRow label="Pool size" value={String(selectedIds.length)} />
                <SummaryRow label="Questions served" value={String(form.totalQuestions)} />
                <SummaryRow label="Duration" value={`${form.durationMinutes} min`} />
                <SummaryRow label="Total marks" value={selectedIds.length && uniformMarks ? String(computedTotal) : '—'} />
                <SummaryRow label="Pass mark" value={`${form.passPercentage}%`} />
                <SummaryRow label="Attempts" value={String(form.maxAttempts)} />
                <SummaryRow label="Results" value={form.showResultsImmediately ? 'Immediate' : 'Manual release'} />
              </div>
              {selectedIds.length > 0 && uniformMarks && (
                <p className="mt-3 rounded-lg bg-white/10 p-2.5 text-[0.65rem] leading-5 text-white/65">
                  Serving {form.totalQuestions} of {selectedIds.length} questions at {markValue} mark{markValue === 1 ? '' : 's'} each.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <p className="text-sm font-bold text-ink">Readiness</p>
              <div className="mt-3 space-y-2">
                <Readiness done={Boolean(form.courseId)} label="Course selected" />
                <Readiness done={form.title.trim().length >= 3} label="Title provided" />
                <Readiness done={selectedIds.length > 0} label="Question pool selected" />
                <Readiness done={uniformMarks && selectedIds.length > 0} label="Uniform mark value" />
                <Readiness done={form.totalQuestions <= selectedIds.length && form.totalQuestions >= 1} label="Valid question count" />
              </div>
              {error && <p className="mt-4 rounded-xl border border-coral/30 bg-softcoral/60 px-3.5 py-2.5 text-xs font-medium leading-5 text-[#B91C1C]">{error}</p>}
              <Button type="submit" fullWidth className="mt-4" loading={saving} disabled={!uniformMarks || selectedIds.length === 0}>
                Create assessment
                {!saving && <ArrowRight className="h-4 w-4" />}
              </Button>
              <Button type="button" fullWidth variant="ghost" className="mt-2" onClick={() => router.push('/instructor/assessments/')} disabled={saving}>
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Button>
            </div>

            <div className="rounded-2xl border border-amber/20 bg-amber-50/60 p-4">
              <p className="flex items-start gap-2 text-[0.7rem] font-semibold leading-5 text-[#92400E]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Assessment settings are locked while any attempt is in progress. Publish only when the pool and rules are final.
              </p>
            </div>
          </aside>
        </form>
      )}
    </AppShell>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-100 bg-canvas/60 p-3.5">
      <span>
        <span className="block text-xs font-bold text-ink">{label}</span>
        <span className="mt-0.5 block text-[0.65rem] leading-5 text-slate-500">{description}</span>
      </span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-indigo' : 'bg-slate-300')}>
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

function Readiness({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[0.7rem]">
      <span className={cn('flex h-4 w-4 items-center justify-center rounded-full', done ? 'bg-teal text-white' : 'bg-slate-200 text-slate-400')}>
        {done ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <span className={done ? 'font-semibold text-ink' : 'text-slate-500'}>{label}</span>
    </div>
  );
}
