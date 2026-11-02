'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar, Badge, PageSkeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const studentNav: NavItem[] = [
  { href: '/dashboard/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/my-courses/', label: 'My courses', icon: BookOpen },
  { href: '/assessments/', label: 'Assessments', icon: ClipboardList },
  { href: '/history/', label: 'History', icon: History },
  { href: '/analytics/', label: 'Analytics', icon: BarChart3 },
  { href: '/settings/', label: 'Settings', icon: Settings },
];

const instructorNav: NavItem[] = [
  { href: '/dashboard/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/instructor/courses/', label: 'My courses', icon: BookOpen },
  { href: '/instructor/questions/', label: 'Question bank', icon: FileQuestion },
  { href: '/instructor/assessments/', label: 'Assessments', icon: ClipboardList },
  { href: '/instructor/students/', label: 'Students', icon: Users },
  { href: '/instructor/analytics/', label: 'Analytics', icon: BarChart3 },
  { href: '/settings/', label: 'Settings', icon: Settings },
];

const adminNav: NavItem[] = [
  { href: '/admin/', label: 'Overview', icon: ShieldCheck },
  { href: '/admin/users/', label: 'Users', icon: Users },
  { href: '/settings/', label: 'Settings', icon: Settings },
];

export function AppShell({
  children,
  requiredRoles,
}: {
  children: ReactNode;
  requiredRoles?: Role[];
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(new Date()),
    );
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login/?next=${encodeURIComponent(next)}`);
      return;
    }
    if (requiredRoles && requiredRoles.length > 0) {
      if (user.role !== 'ADMIN' && !requiredRoles.includes(user.role)) {
        router.replace('/dashboard/');
      }
    }
  }, [loading, user, requiredRoles, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-4xl">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  const nav = user.role === 'INSTRUCTOR' ? instructorNav : user.role === 'ADMIN' ? adminNav : studentNav;
  const dark = user.role !== 'STUDENT';
  const current = nav.find((item) => pathname === item.href || pathname.startsWith(item.href));
  const isAuthorized =
    !requiredRoles ||
    requiredRoles.length === 0 ||
    user.role === 'ADMIN' ||
    requiredRoles.includes(user.role);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <h1 className="text-xl font-extrabold text-ink">Access restricted</h1>
          <p className="mt-2 text-sm text-slate-500">Your account does not have access to this workspace.</p>
          <Button className="mt-5" onClick={() => router.replace('/dashboard/')}>
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const sidebar = (
    <div
      className={cn(
        'flex h-full flex-col',
        dark ? 'bg-ink text-white' : 'border-r border-slate-100 bg-white',
      )}
    >
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/dashboard/" aria-label="LearnFlow dashboard">
          <Logo variant={dark ? 'light' : 'dark'} compact />
        </Link>
        <button
          type="button"
          className={cn('rounded-lg p-1.5 lg:hidden', dark ? 'hover:bg-white/10' : 'hover:bg-lavender')}
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className={cn('mx-4 mb-4 rounded-xl px-3 py-2.5', dark ? 'bg-white/5' : 'bg-lavender/70')}>
        <p className={cn('text-[0.62rem] font-bold uppercase tracking-[0.18em]', dark ? 'text-white/40' : 'text-slate-400')}>
          Workspace
        </p>
        <p className={cn('mt-0.5 text-xs font-semibold', dark ? 'text-white/85' : 'text-ink')}>
          {user.role === 'STUDENT' ? 'Student learning' : user.role === 'INSTRUCTOR' ? 'Instructor studio' : 'Platform administration'}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                active
                  ? dark
                    ? 'bg-indigo text-white shadow-[0_10px_24px_-14px_rgba(91,95,239,0.9)]'
                    : 'bg-lavender text-indigo'
                  : dark
                    ? 'text-white/60 hover:bg-white/5 hover:text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-ink',
              )}
            >
              <item.icon className={cn('h-[18px] w-[18px]', active ? (dark ? 'text-white' : 'text-indigo') : '')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        {user.role === 'STUDENT' ? (
          <div className="rounded-2xl bg-gradient-to-br from-indigo to-violet p-4 text-white shadow-lift">
            <Sparkles className="h-5 w-5 text-white/80" />
            <p className="mt-2 text-sm font-bold">Keep your flow going</p>
            <p className="mt-1 text-xs leading-5 text-white/70">Small steps every day build lasting mastery.</p>
            <Link
              href="/my-courses/"
              className="mt-3 inline-flex rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25"
            >
              Continue learning
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <GraduationCap className="h-5 w-5 text-[#B9BBFF]" />
            <p className="mt-2 text-sm font-bold text-white">Build the next assessment</p>
            <p className="mt-1 text-xs leading-5 text-white/55">Turn your question bank into a timed exam.</p>
            <Link
              href="/instructor/assessments/new/"
              className="mt-3 inline-flex rounded-lg bg-indigo px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-600"
            >
              Create assessment
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close navigation overlay"
          />
          <aside className="relative h-full w-[280px]">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-lavender hover:text-indigo lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{current?.label ?? 'LearnFlow'}</p>
              <p className="hidden truncate text-[0.7rem] text-slate-400 sm:block">
                {today || 'Welcome back'}
              </p>
            </div>
            <Badge tone={user.role === 'STUDENT' ? 'teal' : user.role === 'INSTRUCTOR' ? 'indigo' : 'violet'}>
              {user.role}
            </Badge>
            <Link
              href="/settings/"
              className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-lavender"
              aria-label="Account settings"
            >
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              <span className="hidden text-left sm:block">
                <span className="block max-w-[150px] truncate text-xs font-bold text-ink">{user.name}</span>
                <span className="block max-w-[150px] truncate text-[0.65rem] text-slate-400">{user.email}</span>
              </span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="!h-9 !w-9 !p-0"
              onClick={async () => {
                await logout();
                router.replace('/login/');
              }}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
