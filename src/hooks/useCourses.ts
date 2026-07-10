'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { readFetchCache, writeFetchCache } from './useCachedFetch';
import type { CampusCode, CoreType, CourseWithStats, Paginated } from '@/types';

const PAGE_SIZE = 20;
const MAX_RESTORE = 100; // 后端单次 limit 上限，恢复时最多拉这么多

export interface UseCoursesParams {
  campus?: CampusCode;
  q?: string;
  majors?: string[];
  minors?: string[];
  core_types?: CoreType[];
  only_general_elective?: boolean;
}

export interface UseCoursesReturn {
  items: CourseWithStats[] | null;   // null = 首次加载还没回来
  total: number;
  loading: boolean;            // 首屏（筛选条件变化后的第一页）
  loadingMore: boolean;        // 加载更多中
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

interface CachedList {
  items: CourseWithStats[];
  total: number;
}

function buildQueryString(
  params: UseCoursesParams,
  offset: number,
  limit: number
): string {
  const qs = new URLSearchParams();
  if (params.campus) qs.set('campus', params.campus);
  if (params.q) qs.set('q', params.q);
  if (params.majors?.length) qs.set('major', params.majors.join(','));
  if (params.minors?.length) qs.set('minor', params.minors.join(','));
  if (params.core_types?.length) qs.set('core', params.core_types.join(','));
  if (params.only_general_elective) qs.set('ge', '1');
  qs.set('limit', String(limit));
  if (offset > 0) qs.set('offset', String(offset));
  return qs.toString();
}

/**
 * 课程列表，带「加载更多」分页：
 * - loadMore() 拉下一页并追加，同时把已加载条数写进 URL 的 ?n=
 *   （replace，不产生历史记录）——从课程详情返回时按 n 恢复列表深度
 * - 筛选条件变化时重置到第一页并清掉 n
 * - 每组筛选条件的累积结果进内存缓存：切回时先渲染缓存（保留深度），
 *   后台按相同深度静默刷新，不闪骨架
 */
export function useCourses(params: UseCoursesParams): UseCoursesReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<CourseWithStats[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(params);
  // 请求代际计数：筛选变化后，旧的 loadMore 响应直接丢弃
  const generation = useRef(0);
  // setItems 的同步镜像：追加合并和缓存回写都从这里读，避免闭包旧值
  const itemsRef = useRef<CourseWithStats[] | null>(null);
  // 挂载时从 URL 恢复已加载条数（仅首屏用一次）
  const initialCount = useRef<number>(
    Math.min(
      Math.max(parseInt(searchParams.get('n') ?? '', 10) || PAGE_SIZE, PAGE_SIZE),
      MAX_RESTORE
    )
  );
  const firstLoad = useRef(true);

  // 把已加载条数同步到 URL（replace 不进历史；回到默认一页时清掉 n）
  const syncCountToUrl = useCallback(
    (count: number) => {
      const params = new URLSearchParams(window.location.search);
      if (count > PAGE_SIZE) params.set('n', String(count));
      else params.delete('n');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const fetchPage = useCallback(
    (
      currentKey: string,
      offset: number,
      append: boolean,
      limit: number,
      silent = false // 已有缓存数据时的后台刷新：不动 loading / error，失败静默
    ) => {
      const gen = ++generation.current;
      const current: UseCoursesParams = JSON.parse(currentKey);

      if (append) setLoadingMore(true);
      else if (!silent) {
        setLoading(true);
        setError(null);
      }

      fetch(`/api/courses?${buildQueryString(current, offset, limit)}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<Paginated<CourseWithStats>>;
        })
        .then((json) => {
          if (gen !== generation.current) return;
          const merged =
            append && itemsRef.current
              ? [...itemsRef.current, ...json.items]
              : json.items;
          itemsRef.current = merged;
          setItems(merged);
          setTotal(json.total);
          writeFetchCache<CachedList>(`courses:${currentKey}`, {
            items: merged,
            total: json.total
          });
          setLoading(false);
          setLoadingMore(false);
        })
        .catch((err: unknown) => {
          if (gen !== generation.current) return;
          if (!silent) {
            setError(err instanceof Error ? err.message : 'fetch failed');
          }
          setLoading(false);
          setLoadingMore(false);
        });
    },
    []
  );

  useEffect(() => {
    const isFirst = firstLoad.current;
    firstLoad.current = false;

    const cached = readFetchCache<CachedList>(`courses:${key}`);
    if (cached) {
      // 命中缓存：立即渲染（保留之前的加载深度），后台按相同深度刷新
      itemsRef.current = cached.items;
      setItems(cached.items);
      setTotal(cached.total);
      setLoading(false);
      setError(null);
      fetchPage(key, 0, false, Math.min(Math.max(cached.items.length, PAGE_SIZE), MAX_RESTORE), true);
      if (!isFirst) syncCountToUrl(cached.items.length);
      return;
    }

    itemsRef.current = null;
    setItems(null);
    if (isFirst) {
      // 首屏：按 URL 里的 n 一次性恢复到之前的深度
      fetchPage(key, 0, false, initialCount.current);
    } else {
      // 筛选变化：回到第一页，清掉 URL 里的 n
      fetchPage(key, 0, false, PAGE_SIZE);
      syncCountToUrl(PAGE_SIZE);
    }
  }, [key, fetchPage, syncCountToUrl]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore) return;
    const offset = items?.length ?? 0;
    fetchPage(key, offset, true, PAGE_SIZE);
    syncCountToUrl(offset + PAGE_SIZE);
  }, [fetchPage, syncCountToUrl, key, items, loading, loadingMore]);

  const hasMore = !!items && items.length < total;

  return { items, total, loading, loadingMore, error, hasMore, loadMore };
}
