'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  ChevronDown,
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
import type { CampusCode } from '@/types';
import { LocaleSwitcher } from './LocaleSwitcher';

// 校区显示名映射 —— code 列表跟 types/index.ts 的 CampusCode 一致
const CAMPUSES: { code: CampusCode; name: string }[] = [
  { code: 'SH', name: 'Shanghai' },
  { code: 'NY', name: 'New York' },
  { code: 'AD', name: 'Abu Dhabi' }
];

const ON_VIOLET_BTN =
  'text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40';

export interface NavbarProps {
  userEmail: string | null;
}

export function Navbar({ userEmail }: NavbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { campus, setCampus } = useCampus();
  // 初始从 URL 读 ?q=xxx，方便分享链接 / 刷新保持
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const netid = userEmail?.split('@')[0] ?? '用户';
  const campusName = CAMPUSES.find((c) => c.code === campus)?.name ?? '';

  async function handleSignOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('退出失败，请重试');
      return;
    }
    toast.success('已退出登录');
    router.replace('/login');
    router.refresh();
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/?q=${encodeURIComponent(q)}` : '/');
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
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                切换校区
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CAMPUSES.map((c) => (
                <DropdownMenuItem
                  key={c.code}
                  onClick={() => setCampus(c.code)}
                  className="flex items-center justify-between"
                >
                  <span>{c.name}</span>
                  {c.code === campus && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
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
              placeholder="搜索课程编号 / 名称 / 教授..."
              className="border-white/20 bg-white/10 pl-9 text-white placeholder:text-white/60 focus-visible:border-white/40 focus-visible:bg-white/15 focus-visible:ring-white/40 focus-visible:ring-offset-0"
              aria-label="搜索课程"
            />
          </div>
        </form>

        {/* 右：语言 / 用户菜单 */}
        <nav className="flex items-center justify-self-end gap-1">
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
                    <div className="text-xs text-muted-foreground">登录为</div>
                    <div className="truncate font-medium">{userEmail}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserCircle className="mr-2 h-4 w-4" />
                  前往个人中心
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
