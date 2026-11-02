'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery } from '@/hooks/use-api';
import type { AdminStats } from '@/lib/types';
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  ProgressBar,
  StatCard,
} from '@/components/ui/primitives';
import { LinkButton } from '@/components/ui/link-button';
import { ActivityFeed } from '@/components/data/activity-feed';

export default function AdminOverviewPage() {
  const { data, loading, error, refetch } = useApiQuery<AdminStats>('/admin/stats');

  return (
    <AppShell requiredRoles={['ADMIN']}>
      <PageHeader
        eyebrow="Platform administration"
        title="LearnFlow at a glance"
        description="Live platform counts, account mix and the latest administrative and learning activity."
        actions={
          <LinkButton href="/admin/users/" size="sm" variant="secondary">
            <Users className="h-4 w-4" />
            Manage users
          </LinkButton>
        }
      />

      {loading && !data ? (
        <PageSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? 'Platform statistics unavailable.'} onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Accounts" value={data.users.total} hint={`${data.users.students} students · ${data.users.instructors} instructors`} icon={Users} tone="indigo" />
            <StatCard label="Courses" value={data.courses.total} hint={`${data.courses.published} published · ${data.courses.draft} drafts`} icon={BookOpen} tone="teal" />
            <StatCard label="Enrolments" value={data.enrollments} hint={`${data.assessments} assessments`} icon={GraduationCap} tone="amber" />
            <StatCard label="Attempts" value={data.attempts} hint={`${data.results} graded results stored`} icon={ClipboardList} tone="violet" />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">Recent platform activity</p>
                    <p className="mt-0.5 text-xs text-slate-400">Course, enrolment, assessment and account events</p>
                  </div>
                  <BarChart3 className="h-4 w-4 text-slate-300" />
                </div>
                <div className="mt-4">
                  <ActivityFeed events={data.recentActivity} emptyLabel="Platform activity will appear here as people use LearnFlow." />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <QuickLink href="/admin/users/" icon={Users} title="User accounts" description="Roles, access and account state" />
                <QuickLink href="/courses/" icon={BookOpen} title="Public catalogue" description="See the student-facing experience" />
                <QuickLink href="/settings/" icon={ShieldCheck} title="Your account" description="Profile and security settings" />
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <p className="text-sm font-bold text-ink">Account mix</p>
                <div className="mt-4 space-y-3">
                  <MixRow label="Students" value={data.users.students} total={data.users.total} tone="teal" />
                  <MixRow label="Instructors" value={data.users.instructors} total={data.users.total} tone="indigo" />
                  <MixRow label="Administrators" value={data.users.admins} total={data.users.total} tone="violet" />
                </div>
              </div>

              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <p className="text-sm font-bold text-ink">Course catalogue</p>
                <div className="mt-4 space-y-3">
                  <MixRow label="Published" value={data.courses.published} total={data.courses.total} tone="teal" />
                  <MixRow label="Draft" value={data.courses.draft} total={data.courses.total} tone="amber" />
                  <MixRow label="Archived" value={data.courses.archived} total={data.courses.total} tone="coral" />
                </div>
              </div>

              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <p className="text-sm font-bold text-ink">Platform totals</p>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <MiniStat label="Assessments" value={data.assessments} />
                  <MiniStat label="Results" value={data.results} />
                  <MiniStat label="Enrolments" value={data.enrollments} />
                  <MiniStat label="Attempts" value={data.attempts} />
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-ink to-[#273B8F] p-5 text-white shadow-lift">
                <ShieldCheck className="h-5 w-5 text-[#B9BBFF]" />
                <p className="mt-2 text-sm font-bold">Administrative access</p>
                <p className="mt-1 text-xs leading-5 text-white/60">
                  Role changes and deactivations revoke active sessions immediately. The system prevents administrators from changing their own role or deactivating themselves.
                </p>
              </div>
            </aside>
          </div>
        </>
      )}
    </AppShell>
  );
}

function MixRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: 'teal' | 'indigo' | 'violet' | 'amber' | 'coral' }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[0.68rem]">
        <span className="font-semibold text-slate-500">{label}</span>
        <span className="font-bold text-ink">{value} <span className="font-medium text-slate-400">({percentage}%)</span></span>
      </div>
      <ProgressBar value={percentage} tone={tone} className="mt-1.5" />
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

function QuickLink({ href, icon: Icon, title, description }: { href: string; icon: typeof Users; title: string; description: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-white bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender text-indigo">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2.5 text-sm font-bold text-ink">{title}</p>
      <p className="mt-0.5 text-[0.68rem] leading-5 text-slate-400">{description}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-[0.68rem] font-semibold text-indigo">
        Open <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
