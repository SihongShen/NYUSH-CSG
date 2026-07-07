-- ============================================================================
-- 20260707000001_fix_constraints_and_trigger.sql
-- 修三个数据层 bug：
--   1. reviews 缺"同用户 + 同课 + 同教授 + 同学期只能评一次"的唯一约束
--      （API 层一直在按 23505 处理，但约束从未建过）
--   2. courses 缺 (home_campus, code) 唯一约束，应用层查重有并发竞态
--   3. anonymous_id 随机 8 位碰撞时注册直接失败，加重试
-- ============================================================================

-- 1. 防重复评价（user_id 为 null 的历史行不受影响：NULL 彼此视为不同）
create unique index if not exists uniq_reviews_user_course_prof_semester
  on public.reviews (user_id, course_id, professor_id, semester);

-- 2. 同校区课程编号唯一，兜底应用层先查后插的竞态
create unique index if not exists uniq_courses_campus_code
  on public.courses (home_campus, code);

-- 3. anonymous_id 碰撞重试（撞 unique 约束时重新生成，最多 5 次）
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  attempts int := 0;
begin
  loop
    begin
      insert into public.users (id, email, anonymous_id)
      values (
        new.id,
        new.email,
        substr(md5(random()::text || new.id::text || clock_timestamp()::text), 1, 8)
      );
      return new;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts >= 5 then
        raise;
      end if;
    end;
  end loop;
end;
$$;
