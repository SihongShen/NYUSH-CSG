import { createClient } from './supabase';
import { findOrCreateProfessor } from './professors';
import type {
  ReviewCreatePayload,
  ReviewUpdatePayload,
  ReviewWithAuthor,
  ReviewWithCourse,
  VoteValue
} from '@/types';

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface VoteStats {
  upvotes: number;
  downvotes: number;
  my_vote: VoteValue;
}

/** 批量拉一组评价的投票统计（一次查询，内存聚合） */
async function fetchVoteStats(
  supabase: Supabase,
  reviewIds: string[],
  currentUserId: string | null
): Promise<Map<string, VoteStats>> {
  const stats = new Map<string, VoteStats>();
  if (reviewIds.length === 0) return stats;

  const { data, error } = await supabase
    .from('review_votes')
    .select('review_id, user_id, vote')
    .in('review_id', reviewIds);
  if (error) throw error;

  for (const row of data ?? []) {
    const s = stats.get(row.review_id) ?? {
      upvotes: 0,
      downvotes: 0,
      my_vote: 0 as VoteValue
    };
    if (row.vote === 1) s.upvotes += 1;
    else s.downvotes += 1;
    if (currentUserId && row.user_id === currentUserId) {
      s.my_vote = row.vote as VoteValue;
    }
    stats.set(row.review_id, s);
  }
  return stats;
}

const EMPTY_VOTES: VoteStats = { upvotes: 0, downvotes: 0, my_vote: 0 };

/** 展开等同课组：给一个 course_id，返回整组的 id（锚点 + 全部成员） */
async function resolveEquivalentGroup(
  supabase: Supabase,
  courseId: string
): Promise<string[]> {
  const { data: course } = await supabase
    .from('courses')
    .select('id, equivalent_id')
    .eq('id', courseId)
    .maybeSingle();
  if (!course) return [courseId];

  const anchorId = course.equivalent_id ?? course.id;
  const { data: group } = await supabase
    .from('courses')
    .select('id')
    .or(`id.eq.${anchorId},equivalent_id.eq.${anchorId}`);

  const ids = (group ?? []).map((c) => c.id as string);
  return ids.length > 0 ? ids : [courseId];
}

/**
 * 一门课的所有评价，**含等同课组内其他校区课程的评价**
 * （NY 的 Data Structures 和 SH 的等同课评价合并展示，靠 site 字段区分来源）。
 *
 * RLS 处理可见性：is_visible = true 给所有 authenticated；自己软删的也能看到。
 * 同时 enrich：作者 anonymous_id + 教授名 + 点赞统计。
 */
export async function listReviewsForCourse(
  courseId: string,
  currentUserId: string | null
): Promise<ReviewWithAuthor[]> {
  const supabase = await createClient();

  const courseIds = await resolveEquivalentGroup(supabase, courseId);

  const { data, error } = await supabase
    .from('reviews')
    .select('*, professors(id, name_en)')
    .in('course_id', courseIds)
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

  const voteStats = await fetchVoteStats(
    supabase,
    data.map((r: { id: string }) => r.id),
    currentUserId
  );

  return data.map((r) => {
    const row = r as Record<string, unknown>;
    const prof = row.professors as { name_en?: string } | null;
    const userId = row.user_id as string | null;
    const votes = voteStats.get(row.id as string) ?? EMPTY_VOTES;
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
      professor_name_en: prof?.name_en ?? '',
      ...votes
    };
  });
}

/**
 * 当前用户自己的所有评价（含软删），按时间倒序。
 * 同时 join 课程基本信息（code / name_en）让 profile 页能显示是哪门课。
 *
 * 调用前已由 API 层用 requireUser() 鉴权，所以这里直接 trust userId。
 */
export async function listReviewsForUser(
  userId: string
): Promise<ReviewWithCourse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .select('*, professors(id, name_en), courses(id, code, name_en)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  // 自己看自己，author_anonymous_id 单独取一次（所有 review 都是同一个 user_id）
  let anonymousId: string | null = null;
  const { data: anon } = await supabase.rpc('get_anonymous_id', {
    p_user_id: userId
  });
  anonymousId = (anon as string | null) ?? null;

  const voteStats = await fetchVoteStats(
    supabase,
    data.map((r: { id: string }) => r.id),
    userId
  );

  return data.map((r) => {
    const row = r as Record<string, unknown>;
    const prof = row.professors as { name_en?: string } | null;
    const course = row.courses as
      | { code?: string; name_en?: string }
      | null;
    const votes = voteStats.get(row.id as string) ?? EMPTY_VOTES;
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      course_id: row.course_id as string,
      professor_id: row.professor_id as string,
      semester: row.semester as string,
      site: row.site as string,
      content_zh: (row.content_zh as string | null) ?? null,
      content_en: (row.content_en as string | null) ?? null,
      is_visible: row.is_visible as boolean,
      created_at: row.created_at as string,
      author_anonymous_id: anonymousId,
      professor_name_en: prof?.name_en ?? '',
      course_code: course?.code ?? '',
      course_name_en: course?.name_en ?? '',
      ...votes
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
    professorId = await findOrCreateProfessor(
      supabase,
      payload.new_professor_name
    );

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

  // site：前端可传 16 个 NYU site（study-away 场景），不传默认课程的 home_campus
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
      site: payload.site ?? courseRow.home_campus,
      content_zh: payload.content_zh ?? null,
      content_en: payload.content_en ?? null
    })
    .select('id')
    .single();

  if (error) throw error;
  return { id: data.id as string };
}

// ============================================================================
// 点赞 / 点踩
// ============================================================================

/**
 * 投票（+1 赞 / -1 踩 / 0 撤票）。
 * - 评价不存在或不可见（且不是自己的）→ review_not_found
 * - 不能给自己的评价投票 → cannot_vote_own
 */
export async function setReviewVote(
  reviewId: string,
  userId: string,
  vote: -1 | 0 | 1
): Promise<void> {
  const supabase = await createClient();

  const { data: review } = await supabase
    .from('reviews')
    .select('id, user_id')
    .eq('id', reviewId)
    .maybeSingle();
  if (!review) throw new Error('review_not_found');
  if (review.user_id === userId) throw new Error('cannot_vote_own');

  if (vote === 0) {
    const { error } = await supabase
      .from('review_votes')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('review_votes')
    .upsert(
      { review_id: reviewId, user_id: userId, vote },
      { onConflict: 'review_id,user_id' }
    );
  if (error) throw error;
}

/** 改评价内容（不允许改 prof / semester / site，FEATURES.md 约定）。
 *  评价不存在或不属于该用户时抛 review_not_found（0 行匹配不算成功）。 */
export async function updateReview(
  id: string,
  payload: ReviewUpdatePayload,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .update({
      content_zh: payload.content_zh ?? null,
      content_en: payload.content_en ?? null
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('review_not_found');
}

/** 软删（PATCH is_visible=false）。RLS 保证只能操作自己的。 */
export async function softDeleteReview(id: string, userId: string): Promise<void> {
  await setReviewVisibility(id, userId, false);
}

/** 恢复（is_visible=true）。 */
export async function restoreReview(id: string, userId: string): Promise<void> {
  await setReviewVisibility(id, userId, true);
}

async function setReviewVisibility(
  id: string,
  userId: string,
  isVisible: boolean
): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reviews')
    .update({ is_visible: isVisible })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('review_not_found');
}
