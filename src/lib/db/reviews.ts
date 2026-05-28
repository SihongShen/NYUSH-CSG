import { createClient } from './supabase';
import type {
  ReviewCreatePayload,
  ReviewUpdatePayload,
  ReviewWithAuthor
} from '@/types';

/**
 * 一门课的所有评价（RLS 处理可见性：
 *   - is_visible = true 给所有 authenticated
 *   - 自己软删的也能看到，has_visible 字段反映状态）
 *
 * 同时 enrich：作者 anonymous_id（走 get_anonymous_id 函数）+ 教授名（join）
 */
export async function listReviewsForCourse(
  courseId: string
): Promise<ReviewWithAuthor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .select('*, professors(id, name_en)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  // 批量取 anonymous_id（N 个 unique user 调 N 次；小规模可接受）
  const uniqueUserIds = Array.from(
    new Set(
      data
        .map((r: { user_id: string | null }) => r.user_id)
        .filter((id): id is string => !!id)
    )
  );

  const anonMap = new Map<string, string | null>();
  await Promise.all(
    uniqueUserIds.map(async (uid) => {
      const { data: anon } = await supabase.rpc('get_anonymous_id', {
        p_user_id: uid
      });
      anonMap.set(uid, (anon as string | null) ?? null);
    })
  );

  return data.map((r) => {
    const row = r as Record<string, unknown>;
    const prof = row.professors as { name_en?: string } | null;
    const userId = row.user_id as string | null;
    return {
      id: row.id as string,
      user_id: userId as string,
      course_id: row.course_id as string,
      professor_id: row.professor_id as string,
      semester: row.semester as string,
      site: row.site as string,
      content_zh: (row.content_zh as string | null) ?? null,
      content_en: (row.content_en as string | null) ?? null,
      is_visible: row.is_visible as boolean,
      created_at: row.created_at as string,
      author_anonymous_id: userId ? anonMap.get(userId) ?? null : null,
      professor_name_en: prof?.name_en ?? ''
    };
  });
}

/**
 * 创建评价。
 * - 如果给了 professor_id：直接用
 * - 如果给了 new_professor_name：先 find-or-create 教授 + 关联到课程，再用其 id
 *
 * 同 user_id+course_id+professor_id+semester 撞唯一约束会抛 23505。
 */
export async function createReview(
  payload: ReviewCreatePayload,
  userId: string
): Promise<{ id: string }> {
  const supabase = await createClient();

  let professorId = payload.professor_id;

  if (!professorId && payload.new_professor_name) {
    const name = payload.new_professor_name.trim();

    const { data: existingProf } = await supabase
      .from('professors')
      .select('id')
      .eq('name_en', name)
      .maybeSingle();

    if (existingProf) {
      professorId = existingProf.id;
    } else {
      professorId = crypto.randomUUID();
      const { error: profErr } = await supabase
        .from('professors')
        .insert({ id: professorId, name_en: name });
      if (profErr) throw profErr;
    }

    // 关联到课程（重复忽略）
    await supabase
      .from('course_professor')
      .upsert(
        { course_id: payload.course_id, professor_id: professorId },
        { onConflict: 'course_id,professor_id', ignoreDuplicates: true }
      );
  }

  if (!professorId) {
    throw new Error('professor_required');
  }

  // 自动 derive site：用课程的 home_campus
  const { data: courseRow, error: courseErr } = await supabase
    .from('courses')
    .select('home_campus')
    .eq('id', payload.course_id)
    .maybeSingle();
  if (courseErr) throw courseErr;
  if (!courseRow) throw new Error('course_not_found');

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      user_id: userId,
      course_id: payload.course_id,
      professor_id: professorId,
      semester: payload.semester,
      site: courseRow.home_campus,
      content_zh: payload.content_zh ?? null,
      content_en: payload.content_en ?? null
    })
    .select('id')
    .single();

  if (error) throw error;
  return { id: data.id as string };
}

/** 改评价内容（不允许改 prof / semester / site，FEATURES.md 约定）。 */
export async function updateReview(
  id: string,
  payload: ReviewUpdatePayload,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('reviews')
    .update({
      content_zh: payload.content_zh ?? null,
      content_en: payload.content_en ?? null
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

/** 软删（PATCH is_visible=false）。RLS 保证只能操作自己的。 */
export async function softDeleteReview(id: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('reviews')
    .update({ is_visible: false })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

/** 恢复（is_visible=true）。 */
export async function restoreReview(id: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('reviews')
    .update({ is_visible: true })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}
