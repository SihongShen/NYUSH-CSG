import type { CampusCode } from '@/types';

/**
 * NYUSH 19 个 major（不区分 campus，是全局列表）。
 * 切换 campus 只换 COURSE 显示范围，Major 筛选板块始终显示这 19 个。
 *
 * NY / AD 的 majors 暂未录入；课程的 major 数组留空 '{}'，
 * 用户切到那些校区时勾选 Major 也筛不出东西，这是预期的。
 */
export const MAJORS: string[] = [
  'Biology',
  'Business and Finance',
  'Business and Marketing',
  'Chemistry',
  'Computer Science',
  'Computer Systems Engineering',
  'Data Science',
  'Economics',
  'Electrical and Systems Engineering',
  'Global China Studies',
  'Honors Mathematics',
  'Humanities',
  'Interactive Media Arts',
  'Interactive Media and Business',
  'Mathematics',
  'Neural Science',
  'Physics',
  'Self Designed Honors',
  'Social Science'
];

/** Minor-only programs（不能作为 major 的方向）。 */
export const MINORS: string[] = [
  'Creative Writing',
  'Creativity + Innovation',
  'Genomics and Bioinformatics',
  'History',
  'Literature',
  'Molecular and Cell Biology'
];

/** Core 课程的子分类。 */
export const CORE_TYPES = [
  'GPS',
  'PoH',
  'WAI',
  'IPC',
  'Chinese',
  'EAP',
  'Maths',
  'ED',
  'STS',
  'AT'
] as const;

export type CoreType = (typeof CORE_TYPES)[number];

// 校验辅助函数 —— API 层和 form 用，DB 层不加 CHECK 约束（保留灵活性）
export function isValidMajor(v: string): boolean {
  return MAJORS.includes(v);
}

export function isValidMinor(v: string): boolean {
  return MINORS.includes(v);
}

export function isValidCoreType(v: string): v is CoreType {
  return (CORE_TYPES as readonly string[]).includes(v);
}

/**
 * 当前 MVP 阶段 majors 跟 campus 无关，但保留这个函数接口，
 * 未来 NY/AD 加自己的 majors 时可以用这个区分。
 */
export function majorsForCampus(_campus: CampusCode): string[] {
  return MAJORS;
}
