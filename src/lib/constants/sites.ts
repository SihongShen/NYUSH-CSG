/**
 * NYU 全球 16 个 site：3 个学位校区在前，13 个 study-away 按名称字母序。
 * 全局校区切换（Navbar）、课程归属（home_campus）、评价 site 共用这个列表，
 * 与 types/index.ts 的 CampusCode 保持同步。
 */
export const SITES = [
  { code: 'SH',  name: 'Shanghai' },
  { code: 'NY',  name: 'New York' },
  { code: 'AD',  name: 'Abu Dhabi' },
  { code: 'ACC', name: 'Accra' },
  { code: 'BER', name: 'Berlin' },
  { code: 'BUE', name: 'Buenos Aires' },
  { code: 'FLO', name: 'Florence' },
  { code: 'LON', name: 'London' },
  { code: 'LA',  name: 'Los Angeles' },
  { code: 'MAD', name: 'Madrid' },
  { code: 'PAR', name: 'Paris' },
  { code: 'PRG', name: 'Prague' },
  { code: 'SYD', name: 'Sydney' },
  { code: 'TEL', name: 'Tel Aviv' },
  { code: 'TUL', name: 'Tulsa' },
  { code: 'WAS', name: 'Washington DC' }
] as const;

export type SiteCode = (typeof SITES)[number]['code'];

const SITE_CODES = SITES.map((s) => s.code);

export function isValidSite(v: string): v is SiteCode {
  return (SITE_CODES as readonly string[]).includes(v);
}

/** code → 展示名（"FLO" → "Florence"）；未知 code 原样返回兜底 */
export function siteName(code: string): string {
  return SITES.find((s) => s.code === code)?.name ?? code;
}
