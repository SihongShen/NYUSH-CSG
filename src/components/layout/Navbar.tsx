'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Bug,
  Check,
  ChevronDown,
  Lightbulb,
  LogOut,
  Search,
  User as UserIcon,
  UserCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/cn';
import { useCampus } from '@/components/providers/CampusProvider';
import { createClient } from '@/utils/supabase-browser';
import { SITES } from '@/lib/constants/sites';
import {
  GITHUB_BUG_URL,
  GITHUB_FEATURE_URL,
  GITHUB_REPO_URL
} from '@/lib/constants/links';
import { GitHubIcon } from '@/components/common/GitHubIcon';
import type { CampusCode } from '@/types';
import { LocaleSwitcher } from './LocaleSwitcher';

// 校区 = 16 个 NYU site（SITES 列表顺序：3 个学位校区在前，study-away 在后）
const CAMPUSES: { code: CampusCode; name: string }[] = SITES.map((s) => ({
  code: s.code,
  name: s.name
}));

const ON_VIOLET_BTN =
  'text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40';

export interface NavbarProps {
  userEmail: string | null;
}

export function Navbar({ userEmail }: NavbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { campus, setCampus } = useCampus();
  const t = useTranslations('nav');
  // 输入框跟随 URL 的 ?q=（初始读取 + 前进/后退/点 logo 等导航后同步）
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);
  const netid = userEmail?.split('@')[0] ?? t('userFallback');
  const campusName = CAMPUSES.find((c) => c.code === campus)?.name ?? '';

  async function handleSignOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t('toasts.logoutFailed'));
      return;
    }
    toast.success(t('toasts.loggedOut'));
    router.replace('/login');
    router.refresh();
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    // 只改 q，保留当前已勾选的筛选（major / minor / core / ge）
    const params = new URLSearchParams();
    for (const key of ['major', 'minor', 'core', 'ge']) {
      const v = searchParams.get(key);
      if (v) params.set(key, v);
    }
    if (q) params.set('q', q);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : '/');
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-nyu-violet text-nyu-violet-foreground shadow-md">
      <div className="mx-auto grid h-14 max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 md:h-20 md:grid-cols-[1fr_minmax(0,2fr)_1fr] md:gap-6 md:px-6">
        {/* 左：NYU + 校区下拉（NYU Shanghai 这种品牌呈现）*/}
        <div className="flex items-center justify-self-start gap-2">
          <Link
            href="/"
            className="text-2xl font-extrabold tracking-tight hover:opacity-90 md:text-4xl"
          >
            NYU
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-auto gap-1 px-1 text-lg font-extrabold tracking-tight md:px-2 md:text-3xl',
                  ON_VIOLET_BTN
                )}
              >
                {campusName}
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-96 w-44 overflow-y-auto"
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t('campus.switch')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CAMPUSES.map((c, i) => (
                <div key={c.code}>
                  {/* 3 个学位校区和 study-away site 之间加分隔线 */}
                  {i === 3 && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={() => setCampus(c.code)}
                    className="flex items-center justify-between"
                  >
                    <span>{c.name}</span>
                    {c.code === campus && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 中：搜索框 */}
        <form
          onSubmit={handleSearchSubmit}
          className="w-full max-w-lg justify-self-center"
          role="search"
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="border-white/20 bg-white/10 pl-9 text-white placeholder:text-white/60 focus-visible:border-white/40 focus-visible:bg-white/15 focus-visible:ring-white/40 focus-visible:ring-offset-0"
              aria-label={t('search.ariaLabel')}
            />
          </div>
        </form>

        {/* 右：GitHub / 语言 / 用户菜单 */}
        <nav className="flex items-center justify-self-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className={cn('h-9 w-9 p-0', ON_VIOLET_BTN)}
          >
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('menu.github')}
            >
              <GitHubIcon className="h-4 w-4" />
            </a>
          </Button>
          <LocaleSwitcher className={ON_VIOLET_BTN} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn('gap-1', ON_VIOLET_BTN)}
              >
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{netid}</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {userEmail && (
                <>
                  <DropdownMenuLabel className="font-normal">
                    <div className="text-xs text-muted-foreground">
                      {t('loggedInAs')}
                    </div>
                    <div className="truncate font-medium">{userEmail}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserCircle className="mr-2 h-4 w-4" />
                  {t('menu.profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* 反馈入口：全部引导到 GitHub issue 表单 */}
              <DropdownMenuItem asChild>
                <a href={GITHUB_BUG_URL} target="_blank" rel="noopener noreferrer">
                  <Bug className="mr-2 h-4 w-4" />
                  {t('menu.reportBug')}
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={GITHUB_FEATURE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Lightbulb className="mr-2 h-4 w-4" />
                  {t('menu.featureRequest')}
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHubIcon className="mr-2 h-4 w-4" />
                  {t('menu.github')}
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t('menu.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
