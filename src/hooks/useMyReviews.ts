'use client';

import { useCachedFetch } from './useCachedFetch';
import type { ReviewWithCourse } from '@/types';

export interface UseMyReviewsReturn {
  reviews: ReviewWithCourse[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 拉当前登录用户的所有评价（含软删），按创建时间倒序。
 * 走内存缓存：回访 profile 页秒开，后台静默刷新。
 */
export function useMyReviews(): UseMyReviewsReturn {
  const { data, loading, error, refetch } = useCachedFetch<{
    items: ReviewWithCourse[];
  }>('/api/reviews?user_id=me');
  return { reviews: data?.items ?? [], loading, error, refetch };
}
