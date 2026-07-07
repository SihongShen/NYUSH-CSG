'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase-browser';
import { ALLOWED_DOMAIN } from '@/lib/auth/validate';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export function LoginForm() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // /api/auth/callback 失败时带 error 参数跳回来
  const urlError = searchParams.get('error');
  const urlErrorText = urlError
    ? t(urlError === 'domain' ? 'errors.domainNotAllowed' : 'errors.loginFailed')
    : null;

  async function handleGoogleSignIn() {
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: { hd: ALLOWED_DOMAIN, prompt: 'select_account' }
      }
    });
    // 成功时浏览器整页跳转到 Google，走不到下面
    if (oauthError) {
      setError(t('errors.loginFailed'));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {(error ?? urlErrorText) && (
        <Alert variant="destructive">{error ?? urlErrorText}</Alert>
      )}

      <Button
        type="button"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={submitting}
      >
        {submitting ? t('buttons.signingIn') : t('buttons.googleSignIn')}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {t('hints.nyuOnly')}
      </p>
    </div>
  );
}
