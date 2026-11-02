import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';
import { PublicFooter, PublicHeader } from '@/components/layout/public-layout';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-lavender text-indigo">
          <Compass className="h-7 w-7" />
        </span>
        <p className="mt-6 text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-indigo">
          404 — Off the learning path
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
          The page may have moved, or the link may be incomplete. Head back to the course catalogue
          and pick up where you left off.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/courses/"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo px-5 text-sm font-semibold text-white transition hover:bg-indigo-600"
          >
            Browse courses
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-indigo/20 bg-white px-5 text-sm font-semibold text-indigo transition hover:bg-indigo-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
