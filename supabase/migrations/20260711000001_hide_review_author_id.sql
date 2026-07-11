-- ============================================================================
-- 20260711000001_hide_review_author_id.sql
-- 匿名性修复：不再向客户端暴露 reviews.user_id（作者的真实 auth UUID）。
--
-- 问题：此前评价列表 API 每条评价都带 user_id，且登录用户拿公开 anon key
-- 也能直接从 PostgREST 拉 user_id 列。user_id 永不变化，导致"重置匿名 ID"
-- 形同虚设（重置前后可被关联）。
--
-- 方案：
--   1. review_feed 视图（security definer，owner 绕过 RLS）：
--      预 join 作者 anonymous_id / 教授名 / 课程信息，
--      is_own = (user_id = auth.uid()) 服务端算好布尔值，不暴露 user_id；
--      行过滤与原 RLS 口径一致（visible 或本人）。
--      顺带把原来 N 次 get_anonymous_id RPC 合并成一次 join（性能）。
--   2. reviews 表列级收权：authenticated 的 SELECT 不含 user_id。
--      （INSERT / UPDATE 权限不变，RLS 的 owner 校验在策略里跑，不受影响）
--
-- ⚠️ 部署顺序：本迁移会让旧版应用代码（select('*') / eq('user_id')）失效，
--    push 后需尽快部署配套代码。
-- ============================================================================

create view public.review_feed as
select
  r.id,
  r.course_id,
  r.professor_id,
  p.name_en as professor_name_en,
  r.semester,
  r.site,
  r.content_zh,
  r.content_en,
  r.is_visible,
  r.created_at,
  u.anonymous_id as author_anonymous_id,
  (r.user_id is not null and r.user_id = auth.uid()) as is_own,
  c.code as course_code,
  c.name_en as course_name_en
from public.reviews r
left join public.users u on u.id = r.user_id
left join public.professors p on p.id = r.professor_id
left join public.courses c on c.id = r.course_id
where r.is_visible or r.user_id = auth.uid();

-- 默认权限可能给 anon 留了口子（course_search 的前车之鉴），显式收干净
revoke all on public.review_feed from anon, public;
grant select on public.review_feed to authenticated;

-- reviews 表：SELECT 收成白名单列（无 user_id）
revoke select on public.reviews from anon, public, authenticated;
grant select (
  id,
  course_id,
  professor_id,
  semester,
  site,
  content_zh,
  content_en,
  is_visible,
  created_at
) on public.reviews to authenticated;
