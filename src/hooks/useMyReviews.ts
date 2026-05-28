'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReviewWithCourse } from '@/types';

export interface UseMyReviewsReturn {
  reviews: ReviewWithCourse[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** 拉当前登录用户的所有评价（含软删），按创建时间倒序。 */
export function useMyReviews(): UseMyReviewsReturn {
  const [reviews, setReviews] = useState<ReviewWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/reviews?user_id=me')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ items: ReviewWithCourse[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setReviews(data.items ?? []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'fetch failed');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { reviews, loading, error, refetch };
}
