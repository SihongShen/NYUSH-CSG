-- ============================================================================
-- 20260710000003_course_description.sql
-- 课程官方简介（来自 NYU 课表目录），详情页展示。
-- 与 topics 同一模式：课表导入脚本（service_role）维护，
-- 不加入 authenticated 的列级 UPDATE 授权，用户不可编辑。
-- ============================================================================

alter table public.courses
  add column if not exists description text;
