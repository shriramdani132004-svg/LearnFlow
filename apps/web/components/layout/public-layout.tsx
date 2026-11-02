'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { Avatar } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export function PublicHeader({ transparent = false }: { transparent?: boolean }) {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b backdrop-blur-xl',
        transparent ? 'border-transparent bg-canvas/70' : 'border-slate-100 bg-white/85',
      )}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="LearnFlow home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
          <Link href="/courses/" className="transition hover:text-indigo">
            Courses
          </Link>
          <Link href="/#how-it-works" className="transition hover:text-indigo">
            How it works
          </Link>
          <Link href="/#instructors" className="transition hover:text-indigo">
            For instructors
          </Link>
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          {loading ? (
            <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-100" />
          ) : user ? (
            <>
              <Link
                href="/dashboard/"
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-ink transition hover:bg-lavender"
              >
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                Dashboard
              </Link>
              <Link href="/courses/">
                <Button variant="primary" size="sm">
                  Browse courses
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login/">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register/">
                <Button size="sm">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-xl p-2 text-ink transition hover:bg-lavender md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1 text-sm font-semibold text-slate-600">
            <Link href="/courses/" className="rounded-xl px-3 py-2.5 hover:bg-lavender">
              Courses
            </Link>
            <Link href="/#how-it-works" className="rounded-xl px-3 py-2.5 hover:bg-lavender">
              How it works
            </Link>
            <Link href="/#instructors" className="rounded-xl px-3 py-2.5 hover:bg-lavender">
              For instructors
            </Link>
          </nav>
          <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            {user ? (
              <Link href="/dashboard/" className="flex-1">
                <Button fullWidth>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login/" className="flex-1">
                  <Button variant="secondary" fullWidth>
                    Log in
                  </Button>
                </Link>
                <Link href="/register/" className="flex-1">
                  <Button fullWidth>Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
            A focused learning and assessment platform for students and instructors. Real progress,
            real questions, real results.
          </p>
        </div>
        <div>
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Learn
          </p>
          <div className="mt-3 space-y-2 text-sm font-medium text-slate-600">
            <Link href="/courses/" className="block hover:text-indigo">
              Course catalogue
            </Link>
            <Link href="/register/" className="block hover:text-indigo">
              Create a student account
            </Link>
            <Link href="/login/" className="block hover:text-indigo">
              Student & instructor login
            </Link>
          </div>
        </div>
        <div>
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            Platform
          </p>
          <div className="mt-3 space-y-2 text-sm font-medium text-slate-600">
            <Link href="/#how-it-works" className="block hover:text-indigo">
              How LearnFlow works
            </Link>
            <Link href="/#instructors" className="block hover:text-indigo">
              Instructor workspace
            </Link>
            <a href="/api/docs" className="block hover:text-indigo">
              API documentation
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} LearnFlow. Built with Next.js, NestJS and PostgreSQL.
      </div>
    </footer>
  );
}
