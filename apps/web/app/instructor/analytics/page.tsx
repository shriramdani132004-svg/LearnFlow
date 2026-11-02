'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileQuestion,
  GraduationCap,
  Layers,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import type { CourseAnalytics, InstructorAnalytics } from '@/lib/types';
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  Select,
  StatCard,
  StatusBadge,
} from '@/components/ui/primitives';
import { LinkButton } from '@/components/ui/link-button';
import { DistributionChart, TopicBarChart } from '@/components/ui/charts';
import { ActivityFeed } from '@/components/data/activity-feed';
import { formatDate, percent } from '@/lib/utils';

export default function InstructorAnalyticsPage() {
  const courseParam = useQueryParam('course');
  const [courseId, setCourseId] = useState('');
  const overview = useApiQuery<InstructorAnalytics>('/analytics/instructor');
  const courseAnalytics = useApiQuery<CourseAnalytics>(courseId ? `/analytics/courses/${courseId}` : null);

  useEffect(() => {
    if (courseParam) setCourseId(courseParam);
  }, [courseParam]);

  const data = overview.data;
  const courses = data?.courses ?? [];
  const selected = courses.find((course) => course.id === courseId);

  return (
    <AppShell requiredRoles={['INSTRUCTOR']}>
      <PageHeader
        eyebrow="Teaching analytics"
        title="See where learning happens"
        description="Enrolment, lesson completion and assessment performance across the courses you teach."
        actions={
          <LinkButton href="/instructor/courses/" size="sm" variant="secondary">
            <BookOpen className="h-4 w-4" />
            My courses
          </LinkButton>
        }
      />

      {overview.loading && !data ? (
        <PageSkeleton />
      ) : overview.error || !data ? (
        <ErrorState message={overview.error ?? 'Analytics unavailable.'} onRetry={overview.refetch} />
      ) : !data.hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Analytics need live activity"
          description="Publish a course, add lessons and create an assessment. Insights will appear as students enrol and learn."
          action={{ label: 'Create a course', href: '/instructor/courses/new/' }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Enrolments" value={data.overview.totalEnrollments} hint={`${data.overview.activeLearners} active learners`} icon={Users} tone="indigo" />
            <StatCard label="Completion rate" value={percent(data.overview.completionRate)} hint={`${data.overview.completedEnrollments} completed`} icon={CheckCircle2} tone="teal" />
            <StatCard label="Average score" value={percent(data.overview.averageScore)} hint={`${data.overview.totalAttempts} assessment attempts`} icon={Target} tone="amber" />
            <StatCard label="Pass rate" value={percent(data.overview.passRate)} hint={`${data.overview.totalAssessments} assessments`} icon={TrendingUp} tone="violet" />
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-card sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender text-indigo">
                <Layers className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[0.68rem] font-bold text-ink">Deep-dive into one course</p>
                <p className="text-[0.62rem] text-slate-400">Choose a course for lesson and assessment detail</p>
              </div>
            </div>
            <Select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              aria-label="Select course analytics"
              className="sm:ml-auto sm:w-72"
            >
              <option value="">All courses summary</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </Select>
            {courseId && (
              <LinkButton href={`/instructor/students/?course=${courseId}`} size="sm" variant="secondary">
                <Users className="h-4 w-4" />
                Roster
              </LinkButton>
            )}
          </div>

          {courseId ? (
            courseAnalytics.loading && !courseAnalytics.data ? (
              <div className="mt-5"><PageSkeleton /></div>
            ) : courseAnalytics.error || !courseAnalytics.data ? (
              <ErrorState className="mt-5" message={courseAnalytics.error ?? 'Course analytics unavailable.'} onRetry={courseAnalytics.refetch} />
            ) : (
              <CourseDeepDive data={courseAnalytics.data} />
            )
          ) : (
            <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">Enrolment trend</p>
                      <p className="mt-0.5 text-xs text-slate-400">New enrolments by week across your courses</p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-slate-300" />
                  </div>
                  {data.enrollmentTrend.length ? (
                    <div className="mt-4">
                      <DistributionChart
                        data={data.enrollmentTrend.map((point) => ({ range: point.week, count: point.count }))}
                        height={230}
                      />
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-canvas px-4 py-10 text-center text-sm text-slate-400">No enrolments in the recent window yet.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                  <p className="text-sm font-bold text-ink">Course performance</p>
                  <p className="mt-0.5 text-xs text-slate-400">Enrolment, completion and assessment outcomes per course</p>
                  {(data.courses.length ?? 0) === 0 ? (
                    <EmptyState className="mt-4" icon={BookOpen} title="No courses yet" description="Create a course to start tracking teaching analytics." />
                  ) : (
                    <div className="mt-4 space-y-3">
                      {data.courses.map((course) => (
                        <div key={course.id} className="rounded-xl border border-slate-100 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <StatusBadge status={course.status} />
                                <Badge tone="indigo">{course.category}</Badge>
                              </div>
                              <Link href={`/instructor/courses/view/?id=${course.id}`} className="mt-1 block text-sm font-bold text-ink transition hover:text-indigo">
                                {course.title}
                              </Link>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCourseId(course.id)}
                              className="inline-flex shrink-0 items-center gap-1 text-[0.68rem] font-semibold text-indigo transition hover:text-indigo-700"
                            >
                              Open analytics
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                            <MiniMetric label="Enrolled" value={course.enrollments} />
                            <MiniMetric label="Completed" value={course.completedEnrollments} />
                            <MiniMetric label="Assessments" value={course.assessments} />
                            <MiniMetric label="Attempts" value={course.attempts} />
                            <MiniMetric label="Avg score" value={percent(course.averageScore)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                  <p className="text-sm font-bold text-ink">Teaching snapshot</p>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <MiniStat label="Courses" value={data.overview.totalCourses} />
                    <MiniStat label="Published" value={data.overview.publishedCourses} />
                    <MiniStat label="Drafts" value={data.overview.draftCourses} />
                    <MiniStat label="Learners" value={data.overview.activeLearners} />
                  </div>
                </div>

                <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                  <p className="text-sm font-bold text-ink">Recent activity</p>
                  <div className="mt-3">
                    <ActivityFeed events={data.recentActivity} compact emptyLabel="Your teaching activity will appear here." />
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-lavender to-white p-5 ring-1 ring-indigo/10">
                  <FileQuestion className="h-5 w-5 text-indigo" />
                  <p className="mt-2 text-sm font-bold text-ink">Turn insight into action</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Low topic accuracy can point to a lesson that needs a clearer explanation or a new practice question.
                  </p>
                  <div className="mt-3 space-y-2">
                    <LinkButton href="/instructor/questions/new/" size="sm" variant="secondary" className="w-full">Add a question</LinkButton>
                    <LinkButton href="/instructor/assessments/new/" size="sm" className="w-full">Create an assessment</LinkButton>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

function CourseDeepDive({ data }: { data: CourseAnalytics }) {
  return (
    <>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Enrolments" value={data.overview.totalEnrollments} hint={`${data.overview.activeEnrollments} active`} icon={Users} tone="indigo" />
        <StatCard label="Completion" value={percent(data.overview.completionRate)} hint={`${data.overview.completedEnrollments} students`} icon={CheckCircle2} tone="teal" />
        <StatCard label="Lesson progress" value={percent(data.overview.averageLessonProgress)} hint={`${data.overview.lessonCompletions} completions`} icon={BookOpen} tone="amber" />
        <StatCard label="Pass rate" value={percent(data.overview.passRate)} hint={`${data.overview.totalAttempts} attempts`} icon={GraduationCap} tone="violet" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-ink">{data.course.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {data.overview.totalPublishedLessons} published lessons · created {formatDate(data.course.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={data.course.status} />
                <Badge tone="indigo">{data.course.category}</Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <MiniMetric label="Lesson completions" value={data.overview.lessonCompletions} />
              <MiniMetric label="Assessments" value={data.overview.totalAssessments} />
              <MiniMetric label="Average score" value={percent(data.overview.averageScore)} />
            </div>
          </div>

          <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">Assessment performance</p>
                <p className="mt-0.5 text-xs text-slate-400">Attempts and pass outcomes by assessment</p>
              </div>
              <BarChart3 className="h-4 w-4 text-slate-300" />
            </div>
            {data.assessments.length === 0 ? (
              <EmptyState className="mt-4" icon={FileQuestion} title="No assessments yet" description="Create an assessment to measure learning in this course." action={{ label: 'Create an assessment', href: `/instructor/assessments/new/?course=${data.course.id}` }} />
            ) : (
              <div className="mt-4 space-y-3">
                {data.assessments.map((assessment) => (
                  <div key={assessment.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-ink">{assessment.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge tone={assessment.published ? 'teal' : 'amber'}>{assessment.published ? 'Published' : 'Draft'}</Badge>
                        <span className="text-[0.65rem] text-slate-400">{assessment.attempts} attempts</span>
                      </div>
                    </div>
                    <LinkButton href={`/instructor/assessments/results/?id=${assessment.id}`} size="sm" variant="secondary">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Report
                    </LinkButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">Enrolment trend</p>
                <p className="mt-0.5 text-xs text-slate-400">Weekly course enrolments</p>
              </div>
              <TrendingUp className="h-4 w-4 text-slate-300" />
            </div>
            {data.enrollmentTrend.length ? (
              <div className="mt-4">
                <DistributionChart data={data.enrollmentTrend.map((point) => ({ range: point.week, count: point.count }))} height={220} />
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-canvas px-4 py-10 text-center text-sm text-slate-400">No recent enrolments.</p>
            )}
          </div>

          <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
            <p className="text-sm font-bold text-ink">Course health</p>
            <div className="mt-3 space-y-3">
              <HealthRow label="Average lesson progress" value={data.overview.averageLessonProgress} />
              <HealthRow label="Completion rate" value={data.overview.completionRate} />
              <HealthRow label="Assessment pass rate" value={data.overview.passRate} />
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-ink to-[#273B8F] p-5 text-white shadow-lift">
            <Target className="h-5 w-5 text-[#B9BBFF]" />
            <p className="mt-2 text-sm font-bold">Course links</p>
            <div className="mt-3 space-y-2">
              <Link href={`/instructor/students/?course=${data.course.id}`} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-[0.68rem] font-semibold text-white transition hover:bg-white/20">
                Student roster <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href={`/instructor/courses/view/?id=${data.course.id}`} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-[0.68rem] font-semibold text-white transition hover:bg-white/20">
                Manage curriculum <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href={`/instructor/assessments/?course=${data.course.id}`} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-[0.68rem] font-semibold text-white transition hover:bg-white/20">
                Assessment studio <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function HealthRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[0.68rem]">
        <span className="font-semibold text-slate-500">{label}</span>
        <span className="font-bold text-ink">{percent(value)}</span>
      </div>
      <ProgressBar value={value ?? 0} tone={(value ?? 0) >= 70 ? 'teal' : (value ?? 0) >= 40 ? 'amber' : 'coral'} className="mt-1.5" />
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-2.5">
      <p className="text-[0.6rem] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold text-ink">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-canvas p-3 text-center">
      <p className="text-xl font-extrabold text-ink">{value}</p>
      <p className="mt-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
