'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { QuestionForm, type QuestionPayload } from '@/components/question/question-form';
import { Badge, ErrorState, PageHeader, PageSkeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type { CourseSummary, Paginated, Question } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function EditQuestionPage() {
  const id = useQueryParam('id');
  const router = useRouter();
  const toast = useToast();
  const question = useApiQuery<Question>(id ? `/questions/${id}` : null);
  const courses = useApiQuery<Paginated<CourseSummary>>('/courses', { mine: true, limit: 100 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function submit(payload: QuestionPayload) {
    if (!question.data) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/questions/${question.data.id}`, payload);
      toast.success('Question updated.');
      question.refetch();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!question.data) return;
    setDeleting(true);
    try {
      await api.delete(`/questions/${question.data.id}`);
      toast.success('Question deleted.');
      router.replace('/instructor/questions/');
    } catch (caught) {
      toast.error(errorMessage(caught));
      setDeleting(false);
    }
  }

  return (
    <AppShell requiredRoles={['INSTRUCTOR']}>
      {!id ? (
        <ErrorState message="No question selected." />
      ) : question.loading ? (
        <PageSkeleton />
      ) : question.error || !question.data ? (
        <ErrorState message={question.error ?? 'Question not found.'} onRetry={question.refetch} />
      ) : (
        <>
          <PageHeader
            breadcrumbs={[
              { label: 'Question bank', href: '/instructor/questions/' },
              { label: 'Edit question' },
            ]}
            eyebrow={question.data.course?.title ?? 'Question bank'}
            title="Edit question"
            description={`Last updated ${formatDate(question.data.updatedAt)}. Changes apply to future assessments; existing attempts keep their snapshots.`}
            actions={
              <>
                <Badge tone="teal"><CheckCircle2 className="h-3 w-3" />Exactly one correct</Badge>
                <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            }
          />
          <div className="max-w-4xl">
            <QuestionForm
              courses={courses.data?.data ?? []}
              initial={question.data}
              saving={saving}
              error={error}
              submitLabel="Save changes"
              onSubmit={submit}
              onCancel={() => router.push('/instructor/questions/')}
            />
          </div>
          <ConfirmDialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            onConfirm={remove}
            loading={deleting}
            title="Delete this question?"
            description="If the question is already used by an assessment or attempt, the API will refuse to delete it."
            confirmLabel="Delete question"
          />
        </>
      )}
    </AppShell>
  );
}
