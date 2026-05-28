'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { EmptyState } from '@/components/common/EmptyState';
import { AnonymousIdBadge } from '@/components/profile/AnonymousIdBadge';
import { ReviewCard } from '@/components/review/ReviewCard';
import { useMe } from '@/hooks/useMe';
import { useMyReviews } from '@/hooks/useMyReviews';
import type { ReviewWithCourse } from '@/types';

// ---------------------------------------------------------------------------
// 排序（跟 ReviewList 行为一致；profile 没有跨课的按教授筛）
// ---------------------------------------------------------------------------

type SortKey = 'newest' | 'oldest' | 'semester-desc' | 'semester-asc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: '最新发布' },
  { value: 'oldest', label: '最早发布' },
  { value: 'semester-desc', label: '学期由新到旧' },
  { value: 'semester-asc', label: '学期由旧到新' }
];

const SEASON_ORDER: Record<string, number> = {
  January: 0,
  Spring: 1,
  Summer: 2,
  Fall: 3,
  Winter: 4
};

function semesterOrdinal(s: string): number {
  const parts = s.split(' ');
  if (parts.length !== 2) return 0;
  const year = parseInt(parts[0], 10);
  if (!Number.isFinite(year)) return 0;
  return year * 10 + (SEASON_ORDER[parts[1]] ?? 0);
}

function sortReviews(items: ReviewWithCourse[], key: SortKey): ReviewWithCourse[] {
  const arr = [...items];
  switch (key) {
    case 'newest':
      arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
      break;
    case 'oldest':
      arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
      break;
    case 'semester-desc':
      arr.sort(
        (a, b) => semesterOrdinal(b.semester) - semesterOrdinal(a.semester)
      );
      break;
    case 'semester-asc':
      arr.sort(
        (a, b) => semesterOrdinal(a.semester) - semesterOrdinal(b.semester)
      );
      break;
  }
  return arr;
}

// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const { me, loading: meLoading } = useMe();
  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
    refetch
  } = useMyReviews();

  const [sort, setSort] = useState<SortKey>('newest');
  const [showDeleted, setShowDeleted] = useState(true);

  const processed = useMemo(() => {
    const filtered = showDeleted
      ? reviews
      : reviews.filter((r) => r.is_visible);
    return sortReviews(filtered, sort);
  }, [reviews, sort, showDeleted]);

  const coursesCount = new Set(reviews.map((r) => r.course_id)).size;
  const professorsCount = new Set(reviews.map((r) => r.professor_id)).size;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-6 lg:sticky lg:top-24">
          <Button variant="ghost" size="sm" asChild className="w-full justify-start">
            <Link href="/">
              <ChevronLeft className="mr-1 h-4 w-4" />
              回首页
            </Link>
          </Button>

          {!reviewsLoading && reviews.length > 0 && (
            <div className="space-y-3">
              <h3 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                统计
              </h3>
              <dl className="space-y-2 px-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">已评价</dt>
                  <dd className="font-medium">{coursesCount} 门</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">涉及教授</dt>
                  <dd className="font-medium">{professorsCount} 位</dd>
                </div>
              </dl>
            </div>
          )}
        </aside>

        <div className="space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight">个人中心</h1>

          {/* ─── 顶部：邮箱 + 匿名 ID ─── */}
          <section className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-muted-foreground">邮箱</span>
              {meLoading ? (
                <Skeleton className="h-5 w-48" />
              ) : (
                <span className="font-medium">{me?.email ?? '—'}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-muted-foreground">匿名 ID</span>
              {meLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : me?.anonymous_id ? (
                <AnonymousIdBadge anonymousId={me.anonymous_id} />
              ) : (
                <span className="text-destructive">无法获取</span>
              )}
            </div>
          </section>

          <Separator />

          {/* ─── 我的评价 ─── */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold">我的评价</h2>

              {reviews.length > 0 && (
                <div className="ml-auto flex flex-wrap items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={showDeleted}
                      onCheckedChange={(v) => setShowDeleted(v === true)}
                    />
                    显示已删除
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      排序
                    </span>
                    <Select
                      value={sort}
                      onValueChange={(v) => setSort(v as SortKey)}
                    >
                      <SelectTrigger className="h-8 w-auto gap-2 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        {SORT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {reviewsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
            ) : reviewsError ? (
              <EmptyState title="评价加载失败" description="刷新页面重试" />
            ) : reviews.length === 0 ? (
              <EmptyState
                title="还没写过评价"
                description="去课程列表挑一门写下你的感受吧"
              />
            ) : processed.length === 0 ? (
              <EmptyState
                title="没有可显示的评价"
                description='勾选"显示已删除"看回所有评价'
              />
            ) : (
              <div className="space-y-3">
                {processed.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    isOwnReview
                    onUpdated={refetch}
                    course={{
                      id: r.course_id,
                      code: r.course_code,
                      name_en: r.course_name_en
                    }}
                    editHref={`/courses/${r.course_id}?focus=review`}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
