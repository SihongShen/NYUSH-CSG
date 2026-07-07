import { createClient } from './supabase';

const HOUR_MS = 60 * 60 * 1000;

/** 每人每小时创建上限（防灌水；半封闭社区，宽松即可） */
export const HOURLY_LIMITS = {
  reviews: 10,
  courses: 5
} as const;

/**
 * 滚动 1 小时窗口内，某用户在表里创建的行数是否已达上限。
 * 基于 DB count，serverless 多实例下依然准确。
 */
export async function isOverHourlyLimit(
  table: 'reviews' | 'courses',
  userColumn: 'user_id' | 'created_by',
  userId: string,
  limit: number
): Promise<boolean> {
  const supabase = await createClient();
  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(userColumn, userId)
    .gte('created_at', since);
  if (error) throw error;
  return (count ?? 0) >= limit;
}
