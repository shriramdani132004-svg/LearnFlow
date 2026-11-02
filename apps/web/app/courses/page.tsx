'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { PublicFooter, PublicHeader } from '@/components/layout/public-layout';
import { CourseCard } from '@/components/course/course-card';
import { Badge, EmptyState, ErrorState, Input, PageHeader, Select, Skeleton } from '@/components/ui/primitives';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { useApiQuery } from '@/hooks/use-api';
import type { CourseSummary, Paginated } from '@/lib/types';
import { CATEGORY_OPTIONS } from '@/lib/utils';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function CataloguePage() {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      page,
      limit: 12,
      search: appliedSearch || undefined,
      category: category || undefined,
      level: level || undefined,
    }),
    [page, appliedSearch, category, level],
  );

  const { data, loading, error, refetch } = useApiQuery<Paginated<CourseSummary>>('/courses', query);
  const courses = data?.data ?? [];
  const hasFilters = Boolean(appliedSearch || category || level);

  function applySearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  }

  function clearFilters() {
    setSearch('');
    setAppliedSearch('');
    setCategory('');
    setLevel('');
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Course catalogue"
          title="Find your next learning path"
          description="Published courses from LearnFlow instructors. Filter by subject or level, preview the curriculum, then enrol to unlock every lesson."
          actions={<Badge tone="indigo">{data?.meta.total ?? 0} courses</Badge>}
        />

        <div className="rounded-2xl border border-white bg-white p-4 shadow-card sm:p-5">
          <form onSubmit={applySearch} className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by course title, topic or category"
                className="pl-10"
                aria-label="Search courses"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <Select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by category"
                className="sm:w-48"
              >
                <option value="">All categories</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
              <Select
                value={level}
                onChange={(event) => {
                  setLevel(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by level"
                className="sm:w-40"
              >
                <option value="">All levels</option>
                {LEVELS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 lg:flex-none">
                <SlidersHorizontal className="h-4 w-4" />
                Apply
              </Button>
              {hasFilters && (
                <Button type="button" variant="ghost" onClick={clearFilters} aria-label="Clear filters">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>

          {hasFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400">
                Active filters
              </span>
              {appliedSearch && <FilterChip label={`“${appliedSearch}”`} onClear={() => { setSearch(''); setAppliedSearch(''); setPage(1); }} />}
              {category && <FilterChip label={category} onClear={() => { setCategory(''); setPage(1); }} />}
              {level && <FilterChip label={level} onClear={() => { setLevel(''); setPage(1); }} />}
            </div>
          )}
        </div>

        <div className="mt-7">
          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-80" />)}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={hasFilters ? 'No courses match these filters' : 'No published courses yet'}
              description={
                hasFilters
                  ? 'Try removing a filter or searching for a broader topic.'
                  : 'Instructors are still building the catalogue. Check back soon or sign in to create a course.'
              }
              action={hasFilters ? undefined : { label: 'Create an account', href: '/register/' }}
            />
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => <CourseCard key={course.id} course={course} />)}
              </div>
              <Pagination meta={data?.meta} onPageChange={(next) => { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-lavender px-2.5 py-1 text-xs font-semibold text-indigo">
      {label}
      <button type="button" onClick={onClear} className="rounded-full p-0.5 transition hover:bg-indigo/10" aria-label={`Remove ${label} filter`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
