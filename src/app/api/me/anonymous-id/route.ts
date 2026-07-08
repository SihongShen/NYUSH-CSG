import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { createClient } from '@/lib/db/supabase';

/**
 * POST /api/me/anonymous-id — 重置当前用户的匿名 ID。
 * users 表写操作被 RLS 全禁，走 security definer 函数 reset_anonymous_id()。
 * 返回 { anonymous_id: 新 ID }。历史评价的作者展示会即时切换到新 ID
 * （展示时实时反查，不存快照）。
 */
export async function POST() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('reset_anonymous_id');
    if (error) throw error;
    return NextResponse.json({ anonymous_id: data as string });
  } catch (err) {
    console.error('POST /api/me/anonymous-id error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
