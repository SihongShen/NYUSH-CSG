'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseDetailHeader } from '@/components/course/CourseDetailHeader';
import { ReviewForm } from '@/components/review/ReviewForm';
import { ReviewList } from '@/components/review/ReviewList';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useCourse } from '@/hooks/useCourse';
import { useReviews } from '@/hooks/useReviews';

export default function CourseDetailPage({
  params
}: {
  params: { id: string; locale: string };
}) {
  const { id } = params;
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

  function refreshAll() {
    refetchCourse();
    refetchReviews();
  }

  if (courseLoading) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </main>
    );
  }

  if (courseError || !course) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <EmptyState
          title="课程不存在"
          description="可能已删除或链接错误，请返回课程列表"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
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
    </main>
  );
}
