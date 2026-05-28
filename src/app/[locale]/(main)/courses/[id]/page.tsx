'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseDetailHeader } from '@/components/course/CourseDetailHeader';
import { ReviewForm } from '@/components/review/ReviewForm';
import { ReviewList } from '@/components/review/ReviewList';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useCourse } from '@/hooks/useCourse';
import { useReviews } from '@/hooks/useReviews';

const SIDEBAR_GRID = 'grid grid-cols-1 items-start gap-8 lg:grid-cols-[220px_1fr]';

function SideNav({ children }: { children?: React.ReactNode }) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-24">
      <Button variant="ghost" size="sm" asChild className="w-full justify-start">
        <Link href="/">
          <ChevronLeft className="mr-1 h-4 w-4" />
          返回课程列表
        </Link>
      </Button>
      {children}
    </aside>
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
  const {
    course,
    loading: courseLoading,
    error: courseError,
    refetch: refetchCourse
  } = useCourse(id);
  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
    refetch: refetchReviews
  } = useReviews(id);

  const [writingNew, setWritingNew] = useState(false);

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
    refetchReviews();
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
              title="课程不存在"
              description="可能已删除或链接错误，请返回课程列表"
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
          <div className="space-y-3">
            <h3 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              课程信息
            </h3>
            <dl className="space-y-2 px-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">校区</dt>
                <dd className="font-medium">{course.home_campus}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">教授</dt>
                <dd className="font-medium">{course.professors.length} 位</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">评价</dt>
                <dd className="font-medium">
                  {reviewsLoading ? '…' : `${reviews.length} 条`}
                </dd>
              </div>
            </dl>
          </div>
        </SideNav>
        <div className="space-y-6">
          <CourseDetailHeader course={course} />

          {writingNew && (
            <Card className="px-5 py-4">
              <ReviewForm
                courseId={course.id}
                professors={course.professors}
                onCancel={() => setWritingNew(false)}
                onSubmitted={() => {
                  setWritingNew(false);
                  refreshAll();
                }}
              />
            </Card>
          )}

          <ReviewList
            reviews={reviews}
            loading={reviewsLoading}
            error={reviewsError}
            professors={course.professors}
            canWriteReview={!hasOwnReview && !writingNew}
            onWriteReview={() => setWritingNew(true)}
            onUpdated={refreshAll}
          />
        </div>
      </div>
    </main>
  );
}
