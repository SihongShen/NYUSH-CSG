-- ============================================================================
-- 20260707000002_nyu_only_signup_hook.sql
-- Google OAuth 接入配套：before_user_created auth hook
--
-- 前端传给 Google 的 hd=nyu.edu 只是提示、可被绕过；这里在用户创建前由
-- Auth 服务端强制校验邮箱域名，非 @nyu.edu 直接拒绝（带友好错误信息）。
-- users 表的 check (email like '%@nyu.edu') 约束仍作为最后兜底。
--
-- 需要在 config.toml（本地）/ Dashboard → Auth → Hooks（云端）启用：
--   uri = "pg-functions://postgres/public/hook_before_user_created"
-- ============================================================================

create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  email text := lower(coalesce(event->'user'->>'email', ''));
begin
  if email like '%@nyu.edu' then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Only @nyu.edu accounts are allowed'
    )
  );
end;
$$;

-- Auth 服务以 supabase_auth_admin 身份调用 hook；其他角色一律不可执行
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;
