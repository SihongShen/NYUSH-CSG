import { describe, expect, it } from 'vitest';
import {
  MAX_REVIEW_LENGTH,
  reviewContentError,
  reviewContentMessage
} from './reviews';

describe('reviewContentError', () => {
  it('两栏皆空 → empty', () => {
    expect(reviewContentError('', '   ')).toBe('empty');
  });

  it('短内容也通过（无下限）', () => {
    expect(reviewContentError('好', '')).toBeNull();
  });

  it('正常内容 → 通过', () => {
    expect(reviewContentError('老师讲得很清楚', '')).toBeNull();
  });

  it('单栏超上限 → tooLong', () => {
    expect(reviewContentError('x'.repeat(MAX_REVIEW_LENGTH + 1), '')).toBe(
      'tooLong'
    );
  });

  it('上限按单栏算，不是合计', () => {
    const almost = 'x'.repeat(MAX_REVIEW_LENGTH);
    expect(reviewContentError(almost, almost)).toBeNull();
  });
});

describe('reviewContentMessage', () => {
  it('每种错误码都有文案，null 无文案', () => {
    expect(reviewContentMessage('empty')).toContain('至少填一个');
    expect(reviewContentMessage('tooLong')).toContain(String(MAX_REVIEW_LENGTH));
    expect(reviewContentMessage(null)).toBeNull();
  });
});
