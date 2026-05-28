-- ============================================================================
-- 20260528000001_add_course_home_campus.sql
--
-- 给课程加 home_campus 字段：标识一门课"属于"哪个校区
--   - 'SH'  = Shanghai
--   - 'NY'  = New York
--   - 'AD'  = Abu Dhabi
--   - 未来扩展到 14 个 NYU 全球 site
--
-- 用户在 Navbar 切校区时，按这个字段过滤课程列表。
--
-- 设计选择：
--   - text 而非 enum / FK 到 sites 表：值由前端常量管理，方便加新校区
--   - 默认 'SH'：兼容已有数据（NYUSH 项目所有 seed 都是 SH）
--   - 加索引：按 home_campus 过滤是首页核心操作
-- ============================================================================

alter table public.courses
  add column home_campus text not null default 'SH';

create index if not exists idx_courses_home_campus
  on public.courses(home_campus);
