import { describe, expect, it } from 'vitest';
import { formatProfessorName } from './format';

describe('formatProfessorName', () => {
  it('普通两段名：每个词首字母大写', () => {
    expect(formatProfessorName('john smith')).toBe('John Smith');
  });

  it('单词名', () => {
    expect(formatProfessorName('plato')).toBe('Plato');
  });

  it("撇号后大写：o'brien → O'Brien", () => {
    expect(formatProfessorName("o'brien")).toBe("O'Brien");
  });

  it('连字符后大写：al-sayed → Al-Sayed', () => {
    expect(formatProfessorName('al-sayed')).toBe('Al-Sayed');
  });

  it('多段名 + 中间名缩写', () => {
    expect(formatProfessorName('mary jane k watson')).toBe(
      'Mary Jane K Watson'
    );
  });

  it('已经大写的字符保持不变（幂等）', () => {
    expect(formatProfessorName('John Smith')).toBe('John Smith');
  });

  it('空字符串不炸', () => {
    expect(formatProfessorName('')).toBe('');
  });
});
