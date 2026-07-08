import { describe, expect, it } from 'vitest';
import {
  MAX_REVIEW_LENGTH,
  MIN_REVIEW_LENGTH,
  reviewContentLengthError
} from './reviews';

describe('reviewContentLengthError', () => {
  it('合计达到下限即通过（中英合计）', () => {
    const half = 'x'.repeat(Math.ceil(MIN_REVIEW_LENGTH / 2));
    expect(reviewContentLengthError(half, half)).toBeNull();
  });

  it('单栏达标也通过', () => {
    expect(
      reviewContentLengthError('好'.repeat(MIN_REVIEW_LENGTH), '')
    ).toBeNull();
  });

  it('合计不足下限报 tooShort', () => {
    expect(reviewContentLengthError('太水了', '')).toBe('tooShort');
  });

  it('全空不报长度错误（由"至少一栏非空"规则负责）', () => {
    expect(reviewContentLengthError('', '   ')).toBeNull();
  });

  it('trim 后计算长度（纯空格不算数）', () => {
    expect(reviewContentLengthError('  短  ', '')).toBe('tooShort');
  });

  it('单栏超上限报 tooLong', () => {
    expect(
      reviewContentLengthError('x'.repeat(MAX_REVIEW_LENGTH + 1), '')
    ).toBe('tooLong');
  });

  it('上限优先于下限判断', () => {
    expect(
      reviewContentLengthError('x'.repeat(MAX_REVIEW_LENGTH + 1), 'y')
    ).toBe('tooLong');
  });
});
