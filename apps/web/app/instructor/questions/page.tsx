'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  FileQuestion,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type { CourseSummary, Paginated, Question } from '@/lib/types';
import { Badge, EmptyState, ErrorState, Input, PageHeader, PageSkeleton, Select, StatCard, StatusBadge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn, formatDate } from '@/lib/utils';

export default function QuestionBankPage() {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [courseId, setCourseId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topic, setTopic] = useState('');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const courses = useApiQuery<Paginated<CourseSummary>>('/courses', { mine: true, limit: 100 });
  const courseList = courses.data?.data ?? [];
  const topics = useApiQuery<{ data: Array<{ topic: string; count: number }> } | Array<{ topic: string; count: number }>>('/questions/topics', { courseId: courseId || undefined });
  const topicList = Array.isArray(topics.data) ? topics.data : topics.data?.data ?? [];

  const query = useMemo(
    () => ({
      page,
      limit: 12,
      search: applied || undefined,
      courseId: courseId || undefined,
      difficulty: difficulty || undefined,
      topic: topic || undefined,
    }),
    [page, applied, courseId, difficulty, topic],
  );
  const { data, loading, error, refetch } = useApiQuery<Paginated<Question>>('/questions', query);
  const questions = data?.data ?? [];

  const summary = useApiQuery<Paginated<Question>>('/questions', { limit: 100 });
  const totalQuestions = summary.data?.meta.total ?? 0;

  async function remove() {
    if (!confirm) return;
    setDeleting(true);
    try {
      await api.delete(`/questions/${confirm.id}`);
      toast.success('Question deleted.');
      setConfirm(null);
      refetch();
      summary.refetch();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell requiredRoles={['INSTRUCTOR']}>
      <PageHeader
        eyebrow="Question bank"
        title="Reusable questions"
        description="Author multiple-choice questions once, then draw on them across timed assessments."
        actions={<LinkButton href="/instructor/questions/new/" size="sm"><Plus className="h-4 w-4" />New question</LinkButton>}
      />

      {loading && !summary.data ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Questions available" value={totalQuestions} hint="In your question bank" icon={FileQuestion} tone="indigo" />
            <StatCard label="Courses with questions" value={new Set((summary.data?.data ?? []).map((question) => question.courseId)).size} hint="Across your authored courses" icon={CheckCircle2} tone="teal" />
            <StatCard label="Topics covered" value={new Set((summary.data?.data ?? []).map((question) => question.topic)).size} hint="Used in accuracy analytics" icon={Filter} tone="amber" />
          </div>

          <div className="mt-5 rounded-2xl border border-white bg-white p-4 shadow-card">
            <form
              onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied(search.trim()); }}
              className="grid gap-3 lg:grid-cols-[1fr_200px_150px_170px_auto]"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search question text" className="pl-10" />
              </div>
              <Select value={courseId} onChange={(event) => { setCourseId(event.target.value); setTopic(''); setPage(1); }} aria-label="Filter by course">
                <option value="">All courses</option>
                {courseList.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </Select>
              <Select value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setPage(1); }} aria-label="Filter by difficulty">
                <option value="">Any difficulty</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </Select>
              <Select value={topic} onChange={(event) => { setTopic(event.target.value); setPage(1); }} aria-label="Filter by topic">
                <option value="">All topics</option>
                {topicList.map((item) => <option key={item.topic} value={item.topic}>{item.topic} ({item.count})</option>)}
              </Select>
              <Button type="submit"><Filter className="h-4 w-4" />Filter</Button>
            </form>
          </div>

          {questions.length === 0 ? (
            totalQuestions === 0 ? (
              <EmptyState
                className="mt-5"
                icon={FileQuestion}
                title="Your question bank is empty"
                description="Create your first multiple-choice question, assign it to a course and topic, and mark exactly one correct option."
                action={{ label: 'Create a question', href: '/instructor/questions/new/' }}
              />
            ) : (
              <EmptyState className="mt-5" icon={Search} title="No questions match" description="Adjust the filters or search for something broader." />
            )
          ) : (
            <div className="mt-5 space-y-3">
              {questions.map((question) => {
                const correct = question.options.find((option) => option.isCorrect);
                return (
                  <div key={question.id} className="rounded-2xl border border-white bg-white p-4 shadow-card sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={question.difficulty} />
                        <Badge tone="indigo">{question.topic}</Badge>
                        <Badge tone="slate">{question.marks} mark{question.marks === 1 ? '' : 's'}</Badge>
                        <span className="text-[0.65rem] text-slate-400">{question.course?.title ?? 'Course'} · added {formatDate(question.createdAt)}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Link href={`/instructor/questions/view/?id=${question.id}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-canvas hover:text-indigo" title="Edit question" aria-label="Edit question">
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button type="button" onClick={() => setConfirm(question)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-canvas hover:text-coral" title="Delete question" aria-label="Delete question">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-ink">{question.questionText}</p>
                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {question.options.map((option) => (
                        <div key={option.id} className={cn('flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs', option.isCorrect ? 'bg-softteal/60 text-teal' : 'bg-canvas text-slate-500')}>
                          {option.isCorrect ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300" />}
                          <span className={option.isCorrect ? 'font-semibold' : ''}>{option.optionText}</span>
                        </div>
                      ))}
                    </div>
                    {question.explanation && <p className="mt-2 line-clamp-2 text-[0.68rem] leading-5 text-slate-400">Explanation: {question.explanation}</p>}
                  </div>
                );
              })}
              <Pagination meta={data?.meta} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete this question?"
        description="The question is removed from your bank. Questions already used by an assessment or attempt cannot be deleted."
        confirmLabel="Delete question"
      />
    </AppShell>
  );
}
