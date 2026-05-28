-- ============================================================================
-- 20260528000002_redesign_course_classification.sql
--
-- 课程分类字段重设计：
--
-- 删 category / department / core_type(text) —— 老的"高层 + 部门"模型太粗
--
-- 加 5 个新字段反映 NYUSH Albert 系统真实的 Fulfillment 模型：
--   major_required       text[]   主修必修课的 major 列表
--   major_elective       text[]   主修选修课的 major 列表
--   minor                text[]   minor 项目列表
--   core_type            text[]   核心课程子类（GPS / PoH / WAI 等，10 个）
--   is_general_elective  boolean  通识选修标记（如 Music / Art 课）
--
-- 一门课可同时归属多个 major（既 CS 必修又 DS 必修）+ 多个 core_type。
-- 筛选逻辑：同维度内 OR，跨维度 AND；Major 筛选时 required ∪ elective 一起匹配。
-- ============================================================================

alter table public.courses
  drop column if exists category,
  drop column if exists department,
  drop column if exists core_type;

alter table public.courses
  add column major_required      text[]  not null default '{}'::text[],
  add column major_elective      text[]  not null default '{}'::text[],
  add column minor               text[]  not null default '{}'::text[],
  add column core_type           text[]  not null default '{}'::text[],
  add column is_general_elective boolean not null default false;

-- GIN 索引：数组成员匹配（overlaps / contains）的常规优化
create index if not exists idx_courses_major_required on public.courses using gin (major_required);
create index if not exists idx_courses_major_elective on public.courses using gin (major_elective);
create index if not exists idx_courses_minor          on public.courses using gin (minor);
create index if not exists idx_courses_core_type      on public.courses using gin (core_type);

-- 普通 btree 索引：单值 filter
create index if not exists idx_courses_is_ge on public.courses (is_general_elective);
