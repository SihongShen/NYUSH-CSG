'use client';

import { BookOpen, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { CourseCard } from './CourseCard';
import type { CourseWithStats } from '@/types';

export interface CourseGridProps {
  courses: CourseWithStats[] | null;
  loading: boolean;
  error: string | null;
}

export function CourseGrid({ courses, loading, error }: CourseGridProps) {
  const t = useTranslations('course.list');

  if (loading && !courses) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-10 w-10" />}
        title={t('loadFailedTitle')}
        description={t('loadFailedDesc')}
      />
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-10 w-10" />}
        title={t('emptyTitle')}
        description={t('emptyDesc')}
      />
    );
  }

  return (
    <div className="space-y-3">
      {courses.map((c) => (
        <CourseCard key={c.id} course={c} reviewCount={c.review_count} />
      ))}
    </div>
  );
}
