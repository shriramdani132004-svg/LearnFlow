'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Flame,
  GraduationCap,
  Layers,
  PlayCircle,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { useApiQuery } from '@/hooks/use-api';
import type {
  AvailableAssessment,
  InstructorAnalytics,
  MyEnrollment,
  StudentAnalytics,
} from '@/lib/types';
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  StatCard,
  StatusBadge,
} from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { TrendAreaChart } from '@/components/ui/charts';
import { ActivityFeed } from '@/components/data/activity-feed';
import { formatDate, formatDateTime, percent } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;

  const student = useApiQuery<StudentAnalytics>(role === 'STUDENT' ? '/analytics/student' : null);
  const enrollments = useApiQuery<{ data: MyEnrollment[] }>(role === 'STUDENT' ? '/enrollments/me' : null);
  const available = useApiQuery<{ data: AvailableAssessment[] }>(role === 'STUDENT' ? '/assessments/available' : null);
  const instructor = useApiQuery<InstructorAnalytics>(role === 'INSTRUCTOR' || role === 'ADMIN' ? '/analytics/instructor' : null);

  if (role === 'ADMIN') {
    return (
      <AppShell requiredRoles={['ADMIN']}>
        <PageHeader
          eyebrow="Administration"
          title={`Welcome, ${user?.name.split(' ')[0]}`}
          description="You are signed in with platform administrator access."
          actions={<LinkButton href="/admin/">Open admin overview</LinkButton>}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Admin workspace" value="Ready" hint="Users, roles and platform counts" icon={Trophy} tone="violet" />
          <StatCard label="Instructor tools" value="Available" hint="Courses, questions and assessments" icon={GraduationCap} tone="indigo" />
          <StatCard label="Student tools" value="Available" hint="Catalogue, learning and analytics" icon={BookOpen} tone="teal" />
        </div>
      </AppShell>
    );
  }

  if (role === 'INSTRUCTOR') {
    const data = instructor.data;
    if (instructor.loading) {
      return (
        <AppShell requiredRoles={['INSTRUCTOR']}>
          <PageSkeleton />
        </AppShell>
      );
    }
    if (instructor.error) {
      return (
        <AppShell requiredRoles={['INSTRUCTOR']}>
          <ErrorState message={instructor.error} onRetry={instructor.refetch} />
        </AppShell>
      );
    }
    return (
      <AppShell requiredRoles={['INSTRUCTOR']}>
        <PageHeader
          eyebrow="Instructor studio"
          title={`Good to see you, ${user?.name.split(' ')[0]}`}
          description="Your teaching workspace at a glance — live enrollment, assessment and completion data."
          actions={
            <>
              <LinkButton href="/instructor/assessments/new/" size="sm">
                New assessment
              </LinkButton>
              <LinkButton href="/instructor/courses/new/" size="sm" variant="secondary">
                New course
              </LinkButton>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Courses" value={data?.overview.totalCourses ?? 0} hint={`${data?.overview.publishedCourses ?? 0} published · ${data?.overview.draftCourses ?? 0} drafts`} icon={BookOpen} tone="indigo" />
          <StatCard label="Enrollments" value={data?.overview.totalEnrollments ?? 0} hint={`${data?.overview.activeLearners ?? 0} active learners`} icon={Users} tone="teal" />
          <StatCard label="Assessment attempts" value={data?.overview.totalAttempts ?? 0} hint={`${data?.overview.totalAssessments ?? 0} assessments`} icon={ClipboardList} tone="amber" />
          <StatCard label="Average score" value={percent(data?.overview.averageScore)} hint={`Pass rate ${percent(data?.overview.passRate)}`} icon={Target} tone="violet" />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">Course performance</p>
                <p className="mt-0.5 text-xs text-slate-400">Enrollment scale and average scores by course</p>
              </div>
              <Link href="/instructor/analytics/" className="inline-flex items-center gap-1 text-xs font-bold text-indigo hover:underline">
                Full analytics
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {!data || data.courses.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon={BookOpen}
                title="Create your first course"
                description="Add modules, lessons and a question bank, then publish when it is ready."
                action={{ label: 'Create a course', href: '/instructor/courses/new/' }}
              />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="lf-table min-w-[560px]">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Status</th>
                      <th>Enrolled</th>
                      <th>Assessments</th>
                      <th>Avg score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.courses.slice(0, 6).map((course) => (
                      <tr key={course.id}>
                        <td>
                          <Link href={`/instructor/courses/view/?id=${course.id}`} className="font-semibold text-ink hover:text-indigo">
                            {course.title}
                          </Link>
                          <p className="text-[0.68rem] text-slate-400">{course.category}</p>
                        </td>
                        <td><StatusBadge status={course.status} /></td>
                        <td>{course.enrollments}</td>
                        <td>{course.assessments}</td>
                        <td className="font-semibold text-ink">{percent(course.averageScore)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <p className="text-sm font-bold text-ink">Teaching snapshot</p>
              <div className="mt-4 space-y-3">
                <SnapshotRow label="Completion rate" value={percent(data?.overview.completionRate)} />
                <SnapshotRow label="Completed enrollments" value={data?.overview.completedEnrollments ?? 0} />
                <SnapshotRow label="Active learners" value={data?.overview.activeLearners ?? 0} />
              </div>
              <div className="mt-4 grid gap-2">
                <LinkButton href="/instructor/questions/new/" variant="secondary" size="sm">Add a question</LinkButton>
                <LinkButton href="/instructor/courses/" variant="ghost" size="sm">Manage courses</LinkButton>
              </div>
            </div>
            <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
              <p className="text-sm font-bold text-ink">Recent activity</p>
              <div className="mt-3">
                <ActivityFeed events={data?.recentActivity ?? []} emptyLabel="No teaching activity yet." compact />
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const analytics = student.data;
  const myCourses = enrollments.data?.data ?? [];
  const assessments = available.data?.data ?? [];
  const nextUp = myCourses.filter((item) => item.status === 'ACTIVE').slice(0, 3);
  const due = analytics?.upcomingDeadlines?.slice(0, 3) ?? [];
  const recommended = assessments.filter((item) => item.canStart).slice(0, 3);

  return (
    <AppShell requiredRoles={['STUDENT']}>
      <PageHeader
        eyebrow="Student dashboard"
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        description="Your learning, upcoming assessments and progress — all in one place."
        actions={<LinkButton href="/courses/" size="sm">Browse courses</LinkButton>}
      />

      {student.loading || enrollments.loading ? (
        <PageSkeleton />
      ) : student.error ? (
        <ErrorState message={student.error} onRetry={student.refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Enrolled courses" value={analytics?.overview.enrolledCourses ?? 0} hint={`${analytics?.overview.completedCourses ?? 0} completed`} icon={BookOpen} tone="indigo" />
            <StatCard label="Lesson progress" value={percent(analytics?.overview.overallLessonProgress)} hint={`${analytics?.overview.completedLessons ?? 0} of ${analytics?.overview.totalLessons ?? 0} lessons`} icon={Layers} tone="teal" />
            <StatCard label="Average score" value={percent(analytics?.overview.averageScore)} hint={`Best ${percent(analytics?.overview.bestScore)}`} icon={Target} tone="amber" />
            <StatCard label="Assessments open" value={analytics?.overview.availableAssessments ?? 0} hint={`${analytics?.overview.completedAssessments ?? 0} attempts completed`} icon={ClipboardList} tone="violet" />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">Continue learning</p>
                    <p className="mt-0.5 text-xs text-slate-400">Pick up an active course</p>
                  </div>
                  <Link href="/my-courses/" className="inline-flex items-center gap-1 text-xs font-bold text-indigo hover:underline">
                    All courses
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {nextUp.length === 0 ? (
                  <EmptyState
                    className="mt-4"
                    icon={BookOpen}
                    title="You have not enrolled in a course yet"
                    description="Find a published course that matches your goal, enrol for free and start the first lesson."
                    action={{ label: 'Explore the catalogue', href: '/courses/' }}
                  />
                ) : (
                  <div className="mt-4 space-y-3">
                    {nextUp.map((enrollment) => (
                      <Link
                        key={enrollment.id}
                        href={`/learn/?course=${enrollment.course.id}`}
                        className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-canvas/50 p-4 transition hover:border-indigo/20 hover:bg-lavender/30"
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo to-violet text-white">
                          <BookOpen className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-ink">{enrollment.course.title}</p>
                            <Badge tone="slate">{enrollment.course.level}</Badge>
                          </div>
                          <p className="mt-0.5 text-[0.68rem] text-slate-400">{enrollment.course.category} · {enrollment.course.instructor.name}</p>
                          <div className="mt-2 flex items-center gap-3">
                            <ProgressBar value={enrollment.progressPercentage} className="flex-1" tone={enrollment.progressPercentage >= 100 ? 'teal' : 'indigo'} />
                            <span className="text-[0.68rem] font-bold text-slate-500">{enrollment.progressPercentage}%</span>
                          </div>
                        </div>
                        <PlayCircle className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-indigo" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">Score trend</p>
                    <p className="mt-0.5 text-xs text-slate-400">Released assessment results over time</p>
                  </div>
                  <Link href="/analytics/" className="inline-flex items-center gap-1 text-xs font-bold text-indigo hover:underline">
                    Learning analytics
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {analytics?.trend.length ? (
                  <div className="mt-4">
                    <TrendAreaChart
                      data={analytics.trend.slice(-8).map((point) => ({
                        label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(point.submittedAt)),
                        value: Math.round(point.percentage),
                      }))}
                      height={220}
                    />
                  </div>
                ) : (
                  <p className="mt-6 rounded-xl bg-canvas px-4 py-8 text-center text-sm text-slate-400">
                    Take a published assessment to start building your score trend.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ink">Up next</p>
                  <Badge tone="amber">{assessments.filter((item) => item.canStart).length} available</Badge>
                </div>
                {recommended.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-canvas px-4 py-6 text-center text-xs leading-5 text-slate-400">
                    No assessments are open right now. Enrol in more courses or check back later.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {recommended.map((assessment) => (
                      <Link key={assessment.id} href={`/assessments/view/?id=${assessment.id}`} className="block rounded-xl border border-slate-100 p-3.5 transition hover:border-indigo/20 hover:bg-lavender/20">
                        <p className="line-clamp-2 text-xs font-bold leading-5 text-ink">{assessment.title}</p>
                        <p className="mt-0.5 text-[0.65rem] text-slate-400">{assessment.course.title}</p>
                        <div className="mt-2 flex items-center gap-3 text-[0.65rem] font-semibold text-slate-500">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{assessment.durationMinutes} min</span>
                          <span className="inline-flex items-center gap-1"><ClipboardList className="h-3 w-3" />{assessment.totalQuestions} questions</span>
                          <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" />{assessment.attemptsRemaining} left</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {due.length > 0 && (
                <div className="rounded-2xl border border-amber/20 bg-amber-50/60 p-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    <CalendarClock className="h-4 w-4 text-amber" />
                    Closing soon
                  </p>
                  <div className="mt-3 space-y-2.5">
                    {due.map((deadline) => (
                      <Link key={deadline.id} href={`/assessments/view/?id=${deadline.id}`} className="block rounded-xl bg-white/80 p-3 transition hover:bg-white">
                        <p className="text-xs font-bold text-ink">{deadline.title}</p>
                        <p className="mt-0.5 text-[0.65rem] text-slate-500">{deadline.course.title}</p>
                        <p className="mt-1 text-[0.65rem] font-semibold text-[#B45309]">Closes {formatDateTime(deadline.availableUntil)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-gradient-to-br from-indigo to-violet p-5 text-white shadow-lift">
                <Trophy className="h-5 w-5 text-white/80" />
                <p className="mt-2 text-sm font-bold">Pass rate</p>
                <p className="mt-1 text-3xl font-extrabold">{percent(analytics?.overview.passRate)}</p>
                <p className="mt-1 text-xs text-white/60">Across every graded attempt on your account.</p>
                <LinkButton href="/history/" variant="light" size="sm" className="mt-4">
                  View attempt history
                </LinkButton>
              </div>

              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ink">Recent activity</p>
                  <BarChart3 className="h-4 w-4 text-slate-300" />
                </div>
                <div className="mt-3">
                  <ActivityFeed events={analytics?.recentActivity?.slice(0, 4) ?? []} emptyLabel="Your learning activity will appear here." compact />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function SnapshotRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3.5 py-2.5">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-xs font-bold text-ink">{value}</p>
    </div>
  );
}
