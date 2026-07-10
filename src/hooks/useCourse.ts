'use client';

import { useCachedFetch } from './useCachedFetch';
import type { CourseDetailWithReviews } from '@/types';

export interface UseCourseReturn {
  course: CourseDetailWithReviews | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 拉单个课程详情（含 professors、equivalents 和全部评价，一次请求）。
 * 走内存缓存：看过的课回访秒开，后台静默刷新；评价增删改后
 * 页面调 refetch() 原地更新（也会回写缓存）。
 */
export function useCourse(id: string | null): UseCourseReturn {
  const { data, loading, error, refetch } =
    useCachedFetch<CourseDetailWithReviews>(id ? `/api/courses/${id}` : null);
  return { course: data, loading, error, refetch };
}
