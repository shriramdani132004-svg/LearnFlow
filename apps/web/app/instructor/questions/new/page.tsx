'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { QuestionForm, type QuestionPayload } from '@/components/question/question-form';
import { ErrorState, PageHeader, PageSkeleton } from '@/components/ui/primitives';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import type { CourseSummary, Paginated, Question } from '@/lib/types';

export default function NewQuestionPage() {
  const router = useRouter();
  const courseParam = useQueryParam('course');
  const courses = useApiQuery<Paginated<CourseSummary>>('/courses', { mine: true, limit: 100 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(payload: QuestionPayload) {
    setSaving(true);
    setError(null);
    try {
      const question = await api.post<Question>('/questions', payload);
      router.replace(`/instructor/questions/view/?id=${question.id}`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell requiredRoles={['INSTRUCTOR']}>
      <PageHeader
        breadcrumbs={[{ label: 'Question bank', href: '/instructor/questions/' }, { label: 'New question' }]}
        eyebrow="Question bank"
        title="Create a question"
        description="Write a multiple-choice question with exactly one correct option. Questions are reusable across assessments."
      />
      {courses.loading ? (
        <PageSkeleton />
      ) : courses.error ? (
        <ErrorState message={courses.error} onRetry={courses.refetch} />
      ) : (courses.data?.data.length ?? 0) === 0 ? (
        <ErrorState message="Create a course before adding questions. Questions must belong to a course you own." />
      ) : (
        <div className="max-w-4xl">
          <QuestionForm
            courses={courses.data?.data ?? []}
            initialCourseId={courseParam}
            saving={saving}
            error={error}
            submitLabel="Create question"
            onSubmit={submit}
            onCancel={() => router.back()}
          />
        </div>
      )}
    </AppShell>
  );
}
