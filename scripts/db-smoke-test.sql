-- ============================================================================
-- 本地数据库冒烟测试：验证迁移 20260707000001~000005 的关键行为。
--
-- 运行（需要 supabase start 且已 supabase migration up）：
--   npm run test:db
-- 或手动：
--   docker exec -i supabase_db_NYUSH-CSG psql -U postgres -v ON_ERROR_STOP=1 -f - < scripts/db-smoke-test.sql
--
-- 所有断言在一个事务里跑完并 ROLLBACK，不会在库里留下任何数据。
-- 任何 FAIL 都会以异常终止（退出码非 0）；全过输出一串 PASS。
-- 注意：以 postgres 超级用户运行，RLS 不在本脚本覆盖范围内。
-- ============================================================================

begin;

do $$
declare
  u1 uuid := '00000000-0000-4000-8000-000000000001';
  u2 uuid := '00000000-0000-4000-8000-000000000002';
  c_sh uuid := '00000000-0000-4000-8000-0000000000c1';
  c_ny uuid := '00000000-0000-4000-8000-0000000000c2';
  c_ad uuid := '00000000-0000-4000-8000-0000000000c3';
  p1 uuid := '00000000-0000-4000-8000-0000000000d1';
  rv uuid := '00000000-0000-4000-8000-0000000000e1';
  hook_result jsonb;
begin
  -- ── fixtures ──────────────────────────────────────────────────────────
  insert into auth.users (id, email) values
    (u1, 'smoke1@nyu.edu'),
    (u2, 'smoke2@nyu.edu');

  insert into public.courses (id, code, name_en, home_campus) values
    (c_sh, 'TEST-SHU 101', 'Smoke Test Course SH', 'SH'),
    (c_ny, 'TEST-UA 101',  'Smoke Test Course NY', 'NY'),
    (c_ad, 'TEST-AD 101',  'Smoke Test Course AD', 'AD');

  insert into public.professors (id, name_en) values (p1, 'smoke prof');

  -- ── 1. 注册触发器生成 anonymous_id（20260521 + 20260707000001 重试版）──
  if (select count(*) from public.users
      where id in (u1, u2)
        and anonymous_id is not null
        and length(anonymous_id) = 8) <> 2 then
    raise exception 'FAIL: signup trigger did not generate anonymous_id';
  end if;
  raise notice 'PASS: signup trigger generates 8-char anonymous_id';

  -- ── 2. before_user_created hook 域名校验（20260707000002）──────────────
  hook_result := public.hook_before_user_created(
    '{"user":{"email":"ok@nyu.edu"}}'::jsonb);
  if hook_result ? 'error' then
    raise exception 'FAIL: hook rejected a valid @nyu.edu email';
  end if;
  hook_result := public.hook_before_user_created(
    '{"user":{"email":"bad@gmail.com"}}'::jsonb);
  if not (hook_result ? 'error') then
    raise exception 'FAIL: hook accepted a gmail address';
  end if;
  hook_result := public.hook_before_user_created(
    '{"user":{"email":"sneaky@xnyu.edu"}}'::jsonb);
  if not (hook_result ? 'error') then
    raise exception 'FAIL: hook accepted @xnyu.edu lookalike domain';
  end if;
  raise notice 'PASS: hook_before_user_created enforces @nyu.edu';

  -- ── 3. 教授名唯一索引（20260707000003）─────────────────────────────────
  begin
    insert into public.professors (id, name_en)
      values (gen_random_uuid(), 'smoke prof');
    raise exception 'FAIL: duplicate professor name was allowed';
  exception when unique_violation then
    raise notice 'PASS: professors.name_en unique index blocks duplicates';
  end;

  -- ── 4. 等同课星型触发器（20260707000005）───────────────────────────────
  -- 正常路径：NY 课指向 SH 锚点
  update public.courses set equivalent_id = c_sh where id = c_ny;
  raise notice 'PASS: normal equivalent mapping (NY -> SH anchor) accepted';

  -- 自指
  begin
    update public.courses set equivalent_id = c_ad where id = c_ad;
    raise exception 'FAIL: self-referencing equivalent_id was allowed';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS: self reference rejected';
  end;

  -- 链式：AD 指向 NY（NY 本身已指向 SH）
  begin
    update public.courses set equivalent_id = c_ny where id = c_ad;
    raise exception 'FAIL: chained equivalent_id was allowed';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS: chain (pointing at a non-anchor) rejected';
  end;

  -- 锚点改挂：SH 已是 NY 的锚点，不能再指向 AD
  begin
    update public.courses set equivalent_id = c_ad where id = c_sh;
    raise exception 'FAIL: re-parenting an anchor was allowed';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS: anchor re-parenting rejected';
  end;

  -- ── 5. 重复评价唯一约束（20260707000001）───────────────────────────────
  insert into public.reviews
    (id, user_id, course_id, professor_id, semester, site, content_en)
  values
    (rv, u1, c_sh, p1, '2026 Fall', 'SH', 'smoke review');

  begin
    insert into public.reviews
      (user_id, course_id, professor_id, semester, site, content_en)
    values
      (u1, c_sh, p1, '2026 Fall', 'SH', 'duplicate attempt');
    raise exception 'FAIL: duplicate review (same user/course/prof/semester) allowed';
  exception when unique_violation then
    raise notice 'PASS: duplicate review blocked by unique index';
  end;

  -- ── 6. 点赞表约束（20260707000004）─────────────────────────────────────
  insert into public.review_votes (review_id, user_id, vote) values (rv, u2, 1);
  update public.review_votes set vote = -1
    where review_id = rv and user_id = u2;
  raise notice 'PASS: vote insert + change works';

  begin
    insert into public.review_votes (review_id, user_id, vote) values (rv, u1, 2);
    raise exception 'FAIL: vote value 2 was allowed';
  exception when check_violation then
    raise notice 'PASS: vote check constraint (only -1 / 1)';
  end;

  begin
    insert into public.review_votes (review_id, user_id, vote) values (rv, u2, 1);
    raise exception 'FAIL: second vote from same user on same review allowed';
  exception when unique_violation then
    raise notice 'PASS: one vote per user per review (PK)';
  end;

  -- ── 7. courses.created_by 列存在且可写（20260707000005）────────────────
  update public.courses set created_by = u1 where id = c_sh;
  raise notice 'PASS: courses.created_by writable';

  raise notice '=== ALL DB SMOKE TESTS PASSED ===';
end $$;

rollback;
