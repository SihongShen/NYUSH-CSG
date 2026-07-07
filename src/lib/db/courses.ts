import { createClient } from './supabase';
import { findOrCreateProfessor } from './professors';
import type {
  CampusCode,
  CoreType,
  Course,
  CourseApplyPayload,
  CourseDetail,
  CourseWithStats,
  EquivalentCourse,
  Paginated,
  Professor
} from '@/types';

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** 课程 code 重复时抛这个错，API 转 409 + existing_id */
export class DuplicateCourseCodeError extends Error {
  constructor(public existingId: string) {
    super('duplicate_code');
    this.name = 'DuplicateCourseCodeError';
  }
}

export interface GetCoursesParams {
  campus?: CampusCode;
  q?: string;
  majors?: string[];                 // 主修：required ∪ elective 任一匹配
  minors?: string[];
  core_types?: CoreType[];
  only_general_elective?: boolean;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** PostgREST 的 or filter 里有特殊字符要转义；ILIKE 也有自己的通配符 % _。 */
function escapeFilterValue(s: string): string {
  return s.replace(/[(),%_]/g, (m) => `\\${m}`);
}

/** 把字符串数组拼成 PostgREST 接受的 array 字面量 `{"a","b"}`，处理引号转义。 */
function toArrayLiteral(values: string[]): string {
  const items = values
    .map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .join(',');
  return `{${items}}`;
}

/**
 * 按搜索 + 多维度筛选拉课程列表，带分页和总数。
 *
 * 同维度内 OR（数组成员任一匹配），跨维度 AND。
 * Major 筛选时 required ∪ elective 一起匹配。
 *
 * 默认排序：code ASC。
 */
/**
 * 一页课程的评价数统计，按等同课组合并：
 * 每门课的 review_count = 它所在等同组（锚点 + 全部成员）所有评价之和。
 * 两次查询搞定：组成员反查（含嵌套 count 聚合）→ 按锚点汇总。
 */
async function fetchGroupReviewCounts(
  supabase: Supabase,
  courses: Course[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (courses.length === 0) return result;

  // 每门课归属的锚点（自己是锚点，或指向的那门上海课）
  const anchorOf = new Map<string, string>();
  const anchors = new Set<string>();
  for (const c of courses) {
    const anchor = c.equivalent_id ?? c.id;
    anchorOf.set(c.id, anchor);
    anchors.add(anchor);
  }

  // 拉所有组成员 + 各自的评价数（嵌套 count，RLS 生效）
  const anchorList = Array.from(anchors).join(',');
  const { data: members, error } = await supabase
    .from('courses')
    .select('id, equivalent_id, reviews(count)')
    .or(`id.in.(${anchorList}),equivalent_id.in.(${anchorList})`);
  if (error) throw error;

  const sumByAnchor = new Map<string, number>();
  for (const m of members ?? []) {
    const anchor = (m.equivalent_id as string | null) ?? (m.id as string);
    const nested = m.reviews as { count?: number }[] | null;
    const cnt = nested?.[0]?.count ?? 0;
    sumByAnchor.set(anchor, (sumByAnchor.get(anchor) ?? 0) + cnt);
  }

  for (const c of courses) {
    const anchor = anchorOf.get(c.id);
    result.set(c.id, (anchor && sumByAnchor.get(anchor)) || 0);
  }
  return result;
}

export async function getCourses(
  params: GetCoursesParams = {}
): Promise<Paginated<CourseWithStats>> {
  const supabase = await createClient();
  const {
    campus,
    q,
    majors,
    minors,
    core_types,
    only_general_elective,
    limit = DEFAULT_LIMIT,
    offset = 0
  } = params;

  const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
  const safeOffset = Math.max(0, offset);

  let query = supabase.from('courses').select('*', { count: 'exact' });

  if (campus) {
    query = query.eq('home_campus', campus);
  }

  if (q && q.trim()) {
    const escaped = escapeFilterValue(q.trim());
    const orParts = [`code.ilike.%${escaped}%`, `name_en.ilike.%${escaped}%`];

    // 教授名匹配：教授名小写存储，先查中标教授 → 关联课程 id，并入 OR 条件
    const { data: profMatches } = await supabase
      .from('professors')
      .select('id')
      .ilike('name_en', `%${escapeFilterValue(q.trim().toLowerCase())}%`)
      .limit(50);
    if (profMatches && profMatches.length > 0) {
      const { data: cps } = await supabase
        .from('course_professor')
        .select('course_id')
        .in('professor_id', profMatches.map((p) => p.id))
        .limit(500);
      const courseIds = Array.from(
        new Set((cps ?? []).map((c) => c.course_id as string))
      );
      if (courseIds.length > 0) {
        orParts.push(`id.in.(${courseIds.join(',')})`);
      }
    }

    query = query.or(orParts.join(','));
  }

  if (majors && majors.length > 0) {
    // major_required 数组 || major_elective 数组 中任一与所选 majors 有交集
    const lit = toArrayLiteral(majors);
    query = query.or(`major_required.ov.${lit},major_elective.ov.${lit}`);
  }

  if (minors && minors.length > 0) {
    query = query.overlaps('minor', minors);
  }

  if (core_types && core_types.length > 0) {
    query = query.overlaps('core_type', core_types);
  }

  if (only_general_elective) {
    query = query.eq('is_general_elective', true);
  }

  const { data, error, count } = await query
    .order('code', { ascending: true })
    .range(safeOffset, safeOffset + safeLimit - 1);

  if (error) throw error;

  const pageCourses = (data ?? []) as Course[];
  const reviewCounts = await fetchGroupReviewCounts(supabase, pageCourses);

  return {
    items: pageCourses.map((c) => ({
      ...c,
      review_count: reviewCounts.get(c.id) ?? 0
    })),
    total: count ?? 0,
    limit: safeLimit,
    offset: safeOffset
  };
}

/** 拉单个课程 + 关联教授列表。 */
export async function getCourse(id: string): Promise<CourseDetail | null> {
  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !course) return null;

  const { data: cps } = await supabase
    .from('course_professor')
    .select('professors(id, name_en, is_verified)')
    .eq('course_id', id);

  // Supabase 嵌套 select 返回 `{ professors: {...} }`，去嵌套展平
  const professors: Professor[] = (cps ?? [])
    .map((row: { professors: unknown }) => row.professors as Professor | null)
    .filter((p): p is Professor => !!p && typeof p === 'object' && 'id' in p);

  // 等同课组：锚点（equivalent_id 指向的课，或自己）+ 指向锚点的所有课，排除自己
  const anchorId = (course as Course).equivalent_id ?? id;
  const { data: groupRows } = await supabase
    .from('courses')
    .select('id, code, name_en, home_campus')
    .or(`id.eq.${anchorId},equivalent_id.eq.${anchorId}`);
  const equivalents: EquivalentCourse[] = (groupRows ?? [])
    .filter((c) => c.id !== id)
    .map((c) => ({
      id: c.id as string,
      code: c.code as string,
      name_en: c.name_en as string,
      home_campus: c.home_campus as CampusCode
    }));

  return { ...(course as Course), professors, equivalents };
}

/**
 * 添加课程：
 *   1. 检查 code 是否已存在（同校区）→ 抛 DuplicateCourseCodeError
 *   2. 插入 course
 *   3. find-or-create 每个教授（lecture + reci 合并去重），建立 course_professor 关联
 *
 * MVP 不做事务回滚；步骤 2 之后失败 = 课程已建但教授关联不全，可由后续编辑补充。
 */
export async function createCourse(
  payload: CourseApplyPayload,
  userId: string
): Promise<{ id: string }> {
  const supabase = await createClient();

  // 1. 检查同校区 + 同 code 是否已存在
  const { data: existing } = await supabase
    .from('courses')
    .select('id')
    .eq('home_campus', payload.home_campus)
    .eq('code', payload.code)
    .maybeSingle();

  if (existing) {
    throw new DuplicateCourseCodeError(existing.id);
  }

  // 2. 插入 course（schema 没设 default 所以 JS 生成 uuid）
  const courseId = crypto.randomUUID();
  const { error: insertCourseErr } = await supabase.from('courses').insert({
    id: courseId,
    code: payload.code,
    name_en: payload.name_en,
    home_campus: payload.home_campus,
    major_required: payload.major_required,
    major_elective: payload.major_elective,
    minor: payload.minor,
    core_type: payload.core_type,
    is_general_elective: payload.is_general_elective,
    created_by: userId
  });
  if (insertCourseErr) {
    // 并发下两个请求同时通过步骤 1 的查重，唯一索引兜底
    if ((insertCourseErr as { code?: string }).code === '23505') {
      const { data: raced } = await supabase
        .from('courses')
        .select('id')
        .eq('home_campus', payload.home_campus)
        .eq('code', payload.code)
        .maybeSingle();
      throw new DuplicateCourseCodeError(raced?.id ?? '');
    }
    throw insertCourseErr;
  }

  // 2.5 上海等同课关联（仅非上海课程）：
  //     填了课号 → 上海库里有这门课就直接关联；没有就自动建一门上海锚点课
  //     （复用本课的名称和分类，课号用填的），再关联。
  if (payload.home_campus !== 'SH' && payload.sh_equivalent_code) {
    const shCode = payload.sh_equivalent_code.trim();

    let anchorId: string;
    const { data: shCourse } = await supabase
      .from('courses')
      .select('id, equivalent_id')
      .eq('home_campus', 'SH')
      .eq('code', shCode)
      .maybeSingle();

    if (shCourse) {
      // 理论上上海课都是锚点；万一它自己有 equivalent_id，跟随到真正的锚点
      anchorId = (shCourse.equivalent_id as string | null) ?? shCourse.id;
    } else {
      anchorId = crypto.randomUUID();
      const { error: shErr } = await supabase.from('courses').insert({
        id: anchorId,
        code: shCode,
        name_en: payload.name_en,
        home_campus: 'SH',
        major_required: payload.major_required,
        major_elective: payload.major_elective,
        minor: payload.minor,
        core_type: payload.core_type,
        is_general_elective: payload.is_general_elective,
        created_by: userId
      });
      if (shErr) throw shErr;
    }

    const { error: linkErr } = await supabase
      .from('courses')
      .update({ equivalent_id: anchorId })
      .eq('id', courseId);
    if (linkErr) throw linkErr;
  }

  // 3. find-or-create 每个教授；lecture 和 reci 合并去重
  const allProfs = Array.from(
    new Set(
      [...payload.lecture_professors, ...payload.recitation_tas]
        .map((n) => n.trim())
        .filter(Boolean)
    )
  );

  for (const name of allProfs) {
    const profId = await findOrCreateProfessor(supabase, name);

    // 关联表，重复（uniq PK）忽略
    await supabase
      .from('course_professor')
      .upsert(
        { course_id: courseId, professor_id: profId },
        { onConflict: 'course_id,professor_id', ignoreDuplicates: true }
      );
  }

  return { id: courseId };
}
