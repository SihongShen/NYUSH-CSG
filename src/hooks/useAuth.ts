'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase-browser';

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;            // 首次拉 session 时为 true
  signOut: () => Promise<void>;
}

/**
 * 客户端访问当前用户 + 监听 auth 状态变化。
 *
 * 服务端 / Server Component 不用这个，用 `getUser()`（lib/auth/session.ts）。
 *
 * 用法：
 *   const { user, signOut } = useAuth();
 *   if (!user) return null;  // 通常不会发生，middleware 已经拦了
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // 首次拿当前 session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // 后续监听变化（其他 tab 登出 / token 续期 / signOut 等）
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.replace('/login');
    router.refresh();
  }

  return { user, session, loading, signOut };
}
