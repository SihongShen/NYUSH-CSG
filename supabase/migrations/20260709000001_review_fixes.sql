-- ============================================================================
-- 20260709000001_review_fixes.sql
-- 代码审查修复三则：
--   1. course_search 视图对 anon 收权（默认权限会自动授予新对象，绕过了
--      20260527000001 的 anon 收权约定）
--   2. 补 reviews(course_id) / courses(equivalent_id) 索引——course_search
--      视图和等同组查询之前全表 seq scan
--   3. reset_anonymous_id 零行更新时抛错，避免给已删用户返回伪造 ID
-- ============================================================================

-- 1. 视图对 anon / public 收权，只留 authenticated（与 reset_anonymous_id 一致）
revoke all on public.course_search from anon, public;
grant select on public.course_search to authenticated;

-- 2. 热路径索引
create index if not exists idx_reviews_course_id
  on public.reviews (course_id);
create index if not exists idx_courses_equivalent_id
  on public.courses (equivalent_id);

-- 3. 重置匿名 ID：UPDATE 未命中行（用户已删）时抛错，不返回未落库的 ID
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
      if not found then
        raise exception 'user_not_found';
      end if;
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
