-- ============================================================================
-- 20260525000001_user_delete_behavior.sql
--
-- 用户注销账号时的级联行为：
--   - public.users 跟 auth.users 同生死（ON DELETE CASCADE）
--   - reviews 保留，但 user_id 置 NULL（ON DELETE SET NULL）
--     前端应显示 "[已注销用户]" 而不是 anonymous_id
-- ============================================================================

-- 1. public.users 跟 auth.users 级联删除
alter table public.users
  drop constraint if exists users_id_fkey;

alter table public.users
  add constraint users_id_fkey
    foreign key (id) references auth.users(id)
    on delete cascade;

-- 2. reviews 保留，user_id 置 NULL
-- user_id 列本身已经是 nullable（001 schema 里没加 NOT NULL）
alter table public.reviews
  drop constraint if exists reviews_user_id_fkey;

alter table public.reviews
  add constraint reviews_user_id_fkey
    foreign key (user_id) references public.users(id)
    on delete set null;
