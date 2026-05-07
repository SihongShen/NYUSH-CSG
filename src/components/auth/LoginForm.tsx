'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase-browser';
import { buildEmail, isValidNetId, isValidPassword } from '@/lib/auth/validate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

export function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [netid, setNetid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidNetId(netid)) {
      setError(t('errors.invalidNetid'));
      return;
    }
    if (!isValidPassword(password)) {
      setError(t('errors.passwordTooShort'));
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: buildEmail(netid),
      password
    });
    setSubmitting(false);

    if (signInError) {
      setError(t('errors.loginFailed'));
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-netid">{t('fields.netid')}</Label>
        <div className="flex items-stretch overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
          <Input
            id="login-netid"
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
        <Label htmlFor="login-password">{t('fields.password')}</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('placeholders.password')}
          disabled={submitting}
          required
        />
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t('buttons.loggingIn') : t('buttons.login')}
      </Button>
    </form>
  );
}
