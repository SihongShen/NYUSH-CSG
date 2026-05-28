'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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

// label 在组件内通过 t('review.list.sortOptions.<key>') 翻译；这里只保留 i18n 键映射
const SORT_OPTIONS: { value: SortKey; i18nKey: string }[] = [
  { value: 'newest', i18nKey: 'newest' },
  { value: 'oldest', i18nKey: 'oldest' },
  { value: 'semester-desc', i18nKey: 'semesterDesc' },
  { value: 'semester-asc', i18nKey: 'semesterAsc' }
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

  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const tReviewList = useTranslations('review.list');

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
              {t('backHome')}
            </Link>
          </Button>

          {!reviewsLoading && reviews.length > 0 && (
            <div className="space-y-3">
              <h3 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('stats.title')}
              </h3>
              <dl className="space-y-2 px-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t('stats.reviewed')}</dt>
                  <dd className="font-medium">
                    {t('stats.reviewedValue', { count: coursesCount })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t('stats.professors')}</dt>
                  <dd className="font-medium">
                    {t('stats.professorsValue', { count: professorsCount })}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </aside>

        <div className="space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>

          {/* ─── 顶部：邮箱 + 匿名 ID ─── */}
          <section className="text-sm">
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
              <dt className="whitespace-nowrap text-muted-foreground">
                {t('fields.email')}
              </dt>
              <dd>
                {meLoading ? (
                  <Skeleton className="h-5 w-48" />
                ) : (
                  <span className="font-medium">{me?.email ?? '—'}</span>
                )}
              </dd>
              <dt className="whitespace-nowrap text-muted-foreground">
                {t('fields.anonymousId')}
              </dt>
              <dd>
                {meLoading ? (
                  <Skeleton className="h-6 w-32" />
                ) : me?.anonymous_id ? (
                  <AnonymousIdBadge anonymousId={me.anonymous_id} />
                ) : (
                  <span className="text-destructive">
                    {t('fields.cannotFetch')}
                  </span>
                )}
              </dd>
            </dl>
          </section>

          <Separator />

          {/* ─── 我的评价 ─── */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold">{t('reviews.title')}</h2>

              {reviews.length > 0 && (
                <div className="ml-auto flex flex-wrap items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={showDeleted}
                      onCheckedChange={(v) => setShowDeleted(v === true)}
                    />
                    {t('reviews.showDeleted')}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {tReviewList('sort')}
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
                            {tReviewList(`sortOptions.${opt.i18nKey}`)}
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
              <EmptyState
                title={tReviewList('loadFailedTitle')}
                description={tCommon('toasts.refreshToRetry')}
              />
            ) : reviews.length === 0 ? (
              <EmptyState
                title={t('reviews.emptyTitle')}
                description={t('reviews.emptyDesc')}
              />
            ) : processed.length === 0 ? (
              <EmptyState
                title={t('reviews.filteredEmptyTitle')}
                description={t('reviews.filteredEmptyDesc')}
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
