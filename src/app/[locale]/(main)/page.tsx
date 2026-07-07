'use client';

import { useState } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useCampus } from '@/components/providers/CampusProvider';
import { useCourses } from '@/hooks/useCourses';
import { useUrlState } from '@/hooks/useUrlState';
import { CourseFilterPanel } from '@/components/course/CourseFilterPanel';
import { CourseGrid } from '@/components/course/CourseGrid';
import { CourseSubmitDialog } from '@/components/course/CourseSubmitDialog';
import {
  isValidCoreType,
  isValidMajor,
  isValidMinor
} from '@/lib/constants/majors';
import { cn } from '@/utils/cn';

export default function HomePage() {
  const { campus } = useCampus();
  const { get, getArray } = useUrlState();
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const q = get('q');
  const majors = getArray('major').filter(isValidMajor);
  const minors = getArray('minor').filter(isValidMinor);
  const core_types = getArray('core').filter(isValidCoreType);
  const only_general_elective = get('ge') === '1';
  const activeFilterCount =
    majors.length +
    minors.length +
    core_types.length +
    (only_general_elective ? 1 : 0);

  const { items, total, loading, loadingMore, error, hasMore, loadMore } =
    useCourses({
      campus,
      q: q || undefined,
      majors: majors.length ? majors : undefined,
      minors: minors.length ? minors : undefined,
      core_types: core_types.length ? core_types : undefined,
      only_general_elective
    });

  const showingCount = items?.length ?? 0;
  const hasFilter =
    !!q ||
    majors.length > 0 ||
    minors.length > 0 ||
    core_types.length > 0 ||
    only_general_elective;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => setSubmitOpen(true)}
            className="bg-nyu-violet text-nyu-violet-foreground shadow-sm hover:bg-nyu-violet/90 focus-visible:ring-nyu-violet/40"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('addCourse')}
          </Button>
          {!loading && items && (
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {hasFilter ? t('matched', { total }) : t('total', { total })}
              {total > showingCount &&
                ` · ${t('showingFirst', { showing: showingCount })}`}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[220px_1fr]">
        <div>
          {/* 移动端：折叠按钮 + 状态徽标。桌面端隐藏。 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMobileFilterOpen((v) => !v)}
            className="mb-3 w-full justify-between lg:hidden"
            aria-expanded={mobileFilterOpen}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              {t('filterToggle')}
              {activeFilterCount > 0 && (
                <span className="rounded bg-nyu-violet px-1.5 py-0.5 text-xs text-nyu-violet-foreground">
                  {activeFilterCount}
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {mobileFilterOpen
                ? tCommon('actions.collapse')
                : tCommon('actions.expand')}
            </span>
          </Button>
          {/* 桌面端始终显示；移动端跟随 mobileFilterOpen */}
          <div className={cn(mobileFilterOpen ? 'block' : 'hidden', 'lg:block')}>
            <CourseFilterPanel />
          </div>
        </div>
        <div>
          <CourseGrid
            courses={items}
            loading={loading}
            error={error}
          />
          {hasMore && !loading && !error && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore
                  ? tCommon('states.loading')
                  : t('loadMore', { remaining: total - showingCount })}
              </Button>
            </div>
          )}
        </div>
      </div>

      <CourseSubmitDialog open={submitOpen} onOpenChange={setSubmitOpen} />
    </main>
  );
}
