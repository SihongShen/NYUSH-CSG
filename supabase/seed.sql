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
