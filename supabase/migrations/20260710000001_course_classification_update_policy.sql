-- ============================================================================
-- 20260710000001_course_classification_update_policy.sql
-- 开放课程"分类信息"的社区编辑，并顺带修一个既有 bug：
--
--   1. courses 此前没有任何 UPDATE 策略（enable_rls 里 MVP 全禁），导致
--      createCourse 里关联上海等同课的 update({ equivalent_id }) 静默命中
--      0 行 —— 非上海课程填了 sh_equivalent_code 也从未真正关联上。
--   2. 新需求：登录用户可编辑课程的分类（major/minor/core/GE），
--      与"登录用户可建课"是同一信任级别。
--
-- 权限模型：行级放开 UPDATE + 列级收紧 —— authenticated 只能更新
-- 分类五列 + equivalent_id，课号/课名/created_by 等仍然只读
-- （PostgREST 会对未授权列的更新直接报错，防止绕过 API 改课名）。
-- ============================================================================

create policy "courses_update_authenticated" on public.courses
  for update to authenticated
  using (true)
  with check (true);

revoke update on public.courses from authenticated;
grant update (
  major_required,
  major_elective,
  minor,
  core_type,
  is_general_elective,
  equivalent_id
) on public.courses to authenticated;
