'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, BookOpen, CalendarClock, ClipboardList, Layers, Target, TrendingUp, Trophy } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery } from '@/hooks/use-api';
import type { StudentAnalytics } from '@/lib/types';
import { Badge, EmptyState, ErrorState, PageHeader, PageSkeleton, ProgressBar, StatCard } from '@/components/ui/primitives';
import { TrendAreaChart, TopicBarChart } from '@/components/ui/charts';
import { ActivityFeed } from '@/components/data/activity-feed';
import { formatDateTime, percent } from '@/lib/utils';

export default function StudentAnalyticsPage() {
  const { data, loading, error, refetch } = useApiQuery<StudentAnalytics>('/analytics/student');

  return (
    <AppShell requiredRoles={['STUDENT']}>
      <PageHeader
        eyebrow="Learning analytics"
        title="Your progress, measured honestly"
        description="Scores, topic accuracy and lesson completion from your real learning activity."
        actions={<Link href="/history/" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo/20 bg-white px-3.5 text-[0.8rem] font-semibold text-indigo transition hover:bg-indigo-50"><ClipboardList className="h-4 w-4" />Attempt history</Link>}
      />

      {loading ? (
        <PageSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? 'Analytics unavailable.'} onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Course progress" value={percent(data.overview.overallLessonProgress)} hint={`${data.overview.completedLessons} of ${data.overview.totalLessons} lessons`} icon={Layers} tone="indigo" />
            <StatCard label="Average score" value={percent(data.overview.averageScore)} hint="Across released results" icon={Target} tone="teal" />
            <StatCard label="Pass rate" value={percent(data.overview.passRate)} hint={`${data.overview.completedAssessments} completed attempts`} icon={Trophy} tone="amber" />
            <StatCard label="Best score" value={percent(data.overview.bestScore)} hint={`${data.overview.enrolledCourses} enrolled courses`} icon={TrendingUp} tone="violet" />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">Score trend</p>
                    <p className="mt-0.5 text-xs text-slate-400">Released assessment percentages over time</p>
                  </div>
                  <BarChart3 className="h-4 w-4 text-slate-300" />
                </div>
                {data.trend.length ? (
                  <div className="mt-4">
                    <TrendAreaChart
                      data={data.trend.map((point) => ({
                        label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(point.submittedAt)),
                        value: Math.round(point.percentage),
                      }))}
                    />
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-canvas px-4 py-10 text-center text-sm text-slate-400">
                    No released assessment results yet. Your score trend will build as you complete assessments.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">Topic accuracy</p>
                    <p className="mt-0.5 text-xs text-slate-400">Share of correct answers by question topic</p>
                  </div>
                  <Target className="h-4 w-4 text-slate-300" />
                </div>
                {data.topics.length ? (
                  <div className="mt-4">
                    <TopicBarChart data={data.topics.slice(0, 8).map((topic) => ({ name: topic.topic, value: Math.round(topic.accuracy) }))} />
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {data.topics.slice(0, 8).map((topic) => (
                        <div key={topic.topic} className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-[0.68rem]">
                          <span className="truncate font-semibold text-slate-600">{topic.topic}</span>
                          <span className="shrink-0 font-bold text-ink">{topic.correct}/{topic.responses}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-canvas px-4 py-10 text-center text-sm text-slate-400">
                    Topic accuracy appears after your first graded attempt.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">Course progress</p>
                    <p className="mt-0.5 text-xs text-slate-400">Lessons completed in each enrolment</p>
                  </div>
                  <BookOpen className="h-4 w-4 text-slate-300" />
                </div>
                {data.courses.length === 0 ? (
                  <EmptyState className="mt-4" icon={BookOpen} title="No enrolled courses" description="Enrol in a published course to start tracking progress." action={{ label: 'Browse courses', href: '/courses/' }} />
                ) : (
                  <div className="mt-4 space-y-4">
                    {data.courses.map((course) => (
                      <div key={course.enrollmentId}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-ink">{course.title}</p>
                            <p className="text-[0.65rem] text-slate-400">{course.category} · {course.completedLessons}/{course.totalLessons} lessons</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge tone={course.status === 'COMPLETED' ? 'teal' : 'slate'}>{course.status === 'COMPLETED' ? 'Completed' : 'Active'}</Badge>
                            <span className="text-xs font-bold text-ink">{course.progressPercentage}%</span>
                          </div>
                        </div>
                        <ProgressBar value={course.progressPercentage} tone={course.progressPercentage >= 100 ? 'teal' : 'indigo'} className="mt-1.5" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <p className="text-sm font-bold text-ink">Learning snapshot</p>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <MiniStat label="Enrolled" value={data.overview.enrolledCourses} />
                  <MiniStat label="Completed" value={data.overview.completedCourses} />
                  <MiniStat label="Assessments" value={data.overview.availableAssessments} />
                  <MiniStat label="Attempts" value={data.overview.completedAssessments} />
                </div>
              </div>

              {data.upcomingDeadlines.length > 0 ? (
                <div className="rounded-2xl border border-amber/20 bg-amber-50/60 p-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    <CalendarClock className="h-4 w-4 text-amber" />
                    Assessment deadlines
                  </p>
                  <div className="mt-3 space-y-2">
                    {data.upcomingDeadlines.map((deadline) => (
                      <Link key={deadline.id} href={`/assessments/view/?id=${deadline.id}`} className="block rounded-xl bg-white/80 p-3 transition hover:bg-white">
                        <p className="text-xs font-bold text-ink">{deadline.title}</p>
                        <p className="mt-0.5 text-[0.65rem] text-slate-500">{deadline.course.title}</p>
                        <p className="mt-1 text-[0.65rem] font-semibold text-[#B45309]">Closes {formatDateTime(deadline.availableUntil)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink"><CalendarClock className="h-4 w-4 text-slate-300" />No upcoming deadlines</p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">Assessments with an end date will appear here.</p>
                </div>
              )}

              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ink">Recent activity</p>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </div>
                <div className="mt-3">
                  <ActivityFeed events={data.recentActivity.slice(0, 6)} compact emptyLabel="Your learning activity will appear here." />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
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
