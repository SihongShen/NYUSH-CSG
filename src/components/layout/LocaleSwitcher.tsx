'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export interface LocaleSwitcherProps {
  className?: string;
}

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const other = locale === 'zh' ? 'en' : 'zh';

  function switchLocale() {
    const newPath = pathname.replace(/^\/(zh|en)(?=\/|$)/, `/${other}`);
    router.push(newPath || `/${other}`);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLocale}
      className={className}
      aria-label={`切换到${other === 'zh' ? '中文' : 'English'}`}
    >
      {locale === 'zh' ? 'EN' : '中'}
    </Button>
  );
}
