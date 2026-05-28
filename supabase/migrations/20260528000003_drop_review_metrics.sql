-- ============================================================================
-- 20260528000003_drop_review_metrics.sql
--
-- MVP 简化：评价不做量化指标，只剩文字内容 + 评论数统计。
-- 删除 rating / difficulty / workload 三列（CHECK 约束自动随列消失）。
--
-- 这些字段未来可能加回来（"暂时"不做），到时候新写一个 migration ADD COLUMN。
-- ============================================================================

alter table public.reviews
  drop column if exists rating,
  drop column if exists difficulty,
  drop column if exists workload;
