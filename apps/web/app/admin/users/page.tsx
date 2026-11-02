'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Filter,
  Search,
  ShieldCheck,
  UserCog,
  UserX,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { useApiQuery } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import type { AdminStats, AdminUser, Paginated, Role } from '@/lib/types';
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  PageSkeleton,
  Select,
  StatCard,
  StatusBadge,
} from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { formatDate, formatDateTime } from '@/lib/utils';

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'INSTRUCTOR', label: 'Instructor' },
  { value: 'ADMIN', label: 'Administrator' },
];

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const query = useMemo(
    () => ({
      page,
      limit: 15,
      search: applied || undefined,
      role: role || undefined,
    }),
    [page, applied, role],
  );
  const { data, loading, error, refetch } = useApiQuery<Paginated<AdminUser>>('/admin/users', query);
  const stats = useApiQuery<AdminStats>('/admin/stats');

  return (
    <AppShell requiredRoles={['ADMIN']}>
      <PageHeader
        breadcrumbs={[{ label: 'Administration', href: '/admin/' }, { label: 'Users' }]}
        eyebrow="User management"
        title="Accounts and access"
        description="Search every LearnFlow account, adjust roles and suspend access. Role and status changes revoke active sessions."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All users" value={stats.data?.users.total ?? 0} hint="Active and inactive accounts" icon={Users} tone="indigo" />
        <StatCard label="Students" value={stats.data?.users.students ?? 0} hint="Learning accounts" icon={UserCog} tone="teal" />
        <StatCard label="Instructors" value={stats.data?.users.instructors ?? 0} hint="Course authors" icon={ShieldCheck} tone="amber" />
        <StatCard label="Administrators" value={stats.data?.users.admins ?? 0} hint="Platform operators" icon={ShieldCheck} tone="violet" />
      </div>

      <div className="mt-5 rounded-2xl border border-white bg-white p-4 shadow-card">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setApplied(search.trim());
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="pl-10" />
          </div>
          <Select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} aria-label="Filter by role" className="sm:w-48">
            <option value="">Any role</option>
            {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Button type="submit" variant="secondary">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </form>
      </div>

      {loading && !data ? (
        <div className="mt-5"><PageSkeleton /></div>
      ) : error || !data ? (
        <ErrorState className="mt-5" message={error ?? 'Users unavailable.'} onRetry={refetch} />
      ) : data.data.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={Users}
          title={applied || role ? 'No accounts match' : 'No accounts yet'}
          description={applied || role ? 'Try a different search term or role filter.' : 'Registered accounts will appear here.'}
        />
      ) : (
        <div className="mt-5 rounded-2xl border border-white bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-ink">Accounts</p>
              <p className="mt-0.5 text-xs text-slate-400">{data.meta.total} account{data.meta.total === 1 ? '' : 's'} matching the current view</p>
            </div>
            <Badge tone="slate">{data.meta.total} total</Badge>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-4">Account</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Activity</th>
                  <th className="pb-2 pr-4">Joined</th>
                  <th className="pb-2 pr-4">Last login</th>
                  <th className="pb-2 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.data.map((account) => {
                  const self = account.id === currentUser?.id;
                  return (
                    <tr key={account.id} className={self ? 'bg-lavender/20' : undefined}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={account.name} src={account.avatarUrl} size="sm" />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate font-bold text-ink">
                              {account.name}
                              {self && <Badge tone="indigo">You</Badge>}
                            </p>
                            <p className="truncate text-[0.65rem] text-slate-400">{account.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={account.role === 'ADMIN' ? 'violet' : account.role === 'INSTRUCTOR' ? 'indigo' : 'teal'}>
                          {account.role.toLowerCase()}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={account.isActive ? 'teal' : 'coral'}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-[0.65rem] text-slate-500">
                          {account._count.enrollments} enrolments · {account._count.attempts} attempts
                        </p>
                        {account._count.coursesTaught > 0 && (
                          <p className="text-[0.62rem] text-slate-400">{account._count.coursesTaught} courses taught</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{formatDate(account.createdAt)}</td>
                      <td className="py-3 pr-4 text-slate-500">{account.lastLoginAt ? formatDateTime(account.lastLoginAt) : 'Never'}</td>
                      <td className="py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(account)} disabled={self}>
                          <UserCog className="h-4 w-4" />
                          Manage
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </div>
      )}

      {editing && (
        <EditUserModal
          account={editing}
          self={editing.id === currentUser?.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
            stats.refetch();
          }}
        />
      )}
    </AppShell>
  );
}

function EditUserModal({
  account,
  self,
  onClose,
  onSaved,
}: {
  account: AdminUser;
  self: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(account.name);
  const [role, setRole] = useState<Role>(account.role);
  const [isActive, setIsActive] = useState(account.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (self && role !== account.role) {
      setError('You cannot change your own administrator role.');
      return;
    }
    if (self && !isActive) {
      setError('You cannot deactivate your own account.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/admin/users/${account.id}`, {
        name: name.trim(),
        role,
        isActive,
      });
      toast.success('Account updated. Active sessions were revoked if access changed.');
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Manage ${account.name}`}
      description={account.email}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" type="submit" form="edit-user-form" loading={saving}>
            <CheckCircle2 className="h-4 w-4" />
            Save account
          </Button>
        </>
      }
    >
      <form id="edit-user-form" onSubmit={save} className="space-y-4">
        <Field label="Name" htmlFor="user-name">
          <Input id="user-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required />
        </Field>
        <Field label="Role" htmlFor="user-role" hint={self ? 'You cannot change your own role.' : 'Changing a role revokes the account’s active sessions.'}>
          <Select id="user-role" value={role} onChange={(event) => setRole(event.target.value as Role)} disabled={self}>
            {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>
        <label className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-canvas/60 p-3.5">
          <span>
            <span className="block text-xs font-bold text-ink">Account active</span>
            <span className="mt-0.5 block text-[0.65rem] leading-5 text-slate-500">
              {isActive ? 'The account can sign in and use LearnFlow.' : 'The account is blocked and all sessions are revoked.'}
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((value) => !value)}
            disabled={self}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${isActive ? 'bg-teal' : 'bg-slate-300'} disabled:opacity-50`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${isActive ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </label>
        {!isActive && (
          <p className="flex items-start gap-2 rounded-xl border border-coral/25 bg-softcoral/40 p-3 text-[0.68rem] leading-5 text-[#B91C1C]">
            <UserX className="mt-0.5 h-4 w-4 shrink-0" />
            Deactivating this account immediately revokes every active session.
          </p>
        )}
        {error && <p className="rounded-xl border border-coral/25 bg-softcoral/50 px-3.5 py-2.5 text-xs text-[#B91C1C]">{error}</p>}
      </form>
    </Modal>
  );
}
