'use client';

import { useEffect, useState } from 'react';
import type { CampusCode, CoreType, Course, Paginated } from '@/types';

export interface UseCoursesParams {
  campus?: CampusCode;
  q?: string;
  majors?: string[];
  minors?: string[];
  core_types?: CoreType[];
  only_general_elective?: boolean;
  limit?: number;
  offset?: number;
}

export interface UseCoursesReturn {
  data: Paginated<Course> | null;
  loading: boolean;
  error: string | null;
}

function buildQueryString(params: UseCoursesParams): string {
  const qs = new URLSearchParams();
  if (params.campus) qs.set('campus', params.campus);
  if (params.q) qs.set('q', params.q);
  if (params.majors?.length) qs.set('major', params.majors.join(','));
  if (params.minors?.length) qs.set('minor', params.minors.join(','));
  if (params.core_types?.length) qs.set('core', params.core_types.join(','));
  if (params.only_general_elective) qs.set('ge', '1');
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  return qs.toString();
}

export function useCourses(params: UseCoursesParams): UseCoursesReturn {
  const [data, setData] = useState<Paginated<Course> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    const current: UseCoursesParams = JSON.parse(key);

    setLoading(true);
    setError(null);

    const qs = buildQueryString(current);
    fetch(`/api/courses${qs ? `?${qs}` : ''}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Paginated<Course>>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
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
  }, [key]);

  return { data, loading, error };
}
