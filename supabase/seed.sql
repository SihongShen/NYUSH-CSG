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
