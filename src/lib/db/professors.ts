import { createClient } from './supabase';

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * find-or-create 教授。
 *
 * 名字统一 lower(trim()) 存储（展示时前端做首字母大写），避免
 * "John Smith" / "john smith" 产生重复教授；professors.name_en 有唯一索引，
 * 并发同名插入撞 23505 时回退重查。
 */
export async function findOrCreateProfessor(
  supabase: Supabase,
  rawName: string
): Promise<string> {
  const name = rawName.trim().toLowerCase();

  const { data: existing } = await supabase
    .from('professors')
    .select('id')
    .eq('name_en', name)
    .maybeSingle();
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  const { error } = await supabase
    .from('professors')
    .insert({ id, name_en: name });
  if (!error) return id;

  if ((error as { code?: string }).code === '23505') {
    const { data: raced } = await supabase
      .from('professors')
      .select('id')
      .eq('name_en', name)
      .maybeSingle();
    if (raced) return raced.id;
  }
  throw error;
}
