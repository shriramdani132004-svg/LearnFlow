'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  Lock,
  PlayCircle,
  Users,
} from 'lucide-react';
import { PublicFooter, PublicHeader } from '@/components/layout/public-layout';
import { Badge, ErrorState, PageSkeleton, ProgressBar } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import { useAuth } from '@/components/providers/auth-provider';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type { CourseDetail } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

export default function CourseDetailPage() {
  const id = useQueryParam('id');
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [enrolling, setEnrolling] = useState(false);
  const { data: course, loading, error, refetch } = useApiQuery<CourseDetail>(id ? `/courses/${id}` : null);

  const isOwner = Boolean(user && course && (user.role === 'ADMIN' || course.instructor.id === user.id));
  const enrolled = Boolean(course?.viewerEnrollment && course.viewerEnrollment.status !== 'CANCELLED');
  const totalLessons = course?.modules.reduce((sum, module) => sum + module.lessons.length, 0) ?? 0;
  const completed = course?.completedLessonIds.length ?? 0;
  const progress = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;

  async function enroll() {
    if (!course) return;
    if (!user) {
      router.push(`/login/?next=${encodeURIComponent(`/courses/view/?id=${course.id}`)}`);
      return;
    }
    setEnrolling(true);
    try {
      await api.post(`/courses/${course.id}/enroll`);
      toast.success('You are enrolled. Every lesson is now unlocked.');
      refetch();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setEnrolling(false);
    }
  }

  if (!id) {
    return (
      <Shell>
        <ErrorState message="No course was selected. Return to the catalogue to choose a course." />
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <PageSkeleton />
      </Shell>
    );
  }

  if (error || !course) {
    return (
      <Shell>
        <ErrorState message={error ?? 'Course not found.'} onRetry={refetch} />
      </Shell>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader />
      <main>
        <section className="relative overflow-hidden bg-ink">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
          <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <Link href="/courses/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 transition hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to catalogue
            </Link>
            <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="indigo">{course.category}</Badge>
                  <Badge tone="teal">{course.level}</Badge>
                  <Badge tone="amber">{course.status}</Badge>
                </div>
                <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                  {course.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">{course.description}</p>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-white/60">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-[#B9BBFF]" />
                    {course.instructor.name}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-[#B9BBFF]" />
                    {course.modules.length} modules · {totalLessons} lessons
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#B9BBFF]" />
                    {course.enrollmentCount} enrolled
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-[#B9BBFF]" />
                    {course.assessmentCount} assessments
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                {enrolled || isOwner ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">Your progress</p>
                      <span className="text-sm font-extrabold text-white">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} tone={progress >= 100 ? 'teal' : 'indigo'} className="mt-3 [&>div]:bg-white/15" />
                    <p className="mt-3 text-xs text-white/50">
                      {completed} of {totalLessons} lessons complete
                      {course.viewerEnrollment?.completedAt ? ` · finished ${formatDate(course.viewerEnrollment.completedAt)}` : ''}
                    </p>
                    <LinkButton href={`/learn/?course=${course.id}`} size="lg" className="mt-4 w-full">
                      <PlayCircle className="h-4 w-4" />
                      {progress > 0 ? 'Continue learning' : 'Start learning'}
                    </LinkButton>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">Start this course</p>
                    <p className="mt-2 text-sm leading-6 text-white/65">
                      Enrol to unlock every lesson and any assessments published for this course.
                    </p>
                    <Button size="lg" className="mt-4 w-full" onClick={enroll} loading={enrolling} disabled={course.status !== 'PUBLISHED'}>
                      {course.status !== 'PUBLISHED' ? 'Not yet published' : user ? 'Enrol now — free' : 'Sign in to enrol'}
                      {course.status === 'PUBLISHED' && !enrolling && <ArrowRight className="h-4 w-4" />}
                    </Button>
                    <p className="mt-2.5 text-center text-[0.68rem] text-white/35">No payment required. Progress saves automatically.</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_0.6fr] lg:px-8">
          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-indigo">Curriculum</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-ink">What you will learn</h2>
              </div>
              <p className="text-xs font-semibold text-slate-400">{totalLessons} lessons</p>
            </div>

            {course.modules.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-indigo/15 bg-white/60 px-6 py-10 text-center">
                <p className="text-sm font-bold text-ink">Curriculum coming soon</p>
                <p className="mt-1 text-sm text-slate-500">The instructor is still building this course.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {course.modules.map((module, moduleIndex) => (
                  <div key={module.id} className="overflow-hidden rounded-2xl border border-white bg-white shadow-card">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lavender text-xs font-extrabold text-indigo">
                          {String(moduleIndex + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-ink">{module.title}</p>
                          {module.description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{module.description}</p>}
                        </div>
                      </div>
                      <span className="shrink-0 text-[0.68rem] font-semibold text-slate-400">{module.lessons.length} lessons</span>
                    </div>
                    <ul className="divide-y divide-slate-50">
                      {module.lessons.map((lesson) => {
                        const done = course.completedLessonIds.includes(lesson.id);
                        const canOpen = enrolled || isOwner;
                        return (
                          <li key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', done ? 'bg-softteal text-teal' : 'bg-slate-100 text-slate-400')}>
                              {done ? <CheckCircle2 className="h-4 w-4" /> : canOpen ? <PlayCircle className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-700">{lesson.title}</p>
                              {!lesson.published && <span className="text-[0.62rem] font-bold uppercase tracking-wide text-amber">Draft lesson</span>}
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-1 text-[0.68rem] text-slate-400">
                              <Clock className="h-3.5 w-3.5" />
                              {lesson.estimatedMinutes} min
                            </span>
                            {canOpen && (
                              <Link href={`/learn/?course=${course.id}&lesson=${lesson.id}`} className="text-xs font-bold text-indigo hover:underline">
                                Open
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-slate-400">Instructor</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo to-violet text-sm font-extrabold text-white">
                  {course.instructor.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{course.instructor.name}</p>
                  <p className="text-xs text-slate-400">Course author</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                This course is delivered on LearnFlow with structured lessons, timed assessments and
                automatic grading.
              </p>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-lavender to-white p-5 ring-1 ring-indigo/10">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-indigo">Course includes</p>
              <ul className="mt-3 space-y-2.5 text-xs font-medium text-slate-600">
                {[
                  `${totalLessons} structured lessons`,
                  `${course.modules.length} modules`,
                  `${course.assessmentCount} graded assessments`,
                  'Autosaved assessment answers',
                  'Progress tracking and analytics',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {isOwner && (
              <LinkButton href={`/instructor/courses/view/?id=${course.id}`} variant="dark" className="w-full">
                Manage in instructor studio
              </LinkButton>
            )}
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">{children}</main>
      <PublicFooter />
    </div>
  );
}
