import { describe, expect, it } from 'vitest';
import { SITES, isValidSite, siteName } from './sites';
import {
  SEASONS,
  formatSemester,
  isValidSemester,
  parseSemester
} from './semesters';

describe('sites', () => {
  it('共 16 个 site，含三个学位校区', () => {
    expect(SITES).toHaveLength(16);
    for (const code of ['SH', 'NY', 'AD']) {
      expect(SITES.some((s) => s.code === code)).toBe(true);
    }
  });

  it('isValidSite 接受合法 code（含新增 LA / TUL）', () => {
    expect(isValidSite('SH')).toBe(true);
    expect(isValidSite('FLO')).toBe(true);
    expect(isValidSite('LA')).toBe(true);
    expect(isValidSite('TUL')).toBe(true);
  });

  it('isValidSite 拒绝非法值', () => {
    expect(isValidSite('XX')).toBe(false);
    expect(isValidSite('sh')).toBe(false); // 大小写敏感，前端只会传枚举值
    expect(isValidSite('')).toBe(false);
  });

  it('siteName 映射展示名，未知 code 原样兜底', () => {
    expect(siteName('SH')).toBe('Shanghai');
    expect(siteName('FLO')).toBe('Florence');
    expect(siteName('XX')).toBe('XX');
  });
});

describe('semesters', () => {
  it('formatSemester 拼接格式正确', () => {
    expect(formatSemester(2026, 'Fall')).toBe('2026 Fall');
  });

  it('isValidSemester 接受四个季节', () => {
    for (const s of SEASONS) {
      expect(isValidSemester(`2025 ${s}`)).toBe(true);
    }
  });

  it('isValidSemester 拒绝坏输入', () => {
    expect(isValidSemester('2025 Winter')).toBe(false);
    expect(isValidSemester('Fall 2025')).toBe(false);
    expect(isValidSemester('2025')).toBe(false);
    expect(isValidSemester('')).toBe(false);
  });

  it('parseSemester 往返一致', () => {
    expect(parseSemester('2024 Spring')).toEqual({
      year: 2024,
      season: 'Spring'
    });
  });
});
