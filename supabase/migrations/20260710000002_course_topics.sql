-- ============================================================================
-- 20260710000002_course_topics.sql
-- 专题课（同一课号每学期开不同 topic 的 section，如 Topics in IMA、EAP、
-- WRIT-SHU 201）：加 topics 列保存历届专题清单，详情页展示。
--
-- 数据来源是课表导入脚本（service_role 维护）；不加入 authenticated 的
-- 列级 UPDATE 授权 —— 用户编辑入口只有分类五列，topics 对用户只读。
-- ============================================================================

alter table public.courses
  add column if not exists topics text[] not null default '{}';
