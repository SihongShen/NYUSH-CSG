'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export interface LocaleSwitcherProps {
  className?: string;
}

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('locale');

  const other = locale === 'zh' ? 'en' : 'zh';

  function switchLocale() {
    const newPath =
      pathname.replace(/^\/(zh|en)(?=\/|$)/, `/${other}`) || `/${other}`;
    // pathname 不含 query string，手动拼回去，避免切语言丢搜索/筛选
    const qs = searchParams.toString();
    router.push(qs ? `${newPath}?${qs}` : newPath);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLocale}
      className={className}
      aria-label={other === 'zh' ? t('switchToZh') : t('switchToEn')}
    >
      {locale === 'zh' ? 'EN' : '中'}
    </Button>
  );
}
