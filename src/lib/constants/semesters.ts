/**
 * 学期 = 年份 + 季节，不再维护硬编码列表。
 * 提交时拼成 "YYYY Season" 字符串存 DB（保持 schema 不变）。
 */

export const SEASONS = ['January', 'Spring', 'Summer', 'Fall'] as const;
export type Season = (typeof SEASONS)[number];

/** 可选年份：今年附近 ±5（按需扩） */
const _CURRENT_YEAR = new Date().getFullYear();
export const SELECTABLE_YEARS: number[] = [
  _CURRENT_YEAR + 1,
  _CURRENT_YEAR,
  _CURRENT_YEAR - 1,
  _CURRENT_YEAR - 2,
  _CURRENT_YEAR - 3,
  _CURRENT_YEAR - 4
];

export function formatSemester(year: number, season: Season): string {
  return `${year} ${season}`;
}

export function parseSemester(
  s: string
): { year: number; season: Season } | null {
  const parts = s.split(' ');
  if (parts.length !== 2) return null;
  const year = parseInt(parts[0], 10);
  if (!Number.isFinite(year)) return null;
  const season = parts[1] as Season;
  if (!(SEASONS as readonly string[]).includes(season)) return null;
  return { year, season };
}

export function isValidSemester(s: string): boolean {
  return parseSemester(s) !== null;
}
