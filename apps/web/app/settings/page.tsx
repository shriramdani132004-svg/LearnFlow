'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, CheckCircle2, KeyRound, LogOut, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { Avatar, Badge, Field, Input, PageHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { formatDate, formatDateTime, isValidUrl } from '@/lib/utils';

export default function SettingsPage() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatarUrl(user.avatarUrl ?? '');
    }
  }, [user]);

  const passwordChecks = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'One number', met: /\d/.test(newPassword) },
  ];

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    if (avatarUrl.trim() && !isValidUrl(avatarUrl.trim())) {
      toast.error('Avatar URL must be a valid http or https link.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ name: name.trim(), avatarUrl: avatarUrl.trim() || undefined });
      toast.success('Profile updated.');
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (!passwordChecks.every((check) => check.met)) {
      toast.error('Please choose a password that meets every requirement.');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed. Other sessions were revoked.');
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setSavingPassword(false);
    }
  }

  async function signOut() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login/');
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your profile, password and active session."
      />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <form onSubmit={saveProfile} className="rounded-2xl border border-white bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender text-indigo"><UserRound className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-bold text-ink">Profile</p>
                <p className="text-xs text-slate-400">How your name appears across LearnFlow</p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-4 rounded-2xl bg-canvas p-4">
              <Avatar name={name || user.name} src={avatarUrl || user.avatarUrl} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{name || user.name}</p>
                <p className="truncate text-xs text-slate-400">{user.email}</p>
                <Badge tone={user.role === 'INSTRUCTOR' ? 'indigo' : user.role === 'ADMIN' ? 'violet' : 'teal'} className="mt-1.5">{user.role}</Badge>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Full name" htmlFor="name" hint="Between 2 and 80 characters.">
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required />
              </Field>
              <Field label="Email address" htmlFor="email" hint="Email changes are managed by a platform administrator.">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="email" value={user.email} readOnly disabled className="pl-10" />
                </div>
              </Field>
              <Field label="Avatar URL" htmlFor="avatar" hint="Optional public https image URL. Leave blank to use your initials.">
                <Input id="avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://example.com/avatar.png" />
              </Field>
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="submit" loading={savingProfile}>
                <Save className="h-4 w-4" />
                Save profile
              </Button>
            </div>
          </form>

          <form onSubmit={savePassword} className="rounded-2xl border border-white bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-softteal text-teal"><KeyRound className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-bold text-ink">Change password</p>
                <p className="text-xs text-slate-400">Changing your password revokes other active sessions</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Current password" htmlFor="current">
                <Input id="current" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New password" htmlFor="new">
                  <Input id="new" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" />
                </Field>
                <Field label="Confirm new password" htmlFor="confirm">
                  <Input id="confirm" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {passwordChecks.map((check) => (
                  <p key={check.label} className={`flex items-center gap-1.5 text-[0.68rem] font-medium ${check.met ? 'text-teal' : 'text-slate-400'}`}>
                    <CheckCircle2 className={`h-3.5 w-3.5 ${check.met ? 'text-teal' : 'text-slate-300'}`} />
                    {check.label}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="submit" variant="teal" loading={savingPassword}>
                <ShieldCheck className="h-4 w-4" />
                Update password
              </Button>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-slate-400">Account details</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-[0.65rem] text-slate-400">Joined</p>
                  <p className="text-xs font-semibold text-ink">{formatDate(user.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-[0.65rem] text-slate-400">Last login</p>
                  <p className="text-xs font-semibold text-ink">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'This session'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-[0.65rem] text-slate-400">Role</p>
                  <p className="text-xs font-semibold text-ink">{user.role}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-ink to-[#273B8F] p-5 text-white shadow-lift">
            <ShieldCheck className="h-5 w-5 text-[#B9BBFF]" />
            <p className="mt-2 text-sm font-bold">Security</p>
            <p className="mt-1 text-xs leading-5 text-white/55">
              Access tokens live in HttpOnly cookies, refresh tokens rotate on use, and unsafe
              requests require a CSRF token. Sign out on shared devices.
            </p>
            <Button variant="danger" size="sm" className="mt-4 w-full" onClick={signOut} loading={loggingOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>

          <div className="rounded-2xl border border-white bg-white p-5 shadow-card">
            <p className="text-sm font-bold text-ink">Need a change?</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Email address and role changes require a platform administrator. Contact the operator
              of this LearnFlow deployment.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
