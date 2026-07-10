'use client';

import { useCachedFetch } from './useCachedFetch';

export interface MeProfile {
  id: string;
  email: string | null;
  anonymous_id: string | null;
}

export interface UseMeReturn {
  me: MeProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 拉当前登录用户的基本信息（含 anonymous_id），用于 profile 页 badge。
 * 走内存缓存（登出时由 clearFetchCache 清空，不会串账号）。
 */
export function useMe(): UseMeReturn {
  const { data, loading, error, refetch } = useCachedFetch<MeProfile>('/api/me');
  return { me: data, loading, error, refetch };
}
