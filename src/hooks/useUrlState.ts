'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type UrlValue = string | string[] | null | undefined;

/**
 * URL query 参数读写工具，状态跟着 URL 走。
 *
 * 设计：跨维度筛选用逗号合并到一个 key（?category=Core,Major），
 * 这样 URL 简洁、可分享、刷新保持状态。
 *
 * 用法：
 *   const { get, getArray, set, update } = useUrlState();
 *
 *   const q = get('q');                            // ""
 *   const categories = getArray('category');       // ['Core', 'Major']
 *
 *   set('q', 'CSCI');                              // → ?q=CSCI
 *   set('category', ['Core', 'Major']);            // → ?category=Core,Major
 *   set('q', null);                                // 删除 q
 *
 *   update({ q: 'CSCI', category: ['Core'] });     // 一次更新多个
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback(
    (key: string): string => searchParams.get(key) ?? '',
    [searchParams]
  );

  const getArray = useCallback(
    (key: string): string[] => {
      const value = searchParams.get(key);
      return value ? value.split(',').filter(Boolean) : [];
    },
    [searchParams]
  );

  const update = useCallback(
    (updates: Record<string, UrlValue>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (
          value == null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)
        ) {
          params.delete(key);
        } else if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const set = useCallback(
    (key: string, value: UrlValue) => update({ [key]: value }),
    [update]
  );

  return { get, getArray, set, update };
}
