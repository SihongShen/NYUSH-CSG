'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { EmptyState } from '@/components/common/EmptyState';
import { ReviewCard } from './ReviewCard';
import type { Professor, ReviewWithAuthor } from '@/types';

// ---------------------------------------------------------------------------
// 排序
// ---------------------------------------------------------------------------

type SortKey = 'newest' | 'oldest' | 'semester-desc' | 'semester-asc';

// label 在组件内通过 t('sortOptions.<key>') 翻译
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

function sortReviews(
  items: ReviewWithAuthor[],
  key: SortKey
): ReviewWithAuthor[] {
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
// 主组件
// ---------------------------------------------------------------------------

const ALL_PROFS = 'all';

export interface ReviewListProps {
  reviews: ReviewWithAuthor[];
  loading: boolean;
  error: string | null;
  professors: Professor[];
  canWriteReview: boolean;
  onWriteReview: () => void;
  onUpdated: () => void;
}

export function ReviewList({
  reviews,
  loading,
  error,
  professors,
  canWriteReview,
  onWriteReview,
  onUpdated
}: ReviewListProps) {
  const { user } = useAuth();
  const t = useTranslations('review.list');
  const tCommon = useTranslations('common');
  const [profValue, setProfValue] = useState<string>(ALL_PROFS);
  const [sort, setSort] = useState<SortKey>('newest');

  // 先按教授过滤，再按 sort 排序
  const processed = useMemo(() => {
    const byProf =
      profValue === ALL_PROFS
        ? reviews
        : reviews.filter((r) => r.professor_id === profValue);
    return sortReviews(byProf, sort);
  }, [reviews, profValue, sort]);

  // 拆分：自己的（含软删）置顶
  const { mine, others } = useMemo(() => {
    const mine: ReviewWithAuthor[] = [];
    const others: ReviewWithAuthor[] = [];
    for (const r of processed) {
      if (user && r.user_id === user.id) {
        mine.push(r);
      } else {
        others.push(r);
      }
    }
    return { mine, others };
  }, [processed, user]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t('loadFailedTitle')}
        description={tCommon('toasts.refreshToRetry')}
      />
    );
  }

  const hasProfFilter = professors.length >= 2;
  const profFiltered = profValue !== ALL_PROFS;

  return (
    <div className="space-y-6">
      {/* ─── 一行：写评价按钮 + 教授筛选 + 排序 ─── */}
      <div className="flex flex-wrap items-center gap-3">
        {canWriteReview && (
          <Button
            onClick={onWriteReview}
            className="w-full bg-nyu-violet text-nyu-violet-foreground shadow-sm hover:bg-nyu-violet/90 sm:w-auto"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('writeReview')}
          </Button>
        )}

        <div className="flex items-center gap-3 sm:ml-auto">
          {hasProfFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('professorFilter')}
              </span>
              <Select value={profValue} onValueChange={setProfValue}>
                <SelectTrigger className="h-8 w-auto gap-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={ALL_PROFS}>{t('allProfessors')}</SelectItem>
                  {professors.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('sort')}
            </span>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-8 w-auto gap-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(`sortOptions.${opt.i18nKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ─── 列表 ─── */}
      {processed.length === 0 ? (
        <EmptyState
          title={profFiltered ? t('emptyWithFilterTitle') : t('emptyTitle')}
          description={
            profFiltered
              ? t('emptyWithFilterDesc')
              : canWriteReview
                ? t('emptyDescCanWrite')
                : t('emptyDescCantWrite')
          }
        />
      ) : (
        <>
          {mine.length > 0 && (
            <div id="my-reviews" className="scroll-mt-24">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('sections.mine')}
              </h3>
              <div className="space-y-3">
                {mine.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    isOwnReview
                    onUpdated={onUpdated}
                  />
                ))}
              </div>
            </div>
          )}

          {mine.length > 0 && others.length > 0 && <Separator />}

          {others.length > 0 && (
            <div>
              {mine.length > 0 && (
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('sections.others')}
                </h3>
              )}
              <div className="space-y-3">
                {others.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    isOwnReview={false}
                    onUpdated={onUpdated}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
