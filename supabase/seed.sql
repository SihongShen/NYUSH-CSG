-- 本地开发种子数据，supabase db reset 会自动跑（在所有 migration 之后）。
-- 包含多分类示例（CS+DS 同时必修、Math major + Maths Core 同时归属、General Elective 等）。

insert into public.courses
  (id, code, name_en, major_required, major_elective, minor, core_type, is_general_elective, home_campus)
values

  -- ──────────── Shanghai · CS / DS / CSE 三专业共享必修课 ────────────
  (gen_random_uuid(), 'CSCI-SHU 101', 'Introduction to Computer Science',
   '{"Computer Science","Data Science","Computer Systems Engineering"}', '{}', '{}', '{}', false, 'SH'),
  (gen_random_uuid(), 'CSCI-SHU 210', 'Data Structures',
   '{"Computer Science","Data Science","Computer Systems Engineering"}', '{}', '{}', '{}', false, 'SH'),
  (gen_random_uuid(), 'CSCI-SHU 220', 'Software Engineering',
   '{"Computer Science"}', '{"Data Science"}', '{}', '{}', false, 'SH'),
  (gen_random_uuid(), 'CSCI-SHU 360', 'Machine Learning',
   '{"Computer Science","Data Science"}', '{}', '{}', '{}', false, 'SH'),

  -- ──────────── Shanghai · IMA / IMB ────────────
  (gen_random_uuid(), 'IMA-SHU 101', 'Communications Lab',
   '{"Interactive Media Arts","Interactive Media and Business"}', '{}', '{}', '{}', false, 'SH'),
  (gen_random_uuid(), 'IMA-SHU 211', 'Creative Coding',
   '{"Interactive Media Arts"}', '{"Interactive Media and Business","Computer Science"}',
   '{"Creativity + Innovation"}', '{}', false, 'SH'),

  -- ──────────── Shanghai · 经济 / 金融 / 营销 ────────────
  (gen_random_uuid(), 'ECON-SHU 1', 'Principles of Economics',
   '{"Economics","Business and Finance","Business and Marketing"}', '{}', '{}', '{}', false, 'SH'),
  (gen_random_uuid(), 'ECON-SHU 251', 'Microeconomics',
   '{"Economics"}', '{"Business and Finance"}', '{}', '{}', false, 'SH'),

  -- ──────────── Shanghai · 数学（也算 Maths Core）────────────
  (gen_random_uuid(), 'MATH-SHU 131', 'Calculus',
   '{"Mathematics","Honors Mathematics","Computer Science","Data Science"}', '{}', '{}', '{"Maths"}', false, 'SH'),
  (gen_random_uuid(), 'MATH-SHU 201', 'Honors Calculus',
   '{"Honors Mathematics"}', '{"Mathematics"}', '{}', '{"Maths"}', false, 'SH'),

  -- ──────────── Shanghai · 纯 Core 课（无 major）────────────
  (gen_random_uuid(), 'GCS-SHU 110', 'Global Cultures: Antiquity & Renaissance',
   '{}', '{}', '{}', '{"PoH"}', false, 'SH'),
  (gen_random_uuid(), 'GCS-SHU 130', 'Social Foundations',
   '{}', '{}', '{}', '{"GPS"}', false, 'SH'),
  (gen_random_uuid(), 'WRIT-SHU 101', 'Writing as Inquiry',
   '{}', '{}', '{}', '{"WAI"}', false, 'SH'),
  (gen_random_uuid(), 'CHIN-SHU 101', 'Elementary Chinese I',
   '{}', '{}', '{}', '{"Chinese"}', false, 'SH'),

  -- ──────────── Shanghai · 理科 majors ────────────
  (gen_random_uuid(), 'PHYS-SHU 11', 'General Physics I',
   '{"Physics"}', '{"Mathematics"}', '{}', '{}', false, 'SH'),
  (gen_random_uuid(), 'BIO-SHU 21', 'Foundations of Biology',
   '{"Biology","Neural Science"}', '{}', '{"Molecular and Cell Biology","Genomics and Bioinformatics"}', '{}', false, 'SH'),

  -- ──────────── Shanghai · General Elective 示例 ────────────
  (gen_random_uuid(), 'MUS-SHU 102', 'Introduction to Music Theory',
   '{}', '{}', '{}', '{}', true, 'SH'),
  (gen_random_uuid(), 'ART-SHU 105', 'Drawing Studio',
   '{}', '{}', '{}', '{}', true, 'SH'),

  -- ──────────── New York（暂无 major 数据，等录入）────────────
  (gen_random_uuid(), 'CSCI-UA 102', 'Data Structures (NY)',
   '{}', '{}', '{}', '{}', false, 'NY'),
  (gen_random_uuid(), 'CSCI-UA 201', 'Computer Systems Organization',
   '{}', '{}', '{}', '{}', false, 'NY'),
  (gen_random_uuid(), 'FOOD-UA 1', 'Food and Identity',
   '{}', '{}', '{}', '{}', true, 'NY'),
  (gen_random_uuid(), 'JOUR-UA 101', 'Investigating Journalism',
   '{}', '{}', '{}', '{}', true, 'NY'),

  -- ──────────── Abu Dhabi ────────────
  (gen_random_uuid(), 'CSCI-AD 121', 'Discrete Mathematics',
   '{}', '{}', '{}', '{}', false, 'AD'),
  (gen_random_uuid(), 'SOCSC-AD 101', 'Social Sciences Foundations',
   '{}', '{}', '{}', '{}', false, 'AD'),
  (gen_random_uuid(), 'ARTH-AD 100', 'Art History of the Middle East',
   '{}', '{}', '{}', '{}', true, 'AD');


-- ============================================================================
-- 教授 + 课程关联（虚构示例数据，仅 Shanghai 课程）
-- 名字都是占位；真实数据后期通过 app UI 或 admin 后台补
-- ============================================================================

do $$
declare
  -- 课程 id（动态查）
  v_csci_101 uuid;
  v_csci_210 uuid;
  v_csci_220 uuid;
  v_csci_360 uuid;
  v_ima_101  uuid;
  v_ima_211  uuid;
  v_econ_1   uuid;
  v_econ_251 uuid;
  v_math_131 uuid;
  v_math_201 uuid;
  v_gcs_110  uuid;
  v_gcs_130  uuid;
  v_writ_101 uuid;
  v_bio_21   uuid;
  v_phys_11  uuid;
  v_mus_102  uuid;
  v_art_105  uuid;

  -- 教授 id
  v_smith   uuid := gen_random_uuid();
  v_jones   uuid := gen_random_uuid();
  v_chen    uuid := gen_random_uuid();
  v_wang    uuid := gen_random_uuid();
  v_liu     uuid := gen_random_uuid();
  v_zhang   uuid := gen_random_uuid();
  v_kim     uuid := gen_random_uuid();
  v_garcia  uuid := gen_random_uuid();
  v_oconnor uuid := gen_random_uuid();
  v_patel   uuid := gen_random_uuid();
begin
  select id into v_csci_101 from public.courses where code = 'CSCI-SHU 101';
  select id into v_csci_210 from public.courses where code = 'CSCI-SHU 210';
  select id into v_csci_220 from public.courses where code = 'CSCI-SHU 220';
  select id into v_csci_360 from public.courses where code = 'CSCI-SHU 360';
  select id into v_ima_101  from public.courses where code = 'IMA-SHU 101';
  select id into v_ima_211  from public.courses where code = 'IMA-SHU 211';
  select id into v_econ_1   from public.courses where code = 'ECON-SHU 1';
  select id into v_econ_251 from public.courses where code = 'ECON-SHU 251';
  select id into v_math_131 from public.courses where code = 'MATH-SHU 131';
  select id into v_math_201 from public.courses where code = 'MATH-SHU 201';
  select id into v_gcs_110  from public.courses where code = 'GCS-SHU 110';
  select id into v_gcs_130  from public.courses where code = 'GCS-SHU 130';
  select id into v_writ_101 from public.courses where code = 'WRIT-SHU 101';
  select id into v_bio_21   from public.courses where code = 'BIO-SHU 21';
  select id into v_phys_11  from public.courses where code = 'PHYS-SHU 11';
  select id into v_mus_102  from public.courses where code = 'MUS-SHU 102';
  select id into v_art_105  from public.courses where code = 'ART-SHU 105';

  insert into public.professors (id, name_en) values
    (v_smith,   'John Smith'),
    (v_jones,   'Mary Jones'),
    (v_chen,    'Wei Chen'),
    (v_wang,    'Li Wang'),
    (v_liu,     'Mei Liu'),
    (v_zhang,   'Xin Zhang'),
    (v_kim,     'Jiyoon Kim'),
    (v_garcia,  'Carlos Garcia'),
    (v_oconnor, 'Sean O''Connor'),
    (v_patel,   'Priya Patel');

  insert into public.course_professor (course_id, professor_id) values
    -- CS 三门主修
    (v_csci_101, v_smith),
    (v_csci_101, v_jones),
    (v_csci_210, v_smith),
    (v_csci_210, v_chen),
    (v_csci_220, v_chen),
    (v_csci_220, v_wang),
    (v_csci_360, v_wang),

    -- IMA
    (v_ima_101, v_zhang),
    (v_ima_211, v_zhang),

    -- ECON
    (v_econ_1,   v_garcia),
    (v_econ_1,   v_patel),
    (v_econ_251, v_garcia),

    -- Math
    (v_math_131, v_liu),
    (v_math_131, v_kim),
    (v_math_201, v_kim),

    -- Core 课多教授（GCS 模拟 lecturer + 多 reci TA）
    (v_gcs_110, v_jones),
    (v_gcs_110, v_oconnor),
    (v_gcs_110, v_patel),
    (v_gcs_130, v_oconnor),

    -- 其他
    (v_writ_101, v_oconnor),
    (v_bio_21,   v_kim),
    (v_phys_11,  v_zhang),
    (v_mus_102,  v_patel),
    (v_art_105,  v_jones);
end $$;


-- ============================================================================
-- 评价种子数据（本地 demo / UI 状态验证用，不进生产）
--   1. 直接 insert 3 个 auth.users（trigger 自动同步到 public.users 并生成 anonymous_id）
--   2. 再插入若干 reviews，覆盖：双语 / 仅中 / 仅英 / 软删 / 跨学期 / 同课多教授
-- 邮箱必须 like '%@nyu.edu' 才能过 public.users 的 check 约束
-- ============================================================================

insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated',
   'alice.demo@nyu.edu',
   crypt('demo-password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated',
   'bob.demo@nyu.edu',
   crypt('demo-password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated',
   'charlie.demo@nyu.edu',
   crypt('demo-password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
   now(), now(), '', '', '', '');


do $$
declare
  v_alice   uuid := '11111111-1111-1111-1111-111111111111';
  v_bob     uuid := '22222222-2222-2222-2222-222222222222';
  v_charlie uuid := '33333333-3333-3333-3333-333333333333';

  v_csci_101 uuid; v_csci_210 uuid; v_csci_360 uuid;
  v_math_131 uuid; v_econ_1 uuid; v_econ_251 uuid;
  v_ima_211  uuid; v_gcs_110 uuid; v_mus_102 uuid;

  v_smith uuid; v_jones uuid; v_chen uuid; v_wang uuid;
  v_liu   uuid; v_zhang uuid; v_garcia uuid; v_patel uuid;
begin
  select id into v_csci_101 from public.courses where code = 'CSCI-SHU 101';
  select id into v_csci_210 from public.courses where code = 'CSCI-SHU 210';
  select id into v_csci_360 from public.courses where code = 'CSCI-SHU 360';
  select id into v_math_131 from public.courses where code = 'MATH-SHU 131';
  select id into v_econ_1   from public.courses where code = 'ECON-SHU 1';
  select id into v_econ_251 from public.courses where code = 'ECON-SHU 251';
  select id into v_ima_211  from public.courses where code = 'IMA-SHU 211';
  select id into v_gcs_110  from public.courses where code = 'GCS-SHU 110';
  select id into v_mus_102  from public.courses where code = 'MUS-SHU 102';

  select id into v_smith  from public.professors where name_en = 'John Smith';
  select id into v_jones  from public.professors where name_en = 'Mary Jones';
  select id into v_chen   from public.professors where name_en = 'Wei Chen';
  select id into v_wang   from public.professors where name_en = 'Li Wang';
  select id into v_liu    from public.professors where name_en = 'Mei Liu';
  select id into v_zhang  from public.professors where name_en = 'Xin Zhang';
  select id into v_garcia from public.professors where name_en = 'Carlos Garcia';
  select id into v_patel  from public.professors where name_en = 'Priya Patel';

  insert into public.reviews
    (user_id, course_id, professor_id, semester, site, content_zh, content_en, is_visible)
  values
    -- Alice：双语长评 / 仅英 / 仅中 / 自己软删
    (v_alice, v_csci_101, v_smith, '2024 Fall', 'SH',
     '入门课，节奏适合零基础。Smith 老师讲解清楚，作业量适中，期末稍偏难，建议平时跟着 OH 走。',
     'Solid intro course. Smith explains things clearly, workload is reasonable, but the final was a bit tougher than expected — definitely worth going to office hours.',
     true),
    (v_alice, v_csci_210, v_chen, '2025 Spring', 'SH',
     null,
     'Heavy course. Chen lectures fast — you need to keep up week by week. The projects are where most of the learning actually happens.',
     true),
    (v_alice, v_math_131, v_liu, '2024 Spring', 'SH',
     'Liu 老师板书很细，适合回头反复看笔记。题量不少但都很标准，跟着做基本不会掉队。',
     null,
     true),
    (v_alice, v_mus_102, v_patel, '2024 January', 'SH',
     '内容比较水，January term 凑学分还行，但没什么记忆点。',
     'Light content. Decent for filling a January term slot but not particularly memorable.',
     false),  -- alice 自己软删

    -- Bob：同课不同教授对比 + 跨学期
    (v_bob, v_csci_101, v_jones, '2025 Spring', 'SH',
     'Jones 上的版本节奏比 Smith 慢一点，例子更生活化，适合完全没接触过编程的人。',
     'Jones runs a slower-paced section than Smith — more everyday-life examples. Better fit if you have zero prior coding background.',
     true),
    (v_bob, v_csci_210, v_smith, '2024 Fall', 'SH',
     null,
     'Smith teaching DS is a different vibe from his 101 — more rigorous, less hand-holding. His office hours are gold though.',
     true),
    (v_bob, v_econ_1, v_garcia, '2024 Fall', 'SH',
     '入门经济学，Garcia 老师很会讲故事，但考试细节抓得严，平时多记笔记。',
     'Solid intro econ. Garcia is a great storyteller in lecture, but exams test small details — take careful notes.',
     true),
    (v_bob, v_econ_251, v_garcia, '2025 Spring', 'SH',
     '比 ECON 1 难度跳了一档，主要是数学推导。Garcia 给的练习题对期末很关键。',
     null,
     true),

    -- Charlie：跨年份 + 不同领域
    (v_charlie, v_csci_360, v_wang, '2024 Fall', 'SH',
     'ML 入门首选。Wang 老师作业设计循序渐进，从 linear regression 一路到 simple CNN。需要 210 基础。',
     'Best intro to ML on campus. Wang structures the homeworks really well — from linear regression up to a simple CNN. Need to be solid on DS 210 first.',
     true),
    (v_charlie, v_ima_211, v_zhang, '2025 Summer', 'SH',
     'Summer 节奏很紧，但结业能攒出一份完整 portfolio，非常值。Zhang 反馈细到每一个 sketch。',
     'Summer pace is intense, but you end up with a strong portfolio. Zhang gives detailed feedback on every single sketch.',
     true),
    (v_charlie, v_csci_101, v_smith, '2024 Fall', 'SH',
     null,
     'Took this after switching majors. Smith was patient with non-CS students asking basic questions in OH.',
     true),
    (v_charlie, v_gcs_110, v_jones, '2023 Fall', 'SH',
     '阅读量大但讨论课氛围好。Jones 是 lecturer，TA 团队也很投入。',
     'Heavy reading load but discussion sections are where it clicks. Jones is the lecturer and the TA team is genuinely engaged.',
     true);
end $$;
