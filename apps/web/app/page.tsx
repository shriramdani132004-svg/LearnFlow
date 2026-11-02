'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, BookOpen, Clock, GraduationCap, Layers, Sparkles, Target, Timer, Trophy } from 'lucide-react';
import { PublicFooter, PublicHeader } from '@/components/layout/public-layout';
import { useApiQuery } from '@/hooks/use-api';
import type { Paginated, CourseSummary } from '@/lib/types';
import { LinkButton } from '@/components/ui/link-button';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { CourseCard } from '@/components/course/course-card';
import { CATEGORY_OPTIONS } from '@/lib/utils';

export default function LandingPage() {
  const featured = useApiQuery<Paginated<CourseSummary>>('/courses', { limit: 3 });
  const courses = featured.data?.data ?? [];
  const total = featured.data?.meta.total ?? 0;

  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader transparent />

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
          <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-violet/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:pb-24 lg:pt-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-indigo shadow-sm ring-1 ring-indigo/10">
                <Sparkles className="h-3.5 w-3.5" />
                Learn · Practice · Grow
              </span>
              <h1 className="mt-6 max-w-xl text-[2.6rem] font-extrabold leading-[1.06] tracking-tight text-ink sm:text-6xl">
                Learning that keeps you
                <span className="relative ml-2 inline-block text-indigo">
                  in flow
                  <svg className="absolute -bottom-2 left-0 h-3 w-full text-teal/50" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M2 8C40 2 80 2 120 6s60 4 78 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Structured courses, focused practice and server-timed assessments — with automatic
                grading and honest analytics that show what you actually know.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <LinkButton href="/courses/" size="lg">
                  Explore courses
                  <ArrowRight className="h-4 w-4" />
                </LinkButton>
                <LinkButton href="/register/" size="lg" variant="secondary">
                  Create free account
                </LinkButton>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-teal" />
                  Self-paced lessons
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Timer className="h-4 w-4 text-amber" />
                  Timed examinations
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-indigo" />
                  Real analytics
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-lg">
              <div className="absolute -right-4 -top-5 z-10 rounded-2xl bg-white px-4 py-3 shadow-lift ring-1 ring-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-softteal text-teal">
                    <Trophy className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-400">Assessment flow</p>
                    <p className="text-xs font-bold text-ink">Timed & server-graded</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white bg-white/90 p-5 shadow-lift backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-slate-400">Your learning space</p>
                    <p className="mt-1 text-sm font-bold text-ink">What a study week looks like</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lavender text-indigo">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-canvas p-3.5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo shadow-sm">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-ink">Read, practise, apply</p>
                        <span className="text-[0.65rem] font-bold text-teal">Focused</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-indigo to-violet" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-canvas p-3.5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber shadow-sm">
                      <Target className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-ink">Check understanding</p>
                      <p className="mt-0.5 text-[0.7rem] text-slate-500">Timed MCQs with instant feedback</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-canvas p-3.5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-teal shadow-sm">
                      <Layers className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-ink">See the bigger picture</p>
                      <p className="mt-0.5 text-[0.7rem] text-slate-500">Topic accuracy and score trends</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-ink p-4 text-white">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/40">Live catalogue</p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <p className="text-sm font-bold">
                      {featured.loading
                        ? 'Loading published courses…'
                        : total > 0
                          ? `${total} published course${total === 1 ? '' : 's'} ready to explore`
                          : 'New courses are being published'}
                    </p>
                    <Link href="/courses/" className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-[#B9BBFF] transition hover:text-white">
                      Browse
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-white">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              { icon: BookOpen, title: 'Structured courses', copy: 'Modules and lessons that build in a sensible order.', tone: 'bg-lavender text-indigo' },
              { icon: Timer, title: 'Server-timed exams', copy: 'A real deadline enforced by the API, not the browser.', tone: 'bg-amber-50 text-amber' },
              { icon: BarChart3, title: 'Honest analytics', copy: 'Scores, topic accuracy and progress from live data.', tone: 'bg-softteal text-teal' },
              { icon: ShieldCheckIcon, title: 'Secure by default', copy: 'Argon2id passwords, HttpOnly sessions and CSRF defence.', tone: 'bg-softcoral text-coral' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-indigo">Course catalogue</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Start with a course that fits</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Every course is authored by an instructor, organised into modules and paired with
                assessments that check what you learned.
              </p>
            </div>
            <LinkButton href="/courses/" variant="secondary">
              View all courses
              <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </div>

          {featured.loading ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} className="h-72" />
              ))}
            </div>
          ) : courses.length > 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-indigo/15 bg-white/70 px-6 py-12 text-center">
              <p className="text-sm font-bold text-ink">The catalogue is just getting started</p>
              <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-slate-500">
                No courses are published yet. Create an account or sign in as an instructor to build
                the first learning path.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <LinkButton href="/register/" size="sm">Create account</LinkButton>
                <LinkButton href="/login/" size="sm" variant="secondary">Instructor sign in</LinkButton>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.slice(0, 6).map((category) => (
              <Link
                key={category}
                href={`/courses/?category=${encodeURIComponent(category)}`}
                className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo/30 hover:text-indigo"
              >
                {category}
              </Link>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-y border-slate-100 bg-white">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-indigo">How it works</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">A simple loop: learn, test, improve</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                No noise, no streaks to protect. Just the next useful step, and evidence that it worked.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { step: '01', icon: BookOpen, title: 'Join a course', copy: 'Enrol in a published course and work through lessons at your own pace. Your progress is saved as you go.', tone: 'bg-lavender text-indigo' },
                { step: '02', icon: Timer, title: 'Take an assessment', copy: 'Start a timed attempt. Answers autosave, question order can be randomised and the deadline lives on the server.', tone: 'bg-amber-50 text-amber' },
                { step: '03', icon: Target, title: 'Review and improve', copy: 'See your score, correct answers and topic breakdown, then return to the lessons that need attention.', tone: 'bg-softteal text-teal' },
              ].map((item) => (
                <div key={item.step} className="relative rounded-2xl border border-slate-100 bg-canvas p-6">
                  <span className="absolute right-5 top-5 text-[0.68rem] font-extrabold tracking-[0.18em] text-slate-300">{item.step}</span>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-bold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="instructors" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="overflow-hidden rounded-[2rem] bg-ink">
            <div className="grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/70">
                  <GraduationCap className="h-3.5 w-3.5" />
                  For instructors
                </span>
                <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Build the course. We&apos;ll handle the exam mechanics.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
                  Author lessons, grow a reusable question bank and assemble timed assessments from a
                  pool. Grading, attempt deadlines and result release are handled transactionally.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    'Reusable MCQ question bank',
                    'Randomised questions and options',
                    'Autosaved answers and server deadlines',
                    'Per-question and per-topic accuracy',
                    'CSV result exports',
                    'Live enrollment and progress rosters',
                  ].map((item) => (
                    <p key={item} className="flex items-start gap-2 text-xs leading-5 text-white/70">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                      {item}
                    </p>
                  ))}
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <LinkButton href="/login/" variant="primary">
                    Instructor sign in
                  </LinkButton>
                  <LinkButton href="/register/" variant="light">
                    Create account
                  </LinkButton>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center justify-between">
                  <Badge tone="indigo">Assessment blueprint</Badge>
                  <Timer className="h-5 w-5 text-white/40" />
                </div>
                <div className="mt-4 space-y-2.5">
                  {[
                    ['Question pool', 'Shared mark value enforced'],
                    ['Attempt window', 'Optional start and end dates'],
                    ['Result visibility', 'Immediate or instructor release'],
                    ['Answer review', 'Control post-exam explanations'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-white/5 px-3.5 py-3">
                      <p className="text-xs font-semibold text-white/80">{label}</p>
                      <p className="text-right text-[0.68rem] text-white/45">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[0.68rem] leading-5 text-white/35">
                  Every setting is stored on the assessment and enforced by the API.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-8 shadow-card sm:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-lavender" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-softteal" />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-ink">Ready to find your flow?</h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  Join as a student to start learning, or as an instructor to publish your first course.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <LinkButton href="/register/" size="lg">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </LinkButton>
                <LinkButton href="/courses/" size="lg" variant="secondary">
                  Browse catalogue
                </LinkButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
