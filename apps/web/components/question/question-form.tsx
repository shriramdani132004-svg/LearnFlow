'use client';

import { useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import type { CourseSummary, Difficulty, Question } from '@/lib/types';
import { Badge, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

export interface QuestionPayload {
  courseId: string;
  questionText: string;
  explanation?: string;
  difficulty: string;
  topic: string;
  marks: number;
  options: Array<{ optionText: string; isCorrect: boolean }>;
}

export function QuestionForm({
  courses,
  initial,
  initialCourseId,
  saving,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  courses: CourseSummary[];
  initial?: Question;
  initialCourseId?: string | null;
  saving: boolean;
  error?: string | null;
  submitLabel: string;
  onSubmit: (payload: QuestionPayload) => void;
  onCancel?: () => void;
}) {
  const initialOptions = initial?.options?.length
    ? initial.options.map((option) => ({ optionText: option.optionText, isCorrect: Boolean(option.isCorrect) }))
    : [
        { optionText: '', isCorrect: true },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
      ];

  const [form, setForm] = useState({
    courseId: initial?.courseId ?? initialCourseId ?? courses[0]?.id ?? '',
    questionText: initial?.questionText ?? '',
    explanation: initial?.explanation ?? '',
    difficulty: initial?.difficulty ?? 'MEDIUM',
    topic: initial?.topic ?? '',
    marks: initial?.marks ?? 1,
  });
  const [options, setOptions] = useState(initialOptions);
  const [localError, setLocalError] = useState<string | null>(null);

  function setOption(index: number, value: string) {
    setOptions((current) => current.map((option, optionIndex) => (optionIndex === index ? { ...option, optionText: value } : option)));
  }

  function setCorrect(index: number) {
    setOptions((current) => current.map((option, optionIndex) => ({ ...option, isCorrect: optionIndex === index })));
  }

  function addOption() {
    if (options.length >= 8) return;
    setOptions((current) => [...current, { optionText: '', isCorrect: false }]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((current) => {
      const next = current.filter((_, optionIndex) => optionIndex !== index);
      if (!next.some((option) => option.isCorrect)) next[0] = { ...next[0], isCorrect: true };
      return next;
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setLocalError(null);
    if (!form.courseId) {
      setLocalError('Select the course this question belongs to.');
      return;
    }
    if (options.some((option) => !option.optionText.trim())) {
      setLocalError('Every option needs text.');
      return;
    }
    const correctCount = options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      setLocalError('Exactly one option must be marked correct.');
      return;
    }
    onSubmit({
      courseId: form.courseId,
      questionText: form.questionText.trim(),
      ...(form.explanation.trim() ? { explanation: form.explanation.trim() } : {}),
      difficulty: form.difficulty,
      topic: form.topic.trim(),
      marks: Number(form.marks) || 1,
      options: options.map((option) => ({ optionText: option.optionText.trim(), isCorrect: option.isCorrect })),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
        <p className="text-sm font-bold text-ink">Question content</p>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Course" htmlFor="courseId">
              <Select id="courseId" value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })} required>
                <option value="">Select a course</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </Select>
            </Field>
            <Field label="Topic" htmlFor="topic" hint="Used for topic-level accuracy analytics.">
              <Input id="topic" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} minLength={2} maxLength={80} required placeholder="e.g. Closures" />
            </Field>
          </div>
          <Field label="Question" htmlFor="questionText">
            <Textarea id="questionText" value={form.questionText} onChange={(event) => setForm({ ...form, questionText: event.target.value })} minLength={10} maxLength={5000} required rows={4} placeholder="Write a clear, unambiguous multiple-choice question." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Difficulty" htmlFor="difficulty">
              <Select id="difficulty" value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value as Difficulty })}>
                {DIFFICULTIES.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}</option>)}
              </Select>
            </Field>
            <Field label="Marks" htmlFor="marks" hint="All questions in one assessment pool must share the same mark value.">
              <Input id="marks" type="number" min={1} max={20} value={form.marks} onChange={(event) => setForm({ ...form, marks: Number(event.target.value) })} required />
            </Field>
          </div>
          <Field label="Explanation (optional)" htmlFor="explanation" hint="Shown after submission when answer review is allowed.">
            <Textarea id="explanation" value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} maxLength={5000} rows={3} placeholder="Why the correct answer is correct." />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Answer options</p>
            <p className="mt-0.5 text-xs text-slate-400">Add 2–8 options. Select exactly one correct answer.</p>
          </div>
          <Badge tone="teal">1 correct</Badge>
        </div>
        <div className="mt-4 space-y-2.5">
          {options.map((option, index) => (
            <div key={index} className={cn('flex items-center gap-2.5 rounded-xl border-2 p-2.5 transition', option.isCorrect ? 'border-teal/40 bg-softteal/40' : 'border-slate-100 bg-white')}>
              <button
                type="button"
                onClick={() => setCorrect(index)}
                className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition', option.isCorrect ? 'bg-teal text-white' : 'bg-canvas text-slate-400 hover:bg-lavender hover:text-indigo')}
                aria-label={`Mark option ${index + 1} correct`}
                title="Mark as correct"
              >
                {option.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : String.fromCharCode(65 + index)}
              </button>
              <Input value={option.optionText} onChange={(event) => setOption(index, event.target.value)} placeholder={`Option ${String.fromCharCode(65 + index)}`} maxLength={500} required className="border-0 bg-transparent focus:ring-0" />
              <button type="button" onClick={() => removeOption(index)} disabled={options.length <= 2} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-coral disabled:opacity-30" aria-label={`Remove option ${index + 1}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {options.length < 8 && (
          <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={addOption}>
            <Plus className="h-4 w-4" />
            Add option
          </Button>
        )}
      </div>

      {(localError || error) && <p className="rounded-xl border border-coral/30 bg-softcoral/60 px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">{localError ?? error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>}
        <Button type="submit" loading={saving}>{submitLabel}</Button>
      </div>
    </form>
  );
}
