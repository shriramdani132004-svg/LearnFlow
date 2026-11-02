'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { PublicHeader } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { useQueryParam } from '@/hooks/use-api';
import { errorMessage } from '@/lib/api';

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const next = useQueryParam('next');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(next || (user.role === 'ADMIN' ? '/admin/' : user.role === 'INSTRUCTOR' ? '/instructor/courses/' : '/dashboard/'));
    }
  }, [loading, user, next, router]);

  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
  ];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!checks.every((check) => check.met)) {
      setError('Please choose a password that meets all requirements.');
      return;
    }
    setSubmitting(true);
    try {
      const account = await register(name.trim(), email.trim(), password);
      router.replace(next || (account.role === 'INSTRUCTOR' ? '/instructor/courses/' : '/dashboard/'));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-softteal px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-teal">
            Free student account
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
            Start learning in a few minutes.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-7 text-slate-600">
            Create an account to enrol in published courses, take timed assessments and track your
            progress with honest analytics. No payment details required.
          </p>
          <div className="mt-7 space-y-3">
            {[
              'Unlock every lesson in courses you enrol in',
              'Autosaved answers during timed assessments',
              'Instant or instructor-released results',
              'Per-topic accuracy to guide revision',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 rounded-xl border border-white bg-white p-3.5 shadow-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                <p className="text-sm text-slate-600">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 rounded-xl bg-lavender/70 p-4">
            <p className="text-xs font-bold text-ink">Teaching instead?</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Register here, then ask a platform administrator to upgrade the account to instructor —
              or use the secure instructor bootstrap endpoint if you operate the deployment.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-xl font-extrabold tracking-tight text-ink">Create your account</h2>
          <p className="mt-1 text-sm text-slate-500">You will be signed in immediately.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Full name" htmlFor="name">
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" className="pl-10" autoComplete="name" />
              </div>
            </Field>
            <Field label="Email address" htmlFor="email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="pl-10" autoComplete="email" />
              </div>
            </Field>
            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a strong password"
                  className="pl-10 pr-11"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm password" htmlFor="confirm">
              <Input id="confirm" type={showPassword ? 'text' : 'password'} required value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              {checks.map((check) => (
                <p key={check.label} className={`flex items-center gap-1.5 text-[0.68rem] font-medium ${check.met ? 'text-teal' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 ${check.met ? 'text-teal' : 'text-slate-300'}`} />
                  {check.label}
                </p>
              ))}
            </div>

            {error && (
              <div className="rounded-xl border border-coral/30 bg-softcoral/60 px-3.5 py-2.5 text-xs font-medium leading-5 text-[#B91C1C]">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" loading={submitting}>
              Create account
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href={next ? `/login/?next=${encodeURIComponent(next)}` : '/login/'} className="font-bold text-indigo hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
