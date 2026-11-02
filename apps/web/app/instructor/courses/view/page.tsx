'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FileQuestion,
  Layers,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useApiQuery, useQueryParam } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type { CourseDetail, CourseModule, Lesson } from '@/lib/types';
import { Badge, ErrorState, Field, Input, PageHeader, PageSkeleton, Select, StatCard, StatusBadge, Textarea } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CATEGORY_OPTIONS, isValidUrl } from '@/lib/utils';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

type ConfirmState =
  | { type: 'module'; module: CourseModule }
  | { type: 'lesson'; module: CourseModule; lesson: Lesson }
  | { type: 'course' }
  | { type: 'publish' }
  | { type: 'archive' }
  | null;

export default function ManageCoursePage() {
  const courseId = useQueryParam('id');
  const { data, loading, error, refetch } = useApiQuery<CourseDetail>(courseId ? `/courses/${courseId}` : null);
  const toast = useToast();

  const [settings, setSettings] = useState({ title: '', description: '', category: '', level: '', thumbnailUrl: '' });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [moduleModal, setModuleModal] = useState<{ mode: 'create' | 'edit'; module?: CourseModule } | null>(null);
  const [lessonModal, setLessonModal] = useState<{ mode: 'create' | 'edit'; moduleId: string; lesson?: Lesson } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [working, setWorking] = useState(false);

  if (data && !settingsLoaded) {
    setSettingsLoaded(true);
    setSettings({
      title: data.title,
      description: data.description,
      category: data.category,
      level: data.level,
      thumbnailUrl: data.thumbnailUrl ?? '',
    });
  }

  if (!courseId) {
    return <AppShell requiredRoles={['INSTRUCTOR']}><ErrorState message="No course selected." /></AppShell>;
  }

  const totalLessons = data?.modules.reduce((sum, module) => sum + module.lessons.length, 0) ?? 0;
  const publishedLessons = data?.modules.reduce((sum, module) => sum + module.lessons.filter((lesson) => lesson.published).length, 0) ?? 0;

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    if (settings.thumbnailUrl.trim() && !isValidUrl(settings.thumbnailUrl.trim())) {
      toast.error('Thumbnail URL must be a valid http or https link.');
      return;
    }
    setSavingSettings(true);
    try {
      await api.patch(`/courses/${data.id}`, {
        title: settings.title.trim(),
        description: settings.description.trim(),
        category: settings.category,
        level: settings.level,
        thumbnailUrl: settings.thumbnailUrl.trim() || null,
      });
      toast.success('Course details saved.');
      refetch();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setSavingSettings(false);
    }
  }

  async function performConfirm() {
    if (!confirm || !data) return;
    setWorking(true);
    try {
      if (confirm.type === 'module') {
        await api.delete(`/modules/${confirm.module.id}`);
        toast.success('Module deleted.');
      } else if (confirm.type === 'lesson') {
        await api.delete(`/lessons/${confirm.lesson.id}`);
        toast.success('Lesson deleted.');
      } else if (confirm.type === 'publish') {
        await api.post(`/courses/${data.id}/publish`);
        toast.success('Course published.');
      } else if (confirm.type === 'archive') {
        await api.post(`/courses/${data.id}/archive`);
        toast.success('Course archived.');
      } else {
        await api.delete(`/courses/${data.id}`);
        toast.success('Course deleted.');
        window.location.href = '/instructor/courses/';
        return;
      }
      setConfirm(null);
      refetch();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setWorking(false);
    }
  }

  return (
    <AppShell requiredRoles={['INSTRUCTOR']}>
      {loading && !data ? (
        <PageSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? 'Course not found.'} onRetry={refetch} />
      ) : (
        <>
          <PageHeader
            breadcrumbs={[{ label: 'My courses', href: '/instructor/courses/' }, { label: data.title }]}
            eyebrow="Course management"
            title={data.title}
            description={data.description}
            actions={
              <>
                <LinkButton href={`/courses/view/?id=${data.id}`} size="sm" variant="secondary" target="_blank">
                  <Eye className="h-4 w-4" />
                  Preview
                </LinkButton>
                {data.status === 'DRAFT' && (
                  <Button size="sm" onClick={() => setConfirm({ type: 'publish' })}>
                    <CheckCircle2 className="h-4 w-4" />
                    Publish
                  </Button>
                )}
                {data.status === 'PUBLISHED' && (
                  <Button size="sm" variant="secondary" onClick={() => setConfirm({ type: 'archive' })}>
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                )}
              </>
            }
          />

          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-white bg-white px-4 py-3 shadow-card">
            <StatusBadge status={data.status} />
            <Badge tone="indigo">{data.category}</Badge>
            <Badge tone="slate">{data.level}</Badge>
            <span className="text-xs text-slate-400">Created by you · {data.enrollmentCount} enrolled students</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Link href={`/instructor/students/?course=${data.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-canvas px-2.5 text-[0.7rem] font-bold text-slate-600 transition hover:text-indigo">
                <Users className="h-3.5 w-3.5" />
                Roster
              </Link>
              <Link href={`/instructor/assessments/?course=${data.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-canvas px-2.5 text-[0.7rem] font-bold text-slate-600 transition hover:text-indigo">
                <FileQuestion className="h-3.5 w-3.5" />
                Assessments
              </Link>
              <Link href={`/instructor/analytics/?course=${data.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-canvas px-2.5 text-[0.7rem] font-bold text-slate-600 transition hover:text-indigo">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Analytics
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Modules" value={data.modules.length} hint="Ordered curriculum sections" icon={Layers} tone="indigo" />
            <StatCard label="Lessons" value={totalLessons} hint={`${publishedLessons} published`} icon={BookOpen} tone="teal" />
            <StatCard label="Enrolled" value={data.enrollmentCount} hint="Active and completed students" icon={Users} tone="violet" />
            <StatCard label="Assessments" value={data.assessmentCount} hint="Including drafts" icon={FileQuestion} tone="amber" />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-ink">Curriculum</p>
                    <p className="mt-0.5 text-xs text-slate-400">Modules and lessons students work through in order</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setModuleModal({ mode: 'create' })}>
                    <Plus className="h-4 w-4" />
                    Add module
                  </Button>
                </div>

                {data.modules.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-indigo/15 bg-canvas/60 px-5 py-10 text-center">
                    <Layers className="mx-auto h-6 w-6 text-indigo/40" />
                    <p className="mt-2 text-sm font-bold text-ink">No modules yet</p>
                    <p className="mt-1 text-xs text-slate-500">Add a module, then create lessons inside it.</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {data.modules.map((module, moduleIndex) => (
                      <div key={module.id} className="overflow-hidden rounded-xl border border-slate-100">
                        <div className="flex items-start gap-3 bg-canvas/60 px-4 py-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[0.65rem] font-extrabold text-indigo shadow-sm">
                            {moduleIndex + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-ink">{module.title}</p>
                            {module.description && <p className="mt-0.5 text-xs text-slate-500">{module.description}</p>}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button type="button" onClick={() => setLessonModal({ mode: 'create', moduleId: module.id })} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-indigo" title="Add lesson" aria-label={`Add lesson to ${module.title}`}>
                              <Plus className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => setModuleModal({ mode: 'edit', module })} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-indigo" title="Edit module" aria-label={`Edit ${module.title}`}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => setConfirm({ type: 'module', module })} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-coral" title="Delete module" aria-label={`Delete ${module.title}`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {module.lessons.length === 0 ? (
                          <p className="px-4 py-4 text-xs text-slate-400">No lessons in this module yet.</p>
                        ) : (
                          <ul className="divide-y divide-slate-50">
                            {module.lessons.map((lesson, lessonIndex) => (
                              <li key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                                <span className="text-[0.65rem] font-bold text-slate-300">{moduleIndex + 1}.{lessonIndex + 1}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <p className="truncate text-xs font-semibold text-ink">{lesson.title}</p>
                                    <Badge tone={lesson.published ? 'teal' : 'amber'}>{lesson.published ? 'Published' : 'Draft'}</Badge>
                                  </div>
                                  <p className="mt-0.5 flex items-center gap-1 text-[0.62rem] text-slate-400">
                                    <Clock className="h-3 w-3" />
                                    {lesson.estimatedMinutes} min · {(lesson.content ?? '').length.toLocaleString()} characters
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <button type="button" onClick={() => setLessonModal({ mode: 'edit', moduleId: module.id, lesson })} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-canvas hover:text-indigo" title="Edit lesson" aria-label={`Edit ${lesson.title}`}>
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button type="button" onClick={() => setConfirm({ type: 'lesson', module, lesson })} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-canvas hover:text-coral" title="Delete lesson" aria-label={`Delete ${lesson.title}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={saveSettings} className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <p className="text-sm font-bold text-ink">Course details</p>
                <p className="mt-0.5 text-xs text-slate-400">These details appear in the public catalogue once published.</p>
                <div className="mt-4 space-y-4">
                  <Field label="Title" htmlFor="title">
                    <Input id="title" value={settings.title} onChange={(event) => setSettings({ ...settings, title: event.target.value })} minLength={3} maxLength={140} required />
                  </Field>
                  <Field label="Description" htmlFor="description">
                    <Textarea id="description" value={settings.description} onChange={(event) => setSettings({ ...settings, description: event.target.value })} minLength={20} maxLength={5000} required rows={4} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Category" htmlFor="category">
                      <Select id="category" value={settings.category} onChange={(event) => setSettings({ ...settings, category: event.target.value })}>
                        {CATEGORY_OPTIONS.includes(settings.category) ? null : <option value={settings.category}>{settings.category}</option>}
                        {CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{category}</option>)}
                      </Select>
                    </Field>
                    <Field label="Level" htmlFor="level">
                      <Select id="level" value={settings.level} onChange={(event) => setSettings({ ...settings, level: event.target.value })}>
                        {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                      </Select>
                    </Field>
                  </div>
                  <Field label="Thumbnail URL" htmlFor="thumbnail" hint="Optional public image URL.">
                    <Input id="thumbnail" value={settings.thumbnailUrl} onChange={(event) => setSettings({ ...settings, thumbnailUrl: event.target.value })} placeholder="https://example.com/cover.jpg" />
                  </Field>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button type="submit" loading={savingSettings} disabled={data.status === 'ARCHIVED'}>
                    <Save className="h-4 w-4" />
                    Save details
                  </Button>
                </div>
              </form>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
                <p className="text-sm font-bold text-ink">Publishing checklist</p>
                <div className="mt-3 space-y-2.5">
                  <ChecklistItem done={data.modules.length > 0} label="At least one module" />
                  <ChecklistItem done={totalLessons > 0} label="At least one lesson" />
                  <ChecklistItem done={publishedLessons > 0} label="At least one published lesson" />
                  <ChecklistItem done={data.assessmentCount > 0} label="An assessment (recommended)" />
                </div>
                {data.status === 'DRAFT' && (
                  <Button className="mt-4 w-full" size="sm" onClick={() => setConfirm({ type: 'publish' })} disabled={data.modules.length === 0 || totalLessons === 0}>
                    <CheckCircle2 className="h-4 w-4" />
                    Publish course
                  </Button>
                )}
                {data.status === 'PUBLISHED' && (
                  <div className="mt-4 rounded-xl bg-softteal/60 p-3 text-center">
                    <p className="text-xs font-bold text-teal">Live in the catalogue</p>
                    <p className="mt-0.5 text-[0.65rem] text-slate-500">Students can discover and enrol.</p>
                  </div>
                )}
                {data.status === 'ARCHIVED' && (
                  <p className="mt-4 rounded-xl bg-canvas p-3 text-center text-xs text-slate-500">Archived courses cannot be edited or published.</p>
                )}
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-lavender to-white p-5 ring-1 ring-indigo/10">
                <FileQuestion className="h-5 w-5 text-indigo" />
                <p className="mt-2 text-sm font-bold text-ink">Questions & assessments</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Add questions to this course first, then create a timed assessment from the pool.
                </p>
                <div className="mt-3 space-y-2">
                  <LinkButton href={`/instructor/questions/new/?course=${data.id}`} size="sm" variant="secondary" className="w-full">
                    Add a question
                  </LinkButton>
                  <LinkButton href={`/instructor/assessments/new/?course=${data.id}`} size="sm" className="w-full">
                    Create assessment
                  </LinkButton>
                </div>
              </div>

              <div className="rounded-2xl border border-coral/20 bg-softcoral/30 p-5">
                <p className="text-sm font-bold text-ink">Danger zone</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Deleting is only possible when the course has no enrolments or assessment attempts.
                  Otherwise archive it instead.
                </p>
                <Button variant="danger" size="sm" className="mt-3 w-full" onClick={() => setConfirm({ type: 'course' })}>
                  <Trash2 className="h-4 w-4" />
                  Delete course
                </Button>
              </div>
            </aside>
          </div>

          {moduleModal && (
            <ModuleModal
              initial={moduleModal.module}
              courseId={data.id}
              onClose={() => setModuleModal(null)}
              onSaved={() => { setModuleModal(null); refetch(); }}
            />
          )}
          {lessonModal && (
            <LessonModal
              initial={lessonModal.lesson}
              moduleId={lessonModal.moduleId}
              onClose={() => setLessonModal(null)}
              onSaved={() => { setLessonModal(null); refetch(); }}
            />
          )}
          <ConfirmDialog
            open={Boolean(confirm)}
            onClose={() => setConfirm(null)}
            onConfirm={performConfirm}
            loading={working}
            title={
              confirm?.type === 'module' ? 'Delete this module?' :
              confirm?.type === 'lesson' ? 'Delete this lesson?' :
              confirm?.type === 'course' ? 'Delete this course?' :
              confirm?.type === 'publish' ? 'Publish this course?' : 'Archive this course?'
            }
            description={
              confirm?.type === 'module' ? 'The module and all of its lessons will be permanently deleted.' :
              confirm?.type === 'lesson' ? 'This lesson will be permanently deleted from the curriculum.' :
              confirm?.type === 'course' ? 'This permanently deletes the course, modules, lessons and questions. It is only allowed when no enrolments or attempts exist.' :
              confirm?.type === 'publish' ? 'Students will be able to discover and enrol in this course immediately.' : 'The course will be hidden from the catalogue. Existing enrolments are preserved.'
            }
            confirmLabel={
              confirm?.type === 'module' || confirm?.type === 'lesson' || confirm?.type === 'course' ? 'Delete permanently' :
              confirm?.type === 'publish' ? 'Publish course' : 'Archive course'
            }
            tone={confirm?.type === 'publish' ? 'primary' : 'danger'}
          />
        </>
      )}
    </AppShell>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`flex h-4 w-4 items-center justify-center rounded-full ${done ? 'bg-teal text-white' : 'bg-slate-200 text-slate-400'}`}>
        {done ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <span className={done ? 'font-semibold text-ink' : 'text-slate-500'}>{label}</span>
    </div>
  );
}

function ModuleModal({
  initial,
  courseId,
  onClose,
  onSaved,
}: {
  initial?: CourseModule;
  courseId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        await api.patch(`/modules/${initial.id}`, { title: title.trim(), description: description.trim() || null });
        toast.success('Module updated.');
      } else {
        await api.post(`/courses/${courseId}/modules`, { title: title.trim(), description: description.trim() || undefined });
        toast.success('Module created.');
      }
      onSaved();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit module' : 'Add module'} description="Modules group related lessons in order." size="sm">
      <form onSubmit={save} className="space-y-4">
        <Field label="Module title" htmlFor="module-title">
          <Input id="module-title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={140} placeholder="e.g. Getting started" />
        </Field>
        <Field label="Description (optional)" htmlFor="module-description">
          <Textarea id="module-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} placeholder="What this module covers" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" size="sm" loading={saving}>{initial ? 'Save module' : 'Create module'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function LessonModal({
  initial,
  moduleId,
  onClose,
  onSaved,
}: {
  initial?: Lesson;
  moduleId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    content: initial?.content ?? '',
    resourceUrl: initial?.resourceUrl ?? '',
    estimatedMinutes: initial?.estimatedMinutes ?? 10,
    published: initial?.published ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (form.resourceUrl.trim() && !isValidUrl(form.resourceUrl.trim())) {
      toast.error('Resource URL must be a valid http or https link.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content,
        resourceUrl: form.resourceUrl.trim() || null,
        estimatedMinutes: Number(form.estimatedMinutes) || 10,
        published: form.published,
      };
      if (initial) {
        await api.patch(`/lessons/${initial.id}`, payload);
        toast.success('Lesson updated.');
      } else {
        await api.post(`/modules/${moduleId}/lessons`, payload);
        toast.success('Lesson created.');
      }
      onSaved();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit lesson' : 'Add lesson'} description="Write the lesson body in plain text with simple Markdown-style headings and lists." size="lg">
      <form onSubmit={save} className="space-y-4">
        <Field label="Lesson title" htmlFor="lesson-title">
          <Input id="lesson-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required minLength={2} maxLength={160} />
        </Field>
        <Field label="Lesson content" htmlFor="lesson-content" hint="Supports # headings, - bullet lists, **bold** and `code`.">
          <Textarea id="lesson-content" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} required rows={12} maxLength={50000} placeholder={'# Introduction\n\nWrite the lesson here.\n\n- Key idea one\n- Key idea two'} className="font-mono text-xs leading-6" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estimated minutes" htmlFor="lesson-minutes">
            <Input id="lesson-minutes" type="number" min={1} max={600} value={form.estimatedMinutes} onChange={(event) => setForm({ ...form, estimatedMinutes: Number(event.target.value) })} required />
          </Field>
          <Field label="Resource URL (optional)" htmlFor="lesson-resource">
            <Input id="lesson-resource" value={form.resourceUrl} onChange={(event) => setForm({ ...form, resourceUrl: event.target.value })} placeholder="https://..." />
          </Field>
        </div>
        <label className="flex items-center gap-2.5 rounded-xl bg-canvas p-3.5">
          <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo focus:ring-indigo" />
          <span>
            <span className="block text-xs font-bold text-ink">Publish this lesson</span>
            <span className="block text-[0.65rem] text-slate-500">Published lessons count toward student progress.</span>
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" size="sm" loading={saving}>{initial ? 'Save lesson' : 'Create lesson'}</Button>
        </div>
      </form>
    </Modal>
  );
}
