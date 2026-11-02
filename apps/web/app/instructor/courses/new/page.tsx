'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, Info, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Field, Input, PageHeader, Select, Textarea } from '@/components/ui/primitives';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_OPTIONS, isValidUrl } from '@/lib/utils';
import type { CourseSummary } from '@/lib/types';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function NewCoursePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CATEGORY_OPTIONS[0],
    level: 'Beginner',
    thumbnailUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (form.thumbnailUrl.trim() && !isValidUrl(form.thumbnailUrl.trim())) {
      setError('Thumbnail URL must be a valid http or https link.');
      return;
    }
    setSaving(true);
    try {
      const course = await api.post<CourseSummary>('/courses', {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        level: form.level,
        ...(form.thumbnailUrl.trim() ? { thumbnailUrl: form.thumbnailUrl.trim() } : {}),
      });
      router.replace(`/instructor/courses/view/?id=${course.id}`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell requiredRoles={['INSTRUCTOR']}>
      <PageHeader
        breadcrumbs={[{ label: 'My courses', href: '/instructor/courses/' }, { label: 'New course' }]}
        eyebrow="Course authoring"
        title="Create a course"
        description="Courses start as drafts. Add your curriculum, then publish when it is ready for students."
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <form onSubmit={submit} className="rounded-2xl border border-white bg-white p-5 shadow-card sm:p-6">
          <div className="space-y-4">
            <Field label="Course title" htmlFor="title" hint="3–140 characters. This is the headline students see.">
              <Input id="title" value={form.title} onChange={(event) => update('title', event.target.value)} minLength={3} maxLength={140} required placeholder="e.g. Modern JavaScript Foundations" />
            </Field>
            <Field label="Description" htmlFor="description" hint="20–5000 characters. Explain what the course covers and who it is for.">
              <Textarea id="description" value={form.description} onChange={(event) => update('description', event.target.value)} minLength={20} maxLength={5000} required rows={5} placeholder="A concise overview of the course, the skills it builds and what learners will be able to do." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="category">
                <Select id="category" value={form.category} onChange={(event) => update('category', event.target.value)}>
                  {CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{category}</option>)}
                </Select>
              </Field>
              <Field label="Level" htmlFor="level">
                <Select id="level" value={form.level} onChange={(event) => update('level', event.target.value)}>
                  {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Thumbnail URL (optional)" htmlFor="thumbnail" hint="A public https image. Leave blank to use the generated course artwork.">
              <Input id="thumbnail" value={form.thumbnailUrl} onChange={(event) => update('thumbnailUrl', event.target.value)} placeholder="https://example.com/course-cover.jpg" />
            </Field>
          </div>

          {error && <p className="mt-4 rounded-xl border border-coral/30 bg-softcoral/60 px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">{error}</p>}

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
            <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create draft
              {!saving && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-lavender to-white p-5 ring-1 ring-indigo/10">
            <Sparkles className="h-5 w-5 text-indigo" />
            <p className="mt-2 text-sm font-bold text-ink">What happens next</p>
            <ol className="mt-3 space-y-3">
              {[
                'Your course is saved as a draft — invisible to students.',
                'Add modules and lessons with the lesson editor.',
                'Create questions and assemble assessments for the course.',
                'Publish the course to make it available in the catalogue.',
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-2.5 text-xs leading-5 text-slate-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[0.6rem] font-extrabold text-indigo shadow-sm">{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
            <Info className="h-5 w-5 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-ink">Publishing requirements</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              A course needs at least one module and lesson before it can be published. Lessons can
              stay in draft until they are ready.
            </p>
          </div>
          <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
            <BookOpen className="h-5 w-5 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-ink">Reusable question bank</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Questions belong to this course and can be reused across multiple assessments, provided
              every question in a pool shares the same mark value.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
