/**
 * 教授名展示格式化。
 *
 * 数据库里教授名统一小写存储（防大小写重复），展示时每个词首字母大写：
 *   "john smith" → "John Smith"，"o'brien" → "O'Brien"，"al-sayed" → "Al-Sayed"
 */
export function formatProfessorName(name: string): string {
  return name.replace(/(^|[\s\-'])(\p{L})/gu, (_m, sep: string, ch: string) =>
    sep + ch.toUpperCase()
  );
}
