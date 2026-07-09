import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Ghost, Globe2, Link2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoginForm } from '@/components/auth/LoginForm';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { Footer } from '@/components/layout/Footer';
import { WaterGradient } from '@/components/auth/LoginEffects';

const ORIGINAL_DOC_URL =
  'https://docs.google.com/document/d/1_46q2ZaguHqDbUTc0qgZt9BzO13IlvI1OLSGuiG0Pkg/edit?usp=sharing';

export default function LoginPage() {
  const t = useTranslations('auth');

  const card = (
    <Card className="relative overflow-hidden">
      {/* 顶部品牌条 */}
      <div className="h-1.5 bg-nyu-violet" />

      {/* 语言切换：贴在卡片右上角 */}
      <div className="absolute right-2 top-3.5">
        <Suspense>
          <LocaleSwitcher className="h-7 px-2 text-xs text-muted-foreground" />
        </Suspense>
      </div>

      <div className="px-6 pb-2 pt-6 text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span className="rounded bg-nyu-violet px-1.5 py-0.5 text-lg font-extrabold leading-none text-nyu-violet-foreground">
            NYU
          </span>
          <h1 className="text-xl font-semibold tracking-tight">
            {t('title')}
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <CardContent className="pt-4">
        {/* LoginForm 用 useSearchParams 读回调错误，需要 Suspense 边界 */}
        <Suspense>
          <LoginForm />
        </Suspense>

        <Separator className="my-4" />
        <FeatureRow />
      </CardContent>
    </Card>
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-nyu-violet/50 via-nyu-violet/10 to-background">
      {/* 可搅动的渐变水面（WebGL；不可用时 CSS 渐变兜底） */}
      <WaterGradient />

      <main className="relative flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          {card}
          <CreditLine />
        </div>
      </main>
      <Footer />
    </div>
  );
}

/** 三个特性点：匿名 / 16 校区 / 等同课 */
function FeatureRow() {
  const t = useTranslations('auth.features');
  const items = [
    { icon: Ghost, label: t('anonymous') },
    { icon: Globe2, label: t('campuses') },
    { icon: Link2, label: t('equivalents') }
  ];
  return (
    <ul className="grid grid-cols-3 gap-2">
      {items.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex flex-col items-center gap-1.5 text-center"
        >
          <Icon className="h-4 w-4 text-nyu-violet/70" aria-hidden />
          <span className="text-xs text-muted-foreground">{label}</span>
        </li>
      ))}
    </ul>
  );
}

/** 致谢：本站延续自历届同学维护的选课原文档 */
function CreditLine() {
  const t = useTranslations('auth.credit');
  return (
    <p className="mt-4 text-center text-xs text-muted-foreground">
      {t('prefix')}
      <a
        href={ORIGINAL_DOC_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        {t('linkText')}
      </a>
      {t('suffix')}
    </p>
  );
}
