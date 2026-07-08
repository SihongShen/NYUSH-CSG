'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CourseDetailWithReviews } from '@/types';

export interface UseCourseReturn {
  course: CourseDetailWithReviews | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** 拉单个课程详情（含 professors、equivalents 和全部评价，一次请求）。 */
export function useCourse(id: string | null): UseCourseReturn {
  const [course, setCourse] = useState<CourseDetailWithReviews | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!id) {
      setCourse(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/courses/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CourseDetailWithReviews>;
      })
      .then((data) => {
        if (!cancelled) {
          setCourse(data);
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
  }, [id, tick]);

  return { course, loading, error, refetch };
}
