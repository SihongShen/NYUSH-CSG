'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CampusCode, CoreType, Course, Paginated } from '@/types';

const PAGE_SIZE = 20;

export interface UseCoursesParams {
  campus?: CampusCode;
  q?: string;
  majors?: string[];
  minors?: string[];
  core_types?: CoreType[];
  only_general_elective?: boolean;
}

export interface UseCoursesReturn {
  items: Course[] | null;      // null = 首次加载还没回来
  total: number;
  loading: boolean;            // 首屏（筛选条件变化后的第一页）
  loadingMore: boolean;        // 加载更多中
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

function buildQueryString(params: UseCoursesParams, offset: number): string {
  const qs = new URLSearchParams();
  if (params.campus) qs.set('campus', params.campus);
  if (params.q) qs.set('q', params.q);
  if (params.majors?.length) qs.set('major', params.majors.join(','));
  if (params.minors?.length) qs.set('minor', params.minors.join(','));
  if (params.core_types?.length) qs.set('core', params.core_types.join(','));
  if (params.only_general_elective) qs.set('ge', '1');
  qs.set('limit', String(PAGE_SIZE));
  if (offset > 0) qs.set('offset', String(offset));
  return qs.toString();
}

/**
 * 课程列表，带「加载更多」分页：筛选条件变化时重置到第一页，
 * loadMore() 拉下一页并追加到已有列表。
 */
export function useCourses(params: UseCoursesParams): UseCoursesReturn {
  const [items, setItems] = useState<Course[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(params);
  // 请求代际计数：筛选变化后，旧的 loadMore 响应直接丢弃
  const generation = useRef(0);

  const fetchPage = useCallback(
    (currentKey: string, offset: number, append: boolean) => {
      const gen = ++generation.current;
      const current: UseCoursesParams = JSON.parse(currentKey);

      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }

      fetch(`/api/courses?${buildQueryString(current, offset)}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<Paginated<Course>>;
        })
        .then((json) => {
          if (gen !== generation.current) return;
          setTotal(json.total);
          setItems((prev) =>
            append && prev ? [...prev, ...json.items] : json.items
          );
          setLoading(false);
          setLoadingMore(false);
        })
        .catch((err: unknown) => {
          if (gen !== generation.current) return;
          setError(err instanceof Error ? err.message : 'fetch failed');
          setLoading(false);
          setLoadingMore(false);
        });
    },
    []
  );

  useEffect(() => {
    setItems(null);
    fetchPage(key, 0, false);
  }, [key, fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore) return;
    fetchPage(key, items?.length ?? 0, true);
  }, [fetchPage, key, items, loading, loadingMore]);

  const hasMore = !!items && items.length < total;

  return { items, total, loading, loadingMore, error, hasMore, loadMore };
}
