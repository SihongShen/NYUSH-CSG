-- ============================================================================
-- 20260707000005_created_by_and_equivalent_guard.sql
--   1. courses.created_by：记录建课人，速率限制（每人每小时限额）用
--   2. equivalent_id 防呆触发器：等同课映射必须是"星型"——
--      海外课指向上海锚点课，禁止自指 / 链式 / 把现有锚点改挂到别人下面
-- ============================================================================

-- 1. 建课人（历史数据为 null；用户注销时置 null，课程保留）
alter table public.courses
  add column if not exists created_by uuid references public.users(id) on delete set null;

create index if not exists idx_courses_created_by
  on public.courses (created_by);

-- 2. equivalent_id 星型约束
create or replace function public.check_course_equivalent()
returns trigger
language plpgsql
as $$
begin
  if new.equivalent_id is null then
    return new;
  end if;
  if new.equivalent_id = new.id then
    raise exception 'equivalent_id cannot reference itself';
  end if;
  -- 只能指向锚点（本身没有 equivalent_id 的课），禁止链式
  if exists (
    select 1 from public.courses c
    where c.id = new.equivalent_id and c.equivalent_id is not null
  ) then
    raise exception 'equivalent_id must point to an anchor course';
  end if;
  -- 自己已是别人的锚点时，不能再挂到其他课下面（会把组变成链）
  if exists (
    select 1 from public.courses c where c.equivalent_id = new.id
  ) then
    raise exception 'course is an anchor for other courses; unlink them first';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_course_equivalent on public.courses;
create trigger trg_check_course_equivalent
  before insert or update of equivalent_id on public.courses
  for each row
  execute function public.check_course_equivalent();
