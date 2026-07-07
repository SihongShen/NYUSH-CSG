import { describe, expect, it } from 'vitest';
import { ALLOWED_DOMAIN, isAllowedEmail } from './validate';

describe('isAllowedEmail', () => {
  it('标准 NYU 邮箱通过', () => {
    expect(isAllowedEmail('abc1234@nyu.edu')).toBe(true);
  });

  it('大小写不敏感', () => {
    expect(isAllowedEmail('ABC1234@NYU.EDU')).toBe(true);
  });

  it('普通 gmail 拒绝', () => {
    expect(isAllowedEmail('someone@gmail.com')).toBe(false);
  });

  it('伪装域名拒绝：@xnyu.edu（不是 @nyu.edu）', () => {
    expect(isAllowedEmail('a@xnyu.edu')).toBe(false);
  });

  it('子域名拒绝：@mail.nyu.edu（以 .nyu.edu 结尾但不是 @nyu.edu）', () => {
    expect(isAllowedEmail('a@mail.nyu.edu')).toBe(false);
  });

  it('空字符串拒绝', () => {
    expect(isAllowedEmail('')).toBe(false);
  });

  it('域名常量没被误改', () => {
    expect(ALLOWED_DOMAIN).toBe('nyu.edu');
  });
});
