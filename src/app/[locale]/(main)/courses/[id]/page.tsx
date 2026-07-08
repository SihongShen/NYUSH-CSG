'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseDetailHeader } from '@/components/course/CourseDetailHeader';
import { ReviewList } from '@/components/review/ReviewList';
import { ReviewSubmitDialog } from '@/components/review/ReviewSubmitDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useCourse } from '@/hooks/useCourse';
import { siteName } from '@/lib/constants/sites';
import type { CourseDetail } from '@/types';

const SIDEBAR_GRID = 'grid grid-cols-1 items-start gap-8 lg:grid-cols-[220px_1fr]';

function SideNav({ children }: { children?: React.ReactNode }) {
  const t = useTranslations('course.detail');
  return (
    <aside className="space-y-6 lg:sticky lg:top-24">
      <Button variant="ghost" size="sm" asChild className="w-full justify-start">
        <Link href="/">
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t('backToList')}
        </Link>
      </Button>
      {children}
    </aside>
  );
}

function CourseInfo({
  course,
  reviewsLoading,
  reviewsCount
}: {
  course: CourseDetail;
  reviewsLoading: boolean;
  reviewsCount: number;
}) {
  const t = useTranslations('course.detail.info');
  return (
    <div className="space-y-3">
      <h3 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t('title')}
      </h3>
      <dl className="space-y-2 px-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('campus')}</dt>
          <dd className="font-medium">{siteName(course.home_campus)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('professors')}</dt>
          <dd className="font-medium">
            {t('professorsValue', { count: course.professors.length })}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('reviews')}</dt>
          <dd className="font-medium">
            {reviewsLoading ? '…' : t('reviewsValue', { count: reviewsCount })}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function CourseDetailPage({
  params
}: {
  params: { id: string; locale: string };
}) {
  const { id } = params;
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const t = useTranslations('course.detail');
  // 详情 + 评价合并在一个请求里返回（GET /api/courses/[id]）
  const {
    course,
    loading: courseLoading,
    error: courseError,
    refetch: refetchCourse
  } = useCourse(id);
  const reviews = course?.reviews ?? [];
  const reviewsLoading = courseLoading;
  const reviewsError = courseError;

  const [submitOpen, setSubmitOpen] = useState(false);

  const hasOwnReview = !!user && reviews.some((r) => r.user_id === user.id);

  // ?focus=review → 评价加载完后滚动到「我的评价」区块（profile 页跳过来用）
  const focusedRef = useRef(false);
  useEffect(() => {
    if (focusedRef.current) return;
    if (searchParams.get('focus') !== 'review') return;
    if (reviewsLoading) return;
    if (!hasOwnReview) return;
    const el = document.getElementById('my-reviews');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      focusedRef.current = true;
    }
  }, [searchParams, reviewsLoading, hasOwnReview]);

  function refreshAll() {
    refetchCourse();
  }

  if (courseLoading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className={SIDEBAR_GRID}>
          <SideNav />
          <div className="space-y-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </main>
    );
  }

  if (courseError || !course) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className={SIDEBAR_GRID}>
          <SideNav />
          <div>
            <EmptyState
              title={t('notFoundTitle')}
              description={t('notFoundDesc')}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className={SIDEBAR_GRID}>
        <SideNav>
          {/* 桌面端：课程信息留在 sidebar */}
          <div className="hidden lg:block">
            <CourseInfo
              course={course}
              reviewsLoading={reviewsLoading}
              reviewsCount={reviews.length}
            />
          </div>
        </SideNav>
        <div className="space-y-6">
          <CourseDetailHeader course={course} />

          {/* 移动端：课程信息插在课程卡片下、写评价上 */}
          <div className="lg:hidden">
            <CourseInfo
              course={course}
              reviewsLoading={reviewsLoading}
              reviewsCount={reviews.length}
            />
          </div>

          <ReviewList
            reviews={reviews}
            loading={reviewsLoading}
            error={reviewsError}
            canWriteReview={!hasOwnReview}
            onWriteReview={() => setSubmitOpen(true)}
            onUpdated={refreshAll}
          />
        </div>
      </div>

      <ReviewSubmitDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        courseId={course.id}
        professors={course.professors}
        onSubmitted={() => {
          setSubmitOpen(false);
          refreshAll();
        }}
      />
    </main>
  );
}
