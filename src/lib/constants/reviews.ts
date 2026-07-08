/**
 * 评价内容长度规则（前端表单和 API 层共用同一套校验）。
 * 口径：中文 + 英文内容合计（trim 后），至少一栏非空由单独规则管。
 */
export const MIN_REVIEW_LENGTH = 30;
export const MAX_REVIEW_LENGTH = 5000;

export type ReviewLengthError = 'tooShort' | 'tooLong' | null;

/** 返回长度问题（不管"至少一栏非空"，那是另一条规则） */
export function reviewContentLengthError(
  contentZh: string,
  contentEn: string
): ReviewLengthError {
  const zh = contentZh.trim();
  const en = contentEn.trim();
  if (zh.length > MAX_REVIEW_LENGTH || en.length > MAX_REVIEW_LENGTH) {
    return 'tooLong';
  }
  const combined = zh.length + en.length;
  if (combined > 0 && combined < MIN_REVIEW_LENGTH) {
    return 'tooShort';
  }
  return null;
}
