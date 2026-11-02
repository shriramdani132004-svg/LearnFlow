'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { PublicHeader } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { Logo } from '@/components/ui/logo';
import { useQueryParam } from '@/hooks/use-api';
import { errorMessage } from '@/lib/api';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const next = useQueryParam('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(next || (user.role === 'ADMIN' ? '/admin/' : user.role === 'INSTRUCTOR' ? '/instructor/courses/' : '/dashboard/'));
    }
  }, [loading, user, next, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const account = await login(email.trim(), password);
      router.replace(next || (account.role === 'ADMIN' ? '/admin/' : account.role === 'INSTRUCTOR' ? '/instructor/courses/' : '/dashboard/'));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-16">
        <div className="order-2 hidden lg:order-1 lg:block">
          <div className="relative overflow-hidden rounded-[2rem] bg-ink p-8 text-white">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo/40 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-teal/20 blur-2xl" />
            <div className="relative">
              <Logo variant="light" />
              <h2 className="mt-10 text-2xl font-extrabold leading-tight tracking-tight">
                Pick up exactly where you left off.
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/60">
                Your lessons, saved answers, assessment deadlines and results are waiting in your
                workspace.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  { icon: BookOpenIcon, title: 'Lesson progress saved', copy: 'Mark lessons complete as you work through a course.' },
                  { icon: Lock, title: 'Secure HttpOnly sessions', copy: 'Access tokens stay out of browser storage.' },
                  { icon: Sparkles, title: 'Real feedback', copy: 'Scores and topic accuracy from live attempts.' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-xl bg-white/5 p-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#B9BBFF]">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">{item.title}</p>
                      <p className="mt-0.5 text-[0.7rem] leading-5 text-white/45">{item.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-white bg-white p-6 shadow-card sm:p-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-lavender px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-indigo">
              <KeyRound className="h-3.5 w-3.5" />
              Welcome back
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Log in to LearnFlow</h1>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Students, instructors and administrators use the same sign-in.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Email address" htmlFor="email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="pl-10"
                  />
                </div>
              </Field>

              <Field label="Password" htmlFor="password">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    className="pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              {error && (
                <div className="rounded-xl border border-coral/30 bg-softcoral/60 px-3.5 py-2.5 text-xs font-medium leading-5 text-[#B91C1C]">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth size="lg" loading={submitting}>
                Log in
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              New to LearnFlow?{' '}
              <Link href={next ? `/register/?next=${encodeURIComponent(next)}` : '/register/'} className="font-bold text-indigo hover:underline">
                Create an account
              </Link>
            </p>

            <div className="mt-6 flex items-start gap-2 rounded-xl bg-canvas p-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              <p className="text-[0.7rem] leading-5 text-slate-500">
                Sessions use short-lived access tokens in HttpOnly cookies. After too many failed
                attempts, sign-in is temporarily rate limited.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  );
}
