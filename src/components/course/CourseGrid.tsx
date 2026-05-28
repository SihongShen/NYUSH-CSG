'use client';

import { BookOpen, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { CourseCard } from './CourseCard';
import type { Course } from '@/types';

export interface CourseGridProps {
  courses: Course[] | null;
  loading: boolean;
  error: string | null;
}

export function CourseGrid({ courses, loading, error }: CourseGridProps) {
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
        title="加载失败"
        description="网络或服务器出错了，刷新页面重试。"
      />
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-10 w-10" />}
        title="没找到课程"
        description="试试调整筛选条件，或换个搜索关键词。"
      />
    );
  }

  return (
    <div className="space-y-3">
      {courses.map((c) => (
        <CourseCard key={c.id} course={c} />
      ))}
    </div>
  );
}
