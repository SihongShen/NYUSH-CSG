'use client';

import { useEffect, useState } from 'react';

/**
 * 把一个频繁变化的值"延迟"返回。
 *
 * 典型场景：搜索框输入时不想每个字符都发请求。
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebounce(query, 300);
 *   useEffect(() => {
 *     if (debouncedQuery) fetchCourses(debouncedQuery);
 *   }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
