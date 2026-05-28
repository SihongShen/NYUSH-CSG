'use client';

import { useEffect, useState } from 'react';

export interface MeProfile {
  id: string;
  email: string | null;
  anonymous_id: string | null;
}

export interface UseMeReturn {
  me: MeProfile | null;
  loading: boolean;
  error: string | null;
}

/** 拉当前登录用户的基本信息（含 anonymous_id），用于 profile 页 badge。 */
export function useMe(): UseMeReturn {
  const [me, setMe] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<MeProfile>;
      })
      .then((data) => {
        if (!cancelled) {
          setMe(data);
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
  }, []);

  return { me, loading, error };
}
