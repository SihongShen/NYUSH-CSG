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
  // 投票统计是 enrich，不是核心数据：查询失败时降级为空计数，
  // 不让它把整个（合并进课程详情的）请求拖垮
  if (error) {
    console.error('fetchVoteStats error (degraded to empty)', error);
    return stats;
  }

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
  return listReviewsForCourseIds(courseIds, currentUserId);
}

/**
 * 直接按一组已知的 course_id 拉评价（调用方已经解析好等同课组，
 * 避免课程详情端点重复解析——getCourse 已经查过整组）。
 */
export async function listReviewsForCourseIds(
  courseIds: string[],
  currentUserId: string | null
): Promise<ReviewWithAuthor[]> {
  const supabase = await createClient();

  // review_feed 视图：作者匿名 ID / 教授名已 join 好，is_own 服务端算好，
  // 不含 user_id（匿名性：作者真实 UUID 不出库）
  const { data, error } = await supabase
    .from('review_feed')
    .select('*')
    .in('course_id', courseIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  const voteStats = await fetchVoteStats(
    supabase,
    data.map((r: { id: string }) => r.id),
    currentUserId
  );

  return data.map((r) => {
    const row = r as Record<string, unknown>;
    const votes = voteStats.get(row.id as string) ?? EMPTY_VOTES;
    return {
      id: row.id as string,
      course_id: row.course_id as string,
      professor_id: row.professor_id as string,
      semester: row.semester as string,
      site: row.site as string,
      content_zh: (row.content_zh as string | null) ?? null,
      content_en: (row.content_en as string | null) ?? null,
      is_visible: row.is_visible as boolean,
      created_at: row.created_at as string,
      author_anonymous_id: (row.author_anonymous_id as string | null) ?? null,
      professor_name_en: (row.professor_name_en as string | null) ?? '',
      is_own: row.is_own === true,
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

  // is_own 由视图按 auth.uid() 算出，等价于原来的 eq('user_id', userId)
  const { data, error } = await supabase
    .from('review_feed')
    .select('*')
    .eq('is_own', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  const voteStats = await fetchVoteStats(
    supabase,
    data.map((r: { id: string }) => r.id),
    userId
  );

  return data.map((r) => {
    const row = r as Record<string, unknown>;
    const votes = voteStats.get(row.id as string) ?? EMPTY_VOTES;
    return {
      id: row.id as string,
      course_id: row.course_id as string,
      professor_id: row.professor_id as string,
      semester: row.semester as string,
      site: row.site as string,
      content_zh: (row.content_zh as string | null) ?? null,
      content_en: (row.content_en as string | null) ?? null,
      is_visible: row.is_visible as boolean,
      created_at: row.created_at as string,
      author_anonymous_id: (row.author_anonymous_id as string | null) ?? null,
      professor_name_en: (row.professor_name_en as string | null) ?? '',
      is_own: true,
      course_code: (row.course_code as string | null) ?? '',
      course_name_en: (row.course_name_en as string | null) ?? '',
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

  // review_feed 不暴露 user_id，归属判断用视图算好的 is_own
  const { data: review } = await supabase
    .from('review_feed')
    .select('id, is_own')
    .eq('id', reviewId)
    .maybeSingle();
  if (!review) throw new Error('review_not_found');
  if (review.is_own) throw new Error('cannot_vote_own');

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
 *  归属校验靠 RLS 的 reviews_update_self（user_id 列已对客户端隐藏，
 *  不能再用 eq('user_id') 过滤）；评价不存在或不属于当前用户时
 *  更新命中 0 行 → 抛 review_not_found。 */
export async function updateReview(
  id: string,
  payload: ReviewUpdatePayload
): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .update({
      content_zh: payload.content_zh ?? null,
      content_en: payload.content_en ?? null
    })
    .eq('id', id)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('review_not_found');
}

/** 软删（PATCH is_visible=false）。RLS 保证只能操作自己的。 */
export async function softDeleteReview(id: string): Promise<void> {
  await setReviewVisibility(id, false);
}

/** 恢复（is_visible=true）。 */
export async function restoreReview(id: string): Promise<void> {
  await setReviewVisibility(id, true);
}

async function setReviewVisibility(id: string, isVisible: boolean): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reviews')
    .update({ is_visible: isVisible })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('review_not_found');
}
