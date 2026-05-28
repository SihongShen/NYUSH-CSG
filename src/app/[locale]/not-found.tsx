import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const t = useTranslations('error.notFound');

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <p className="font-mono text-6xl font-bold text-nyu-violet">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <Button asChild className="bg-nyu-violet text-nyu-violet-foreground hover:bg-nyu-violet/90">
        <Link href="/">{t('backHome')}</Link>
      </Button>
    </main>
  );
}
