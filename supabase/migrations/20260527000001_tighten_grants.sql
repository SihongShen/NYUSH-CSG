-- ============================================================================
-- 20260527000001_tighten_grants.sql
--
-- 收紧角色权限
-- 1. handle_new_auth_user 是 trigger 内部钩子，绝不给任何外部 RPC 调
-- 2. anon（未登录）不应该看到 public schema 任何东西（站点要求登录）
-- 3. authenticated 不变（仍能读 public 表，受 RLS 控制行级访问）
-- ============================================================================

-- 1. trigger 内部函数不暴露
revoke execute on function public.handle_new_auth_user() from anon, authenticated, public;

-- 2. anon 不能 SELECT 任何 public 表
revoke select on all tables in schema public from anon;

-- 3. anon 不能调 get_anonymous_id（未登录用户不需要看评价作者）
revoke execute on function public.get_anonymous_id(uuid) from anon;
