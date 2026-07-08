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
        variant="outline"
        className="w-full gap-2"
        onClick={handleGoogleSignIn}
        disabled={submitting}
      >
        <GoogleLogo />
        {submitting ? t('buttons.signingIn') : t('buttons.googleSignIn')}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {t('hints.nyuOnly')}
      </p>
    </div>
  );
}

/** Google "G" logo，内联 SVG（CSP 禁外链资源） */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
