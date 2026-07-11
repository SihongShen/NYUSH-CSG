import { createClient } from './supabase';

const HOUR_MS = 60 * 60 * 1000;

/** 每人每小时创建上限（防灌水；半封闭社区，宽松即可） */
export const HOURLY_LIMITS = {
  reviews: 10,
  courses: 5
} as const;

/**
 * 滚动 1 小时窗口内，当前用户在表里创建的行数是否已达上限。
 * 基于 DB count，serverless 多实例下依然准确。
 *
 * reviews 走 review_feed 视图按 is_own 计数（user_id 列已对客户端隐藏，
 * 不能直接 eq('user_id')）；courses 仍按 created_by 直查。
 */
export async function isOverHourlyLimit(
  kind: 'reviews' | 'courses',
  userId: string,
  limit: number
): Promise<boolean> {
  const supabase = await createClient();
  const since = new Date(Date.now() - HOUR_MS).toISOString();

  const query =
    kind === 'reviews'
      ? supabase
          .from('review_feed')
          .select('id', { count: 'exact', head: true })
          .eq('is_own', true)
          .gte('created_at', since)
      : supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', userId)
          .gte('created_at', since);

  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) >= limit;
}
