-- ============================================================================
-- 20260708000001_course_search_view_and_reset_anon.sql
--   1. course_search 视图：courses + 等同课组合并的 review_count，
--      让课程列表能按评价数排序分页（之前 count 在应用层聚合，没法排序）
--   2. reset_anonymous_id()：用户自助重置匿名 ID（users 表写操作被 RLS
--      全禁，只能走 security definer 函数）
-- ============================================================================

-- 1. 课程搜索视图（security_invoker：reviews 的 RLS 以调用者身份生效，
--    计数口径与评价列表一致 = 可见的 + 自己软删的）
create or replace view public.course_search
with (security_invoker = on) as
select
  c.*,
  coalesce(g.total, 0)::int as review_count
from public.courses c
left join (
  select
    coalesce(c2.equivalent_id, c2.id) as anchor,
    count(r.id)::int as total
  from public.courses c2
  join public.reviews r on r.course_id = c2.id
  group by coalesce(c2.equivalent_id, c2.id)
) g on g.anchor = coalesce(c.equivalent_id, c.id);

grant select on public.course_search to authenticated;

-- 2. 自助重置匿名 ID（撞唯一索引重试，最多 5 次；返回新 ID）
create or replace function public.reset_anonymous_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  attempts int := 0;
  new_id text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  loop
    begin
      new_id := substr(
        md5(random()::text || auth.uid()::text || clock_timestamp()::text),
        1, 8
      );
      update public.users set anonymous_id = new_id where id = auth.uid();
      return new_id;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts >= 5 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

grant execute on function public.reset_anonymous_id() to authenticated;
revoke execute on function public.reset_anonymous_id() from anon, public;
