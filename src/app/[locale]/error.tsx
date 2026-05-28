'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/**
 * Locale 段下的全局错误兜底。
 * Next.js App Router 约定：error.tsx 必须是 client component，
 * 接收 error + reset 两个 prop。
 */
export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error.server');

  useEffect(() => {
    // 给 Sentry/上游一个钩子；MVP 阶段仅 console
    console.error('App-level error caught by error.tsx:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <p className="font-mono text-6xl font-bold text-destructive">500</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground/70">
            ref: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          onClick={reset}
          className="bg-nyu-violet text-nyu-violet-foreground hover:bg-nyu-violet/90"
        >
          {t('retry')}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">{t('backHome')}</Link>
        </Button>
      </div>
    </main>
  );
}
