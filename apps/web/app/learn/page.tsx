'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  FileQuestion,
  Lock,
  Menu,
  PlayCircle,
  X,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type { AvailableAssessment, CourseDetail, Lesson } from '@/lib/types';
import { Badge, EmptyState, ErrorState, PageSkeleton, ProgressBar } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { RichText } from '@/components/ui/rich-text';
import { cn } from '@/lib/utils';

export default function LearnPage() {
  const courseId = useQueryParam('course');
  const initialLessonId = useQueryParam('lesson');
  const course = useApiQuery<CourseDetail>(courseId ? `/courses/${courseId}` : null);
  const assessments = useApiQuery<{ data: AvailableAssessment[] }>('/assessments/available');
  const toast = useToast();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const lessons = useMemo(
    () => (course.data?.modules ?? []).flatMap((module) => module.lessons),
    [course.data],
  );
  const active = lessons.find((lesson) => lesson.id === activeLessonId) ?? null;
  const activeModule = course.data?.modules.find((module) => module.id === active?.moduleId) ?? null;
  const activeIndex = active ? lessons.findIndex((lesson) => lesson.id === active.id) : -1;
  const previous = activeIndex > 0 ? lessons[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null;
  const completed = new Set(course.data?.completedLessonIds ?? []);
  const publishedLessons = lessons.filter((lesson) => lesson.published);
  const progress = publishedLessons.length
    ? Math.round((publishedLessons.filter((lesson) => completed.has(lesson.id)).length / publishedLessons.length) * 100)
    : 0;

  useEffect(() => {
    if (activeLessonId || !lessons.length) return;
    const requested = initialLessonId ? lessons.find((lesson) => lesson.id === initialLessonId) : null;
    setActiveLessonId(requested?.id ?? lessons[0].id);
  }, [lessons, activeLessonId, initialLessonId]);

  const courseAssessments = (assessments.data?.data ?? []).filter((item) => item.course.id === courseId);

  async function toggleComplete(lesson: Lesson) {
    setSaving(true);
    try {
      if (completed.has(lesson.id)) {
        await api.delete(`/lessons/${lesson.id}/complete`);
        toast.success('Lesson marked as incomplete.');
      } else {
        await api.post(`/lessons/${lesson.id}/complete`);
        toast.success('Lesson completed. Progress saved.');
      }
      course.refetch();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  function goToLesson(id: string) {
    setActiveLessonId(id);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!courseId) {
    return (
      <AppShell requiredRoles={['STUDENT']}>
        <ErrorState message="No course selected." />
      </AppShell>
    );
  }

  if (course.loading) {
    return (
      <AppShell requiredRoles={['STUDENT']}>
        <PageSkeleton />
      </AppShell>
    );
  }

  if (course.error || !course.data) {
    return (
      <AppShell requiredRoles={['STUDENT']}>
        <ErrorState message={course.error ?? 'Course not found.'} onRetry={course.refetch} />
      </AppShell>
    );
  }

  if (course.data.modules.length === 0) {
    return (
      <AppShell requiredRoles={['STUDENT']}>
        <EmptyState
          icon={BookOpen}
          title="This course has no lessons yet"
          description="The instructor is still building the curriculum. Check back soon."
          action={{ label: 'Back to my courses', href: '/my-courses/' }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell requiredRoles={['STUDENT']}>
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/my-courses/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-canvas text-slate-500 transition hover:bg-lavender hover:text-indigo" aria-label="Back to my courses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-ink">{course.data.title}</p>
            <p className="truncate text-[0.68rem] text-slate-400">
              {course.data.category} · {course.data.instructor.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:w-72">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[0.65rem] font-bold text-slate-500">
              <span>Course progress</span>
              <span className="text-ink">{progress}%</span>
            </div>
            <ProgressBar value={progress} className="mt-1.5" tone={progress >= 100 ? 'teal' : 'indigo'} />
          </div>
          <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setMobileNav(true)}>
            <Menu className="h-4 w-4" />
            Lessons
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <Curriculum
            course={course.data}
            activeLessonId={activeLessonId}
            completed={completed}
            onSelect={goToLesson}
            assessments={courseAssessments}
          />
        </aside>

        {mobileNav && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Close lesson navigator" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
            <div className="relative h-full w-[88%] max-w-sm overflow-y-auto bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-ink">Course lessons</p>
                <button type="button" onClick={() => setMobileNav(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Curriculum course={course.data} activeLessonId={activeLessonId} completed={completed} onSelect={goToLesson} assessments={courseAssessments} />
            </div>
          </div>
        )}

        <section className="min-w-0">
          {!active ? (
            <EmptyState icon={BookOpen} title="Select a lesson" description="Choose a lesson from the curriculum to start learning." />
          ) : !active.published ? (
            <EmptyState icon={Lock} title="This lesson is not published yet" description="The instructor is still preparing this lesson." />
          ) : (
            <article className="overflow-hidden rounded-2xl border border-white bg-white shadow-card">
              <div className="border-b border-slate-100 bg-gradient-to-br from-lavender/70 to-white px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="indigo">{activeModule?.title ?? 'Lesson'}</Badge>
                  <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {active.estimatedMinutes} minute read
                  </span>
                  {completed.has(active.id) && (
                    <Badge tone="teal">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </Badge>
                  )}
                </div>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{active.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={completed.has(active.id) ? 'secondary' : 'teal'}
                    onClick={() => toggleComplete(active)}
                    loading={saving}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {completed.has(active.id) ? 'Mark incomplete' : 'Mark complete'}
                  </Button>
                  {active.resourceUrl && (
                    <a
                      href={active.resourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[0.8rem] font-semibold text-slate-600 transition hover:border-indigo/30 hover:text-indigo"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Lesson resource
                    </a>
                  )}
                </div>
              </div>

              <div className="px-5 py-6 sm:px-7 sm:py-8">
                <RichText content={active.content} />
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                {previous ? (
                  <Button variant="ghost" size="sm" onClick={() => goToLesson(previous.id)}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="max-w-[160px] truncate">{previous.title}</span>
                  </Button>
                ) : (
                  <span />
                )}
                {next ? (
                  <Button size="sm" onClick={() => goToLesson(next.id)}>
                    <span className="max-w-[160px] truncate">{next.title}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <LinkButton href="/my-courses/" size="sm" variant="secondary">
                    Back to my courses
                  </LinkButton>
                )}
              </div>
            </article>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Curriculum({
  course,
  activeLessonId,
  completed,
  onSelect,
  assessments,
}: {
  course: CourseDetail;
  activeLessonId: string | null;
  completed: Set<string>;
  onSelect: (id: string) => void;
  assessments: AvailableAssessment[];
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-slate-400">Curriculum</p>
          <span className="text-[0.65rem] font-semibold text-slate-400">
            {course.modules.reduce((sum, module) => sum + module.lessons.length, 0)} lessons
          </span>
        </div>
        <div className="mt-3 space-y-3">
          {course.modules.map((module, moduleIndex) => (
            <div key={module.id}>
              <p className="px-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-indigo">
                Module {moduleIndex + 1}
              </p>
              <p className="px-1 text-xs font-bold leading-5 text-ink">{module.title}</p>
              <div className="mt-1.5 space-y-1">
                {module.lessons.map((lesson) => {
                  const isActive = lesson.id === activeLessonId;
                  const isDone = completed.has(lesson.id);
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => onSelect(lesson.id)}
                      disabled={!lesson.published}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-50',
                        isActive ? 'bg-lavender font-bold text-indigo' : 'font-medium text-slate-600 hover:bg-canvas',
                      )}
                    >
                      <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', isDone ? 'bg-softteal text-teal' : isActive ? 'bg-white text-indigo' : 'bg-slate-100 text-slate-400')}>
                        {isDone ? <CheckCircle2 className="h-3 w-3" /> : lesson.published ? <PlayCircle className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                      <span className="shrink-0 text-[0.6rem] text-slate-400">{lesson.estimatedMinutes}m</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-slate-400">Assessments</p>
          <ClipboardList className="h-4 w-4 text-slate-300" />
        </div>
        {assessments.length === 0 ? (
          <p className="mt-3 text-xs leading-5 text-slate-400">No assessments have been published for this course yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {assessments.map((assessment) => (
              <Link key={assessment.id} href={`/assessments/view/?id=${assessment.id}`} className="block rounded-xl border border-slate-100 p-3 transition hover:border-indigo/20 hover:bg-lavender/20">
                <p className="line-clamp-2 text-xs font-bold leading-5 text-ink">{assessment.title}</p>
                <p className="mt-1 flex items-center gap-2 text-[0.62rem] font-semibold text-slate-400">
                  <Clock className="h-3 w-3" />
                  {assessment.durationMinutes} min
                  <ChevronRight className="h-3 w-3" />
                  {assessment.attemptsRemaining} attempts left
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
