import { createClient } from './supabase';
import type { CampusCode, CoreType, Course, Paginated } from '@/types';

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
