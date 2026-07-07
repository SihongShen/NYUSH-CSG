'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { isValidNetId, isValidPassword } from '@/lib/auth/validate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

export function RegisterForm() {
  const t = useTranslations('auth');
  const [netid, setNetid] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!isValidNetId(netid)) {
      setError(t('errors.invalidNetid'));
      return;
    }
    if (!isValidPassword(password)) {
      setError(t('errors.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ netid, password })
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // 服务端返回的是 i18n key（如 emailNotAllowed）；未知错误（含 Supabase
      // 原始 message）统一显示通用失败文案，不把裸 key / 英文原文抛给用户
      const knownErrors = ['invalidNetid', 'passwordTooShort', 'emailNotAllowed'];
      setError(
        knownErrors.includes(body?.error)
          ? t(`errors.${body.error}`)
          : t('errors.registerFailed')
      );
      return;
    }
    setSuccess(true);
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="register-netid">{t('fields.netid')}</Label>
        <div className="flex items-stretch overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
          <Input
            id="register-netid"
            type="text"
            autoComplete="username"
            value={netid}
            onChange={(e) => setNetid(e.target.value)}
            placeholder={t('placeholders.netid')}
            disabled={submitting}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            required
          />
          <span className="flex select-none items-center bg-muted px-3 text-sm text-muted-foreground">
            @nyu.edu
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{t('hints.netidOnly')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-password">{t('fields.password')}</Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('placeholders.password')}
          disabled={submitting}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-confirm">{t('fields.confirmPassword')}</Label>
        <Input
          id="register-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={submitting}
          required
        />
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
      {success && <Alert variant="success">{t('messages.registerSuccess')}</Alert>}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t('buttons.registering') : t('buttons.register')}
      </Button>
    </form>
  );
}
