-- ============================================================================
-- 20260521000001_enable_rls.sql
-- 启用所有表的 RLS + 写访问策略 + 补 auth → users 同步触发器
--
-- MVP 阶段没有 admin 角色，所有"改/删"操作都不开 RLS 策略；
-- 维护者如需操作请用 service_role 客户端（绕过 RLS）。
-- ============================================================================

-- ============================================================================
-- USERS: 只能看自己；所有写操作禁用（由下面的 trigger 自动同步）
-- ============================================================================

alter table public.users enable row level security;

create policy "users_select_self" on public.users
  for select to authenticated
  using (auth.uid() = id);

-- 不开 INSERT / UPDATE / DELETE 策略 → 默认全拒绝
-- 应用代码无法直接写 users 表；只能通过下面的 trigger 自动写入

-- ----------------------------------------------------------------------------
-- Trigger：注册时自动把 auth.users 同步到 public.users，生成 anonymous_id
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, anonymous_id)
  values (
    new.id,
    new.email,
    substr(md5(random()::text || new.id::text || clock_timestamp()::text), 1, 8)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- 安全函数：通过 user_id 反查 anonymous_id，用于 reviews 列表显示作者
-- SECURITY DEFINER 让函数以 owner 身份运行，绕过 users 的 RLS
-- 只返回 anonymous_id 一个字段，不会泄露邮箱
-- ----------------------------------------------------------------------------

create or replace function public.get_anonymous_id(p_user_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select anonymous_id from public.users where id = p_user_id
$$;

grant execute on function public.get_anonymous_id(uuid) to authenticated;

-- ============================================================================
-- COURSES: 所有登录用户可读 + 可建；MVP 不开放 UPDATE / DELETE
-- ============================================================================

alter table public.courses enable row level security;

create policy "courses_select_all" on public.courses
  for select to authenticated
  using (true);

create policy "courses_insert_authenticated" on public.courses
  for insert to authenticated
  with check (true);

-- ============================================================================
-- PROFESSORS: 所有登录用户可读 + 可建；MVP 不开放 UPDATE / DELETE
-- ============================================================================

alter table public.professors enable row level security;

create policy "professors_select_all" on public.professors
  for select to authenticated
  using (true);

create policy "professors_insert_authenticated" on public.professors
  for insert to authenticated
  with check (true);

-- ============================================================================
-- COURSE_PROFESSOR: 所有登录用户可读 + 可建；MVP 不开放 DELETE
-- ============================================================================

alter table public.course_professor enable row level security;

create policy "course_professor_select_all" on public.course_professor
  for select to authenticated
  using (true);

create policy "course_professor_insert_authenticated" on public.course_professor
  for insert to authenticated
  with check (true);

-- ============================================================================
-- REVIEWS: 看 visible 的或本人所有；只能写自己的；只能改自己的；不允许真删（用软删）
-- ============================================================================

alter table public.reviews enable row level security;

create policy "reviews_select_visible_or_own" on public.reviews
  for select to authenticated
  using (is_visible = true or auth.uid() = user_id);

create policy "reviews_insert_self" on public.reviews
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "reviews_update_self" on public.reviews
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 不开 DELETE 策略 → 真删被数据库拒绝；软删除走 UPDATE is_visible=false

-- ============================================================================
-- SITES: 所有登录用户可读；MVP 不开放写
-- ============================================================================

alter table public.sites enable row level security;

create policy "sites_select_all" on public.sites
  for select to authenticated
  using (true);
