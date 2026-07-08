/**
 * 评价内容校验规则（前端表单和 API 层共用同一套）。
 * 口径：中文 + 英文内容合计（trim 后）字符数。只设上限，不设下限。
 */
export const MAX_REVIEW_LENGTH = 5000;

export type ReviewContentError = 'empty' | 'tooLong' | null;

/**
 * 完整的内容校验：空 / 太长 / 合法。
 * 一个函数管全部规则，调用方不必再各自内联「至少一栏非空」。
 */
export function reviewContentError(
  contentZh: string,
  contentEn: string
): ReviewContentError {
  const zh = contentZh.trim();
  const en = contentEn.trim();
  if (zh.length > MAX_REVIEW_LENGTH || en.length > MAX_REVIEW_LENGTH) {
    return 'tooLong';
  }
  if (zh.length + en.length === 0) return 'empty';
  return null;
}

/**
 * API 层返回给 fields.content 的中文文案（与其它 fields 校验消息保持中文一致）。
 * 前端优先走 i18n；这个只在客户端校验被绕过时兜底。null 表示无错误。
 */
export function reviewContentMessage(err: ReviewContentError): string | null {
  switch (err) {
    case 'empty':
      return '中文和英文评价至少填一个';
    case 'tooLong':
      return `单栏内容不能超过 ${MAX_REVIEW_LENGTH} 个字符`;
    default:
      return null;
  }
}
