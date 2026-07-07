-- ============================================================================
-- 20260707000004_review_votes.sql
-- 评价点赞 / 点踩。每人对每条评价最多一票（+1 / -1），改票走 upsert，撤票 delete。
-- ============================================================================

create table public.review_votes (
  review_id  uuid not null references public.reviews(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  vote       smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

alter table public.review_votes enable row level security;

-- 所有登录用户可读（用于聚合计数 + 显示自己的投票状态）
create policy "review_votes_select_all" on public.review_votes
  for select to authenticated
  using (true);

-- 只能以自己的身份投票 / 改票 / 撤票
create policy "review_votes_insert_self" on public.review_votes
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "review_votes_update_self" on public.review_votes
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "review_votes_delete_self" on public.review_votes
  for delete to authenticated
  using (auth.uid() = user_id);
