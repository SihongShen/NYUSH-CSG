/**
 * NYU 全球 14 个 site。评价表单里的"校区"用这个列表。
 * 跟 CampusCode 不同：CampusCode 只覆盖 3 个学位校区，site 包括所有 study-away 地点。
 */
export const SITES = [
  { code: 'SH',  name: 'Shanghai' },
  { code: 'NY',  name: 'New York' },
  { code: 'AD',  name: 'Abu Dhabi' },
  { code: 'BUE', name: 'Buenos Aires' },
  { code: 'BER', name: 'Berlin' },
  { code: 'FLO', name: 'Florence' },
  { code: 'LON', name: 'London' },
  { code: 'MAD', name: 'Madrid' },
  { code: 'PAR', name: 'Paris' },
  { code: 'PRG', name: 'Prague' },
  { code: 'SYD', name: 'Sydney' },
  { code: 'TEL', name: 'Tel Aviv' },
  { code: 'WAS', name: 'Washington DC' },
  { code: 'ACC', name: 'Accra' }
] as const;

export type SiteCode = (typeof SITES)[number]['code'];

const SITE_CODES = SITES.map((s) => s.code);

export function isValidSite(v: string): v is SiteCode {
  return (SITE_CODES as readonly string[]).includes(v);
}
