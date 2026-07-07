import { createClient } from './supabase';
import type {
  CampusCode,
  CoreType,
  Course,
  CourseApplyPayload,
  CourseDetail,
  Paginated,
  Professor
} from '@/types';

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
export async function getCourses(
  params: GetCoursesParams = {}
): Promise<Paginated<Course>> {
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
    query = query.or(`code.ilike.%${escaped}%,name_en.ilike.%${escaped}%`);
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

  return {
    items: (data ?? []) as Course[],
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

  return { ...(course as Course), professors };
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
  payload: CourseApplyPayload
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
    is_general_elective: payload.is_general_elective
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

  // 3. find-or-create 每个教授；lecture 和 reci 合并去重
  const allProfs = Array.from(
    new Set(
      [...payload.lecture_professors, ...payload.recitation_tas]
        .map((n) => n.trim())
        .filter(Boolean)
    )
  );

  for (const name of allProfs) {
    let profId: string;

    const { data: existingProf } = await supabase
      .from('professors')
      .select('id')
      .eq('name_en', name)
      .maybeSingle();

    if (existingProf) {
      profId = existingProf.id;
    } else {
      profId = crypto.randomUUID();
      const { error: profErr } = await supabase
        .from('professors')
        .insert({ id: profId, name_en: name });
      if (profErr) throw profErr;
    }

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
