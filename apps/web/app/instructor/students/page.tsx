'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  Search,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import type { CourseSummary, Paginated, Roster } from '@/lib/types';
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  Select,
  StatCard,
  StatusBadge,
} from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Pagination } from '@/components/ui/pagination';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function InstructorStudentsPage() {
  const courseParam = useQueryParam('course');
  const courses = useApiQuery<Paginated<CourseSummary>>('/courses', { mine: true, limit: 100 });
  const courseList = courses.data?.data ?? [];

  const [courseId, setCourseId] = useState('');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (courseId) return;
    if (courseParam && courseList.some((course) => course.id === courseParam)) {
      setCourseId(courseParam);
      return;
    }
    if (courseList.length > 0) setCourseId(courseList[0].id);
  }, [courseParam, courseList, courseId]);

  const query = useMemo(
    () => ({
      page,
      limit: 15,
      search: applied || undefined,
    }),
    [page, applied],
  );
  const roster = useApiQuery<Roster>(courseId ? `/courses/${courseId}/enrollments` : null, query);
  const selectedCourse = courseList.find((course) => course.id === courseId);

  return (
    <AppShell requiredRoles={['INSTRUCTOR']}>
      <PageHeader
        breadcrumbs={[{ label: 'My courses', href: '/instructor/courses/' }, { label: 'Roster' }]}
        eyebrow="Students"
        title="Course roster"
        description="See who is enrolled, how far they have progressed and when they were last active."
        actions={
          courseId ? (
            <>
              <LinkButton href={`/instructor/analytics/?course=${courseId}`} size="sm" variant="secondary">
                <ArrowUpRight className="h-4 w-4" />
                Course analytics
              </LinkButton>
              <LinkButton href={`/instructor/courses/view/?id=${courseId}`} size="sm" variant="ghost">
                Manage course
              </LinkButton>
            </>
          ) : undefined
        }
      />

      {courses.loading && !courses.data ? (
        <PageSkeleton />
      ) : courses.error ? (
        <ErrorState message={courses.error} onRetry={courses.refetch} />
      ) : courseList.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create and publish a course before students can enrol and appear in a roster."
          action={{ label: 'Create a course', href: '/instructor/courses/new/' }}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-card sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender text-indigo">
                <GraduationCap className="h-4 w-4" />
              </span>
              <Select
                value={courseId}
                onChange={(event) => {
                  setCourseId(event.target.value);
                  setPage(1);
                  setSearch('');
                  setApplied('');
                }}
                aria-label="Select a course"
                className="sm:w-72"
              >
                {courseList.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </Select>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                setApplied(search.trim());
              }}
              className="relative ml-auto flex w-full gap-2 sm:w-auto"
            >
              <div className="relative flex-1 sm:w-64">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="pl-10" />
              </div>
              <Button type="submit" size="sm" variant="secondary">Search</Button>
            </form>
          </div>

          {roster.loading && !roster.data ? (
            <PageSkeleton />
          ) : roster.error ? (
            <ErrorState message={roster.error} onRetry={roster.refetch} />
          ) : !roster.data ? (
            <ErrorState message="Roster unavailable." />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Enrolled" value={roster.data.meta.total} hint={selectedCourse?.title ?? 'Selected course'} icon={Users} tone="indigo" />
                <StatCard label="Active" value={roster.data.summary.active} hint="Currently learning" icon={BookOpen} tone="teal" />
                <StatCard label="Completed" value={roster.data.summary.completed} hint="Finished the course" icon={GraduationCap} tone="amber" />
                <StatCard label="Lessons" value={roster.data.summary.totalLessons} hint="Published lessons in this course" icon={BookOpen} tone="violet" />
              </div>

              {selectedCourse && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white bg-white px-4 py-3 shadow-card">
                  <StatusBadge status={selectedCourse.status} />
                  <Badge tone="indigo">{selectedCourse.category}</Badge>
                  <span className="text-[0.68rem] text-slate-400">
                    Created {formatDate(selectedCourse.createdAt)} · {selectedCourse.level}
                  </span>
                  <Link href={`/courses/view/?id=${selectedCourse.id}`} className="ml-auto text-[0.68rem] font-semibold text-indigo transition hover:text-indigo-700">
                    View public page
                  </Link>
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-white bg-white p-5 shadow-card">
                {(roster.data.data.length ?? 0) === 0 ? (
                  <EmptyState
                    icon={Users}
                    title={applied ? 'No students match' : 'No students enrolled yet'}
                    description={applied ? 'Try a different name or email.' : 'Share the public course page so learners can enrol. The roster updates live.'}
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">
                            <th className="pb-2 pr-4">Student</th>
                            <th className="pb-2 pr-4">Status</th>
                            <th className="pb-2 pr-4">Progress</th>
                            <th className="pb-2 pr-4">Enrolled</th>
                            <th className="pb-2">Last login</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {roster.data.data.map((entry) => (
                            <tr key={entry.id}>
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={entry.student.name} src={entry.student.avatarUrl} size="sm" />
                                  <div className="min-w-0">
                                    <p className="truncate font-bold text-ink">{entry.student.name}</p>
                                    <p className="truncate text-[0.65rem] text-slate-400">{entry.student.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 pr-4"><StatusBadge status={entry.status} /></td>
                              <td className="py-3 pr-4">
                                <div className="min-w-[150px]">
                                  <div className="flex items-center justify-between text-[0.65rem]">
                                    <span className="text-slate-400">{entry.completedLessons}/{entry.totalLessons} lessons</span>
                                    <span className="font-bold text-ink">{entry.progressPercentage}%</span>
                                  </div>
                                  <ProgressBar value={entry.progressPercentage} tone={entry.progressPercentage >= 100 ? 'teal' : 'indigo'} className="mt-1" />
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-slate-500">{formatDate(entry.enrolledAt)}</td>
                              <td className="py-3 text-slate-500">{entry.student.lastLoginAt ? formatDateTime(entry.student.lastLoginAt) : 'Never'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination meta={roster.data.meta} onPageChange={setPage} />
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
