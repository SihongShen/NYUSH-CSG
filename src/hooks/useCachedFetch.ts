'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * 模块级内存缓存（标签页生命周期内有效）+ SWR 式取数 hook：
 * 有缓存先立即渲染旧数据、后台静默刷新；没有缓存才走 loading 骨架。
 * 目的：Supabase 在美西、用户在亚洲，每次请求 500ms+，
 * 切回看过的页面不该再等一轮完整请求。
 *
 * 登出时必须 clearFetchCache() 整体清空，避免下一个账号看到上一个账号的数据。
 */
const cache = new Map<string, unknown>();

export function clearFetchCache(): void {
  cache.clear();
}

export function readFetchCache<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function writeFetchCache<T>(key: string, data: T): void {
  cache.set(key, data);
}

export interface UseCachedFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 按 url 取数并缓存（url 即缓存 key）；url 为 null 时不请求。
 * refetch() 总是发起网络请求并回写缓存（loading 只在无数据时为 true，
 * 已有数据的 refetch 原地更新不闪骨架）。
 * 已有旧数据时刷新失败静默保留旧数据，只有无数据可展示才置 error。
 */
export function useCachedFetch<T>(url: string | null): UseCachedFetchReturn<T> {
  const [data, setData] = useState<T | null>(() =>
    url ? ((cache.get(url) as T | undefined) ?? null) : null
  );
  const [loading, setLoading] = useState(() => !!url && !cache.has(url));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const cached = cache.get(url) as T | undefined;
    if (cached !== undefined) {
      setData(cached);
      setLoading(false);
    } else {
      setData(null);
      setLoading(true);
    }
    setError(null);

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<T>;
      })
      .then((fresh) => {
        cache.set(url, fresh); // 组件已卸载也回填，下次进来直接命中
        if (!cancelled) {
          setData(fresh);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (cache.get(url) === undefined) {
          setError(err instanceof Error ? err.message : 'fetch failed');
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, tick]);

  return { data, loading, error, refetch };
}
