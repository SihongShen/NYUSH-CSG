-- 1. users table
create table users (
  id uuid primary key references auth.users(id),
  email text unique not null check (email like '%@nyu.edu'),
  anonymous_id text unique not null,
  role text default 'user',
  created_at timestamptz default now()
);



-- 2. courses table
create table courses (
  id uuid primary key,
  code text not null,
  name_en text not null,
  category text,
  core_type text,
  department text,
  is_verified boolean default true,
  equivalent_id uuid references courses(id),
  created_at timestamptz default now()
);
-- id            uuid  PK
-- code          text  NOT NULL         -- 如 "CSCI-SHU 101"
-- name_en       text  NOT NULL
-- category      text                   -- 'Core' / 'Major' / 'Elective'
-- core_type     text                   -- 'GPS' / 'PoH' / 'IPC' / 'WAI' / 'ED' / 'STS' / 'AT' / 'EAP'
--                                      -- category = 'Core' 时填，否则 null
-- department    text                   -- 'CS' / 'IMA' / 'ECON' 等，Core 课留 null
-- is_verified   boolean DEFAULT true   -- 字段为未来审核流程预留；MVP 默认 true，不在 RLS 中过滤
-- equivalent_id uuid  FK → courses(id) -- 自引用，海外课程指向上海等同课程（MVP 不实现）
-- created_at    timestamptz DEFAULT now()



-- 3. professors table
create table professors (
  id uuid primary key,
  name_en text not null,
  is_verified boolean default true   -- 未来审核流程预留；MVP 默认 true
);



-- 4. course_professor (junction table)
create table course_professor (
  course_id uuid references courses(id),
  professor_id uuid references professors(id),
  primary key (course_id, professor_id)
);



-- 5. reviews table
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  course_id uuid references courses(id),
  professor_id uuid references professors(id),
  semester text not null,
  site text not null,
  rating int2 check (rating between 1 and 5),
  difficulty int2 check (difficulty between 1 and 5),
  workload int2 check (workload between 1 and 5),
  content_zh text,
  content_en text,
  is_visible boolean default true,
  created_at timestamptz default now()
);



-- (Optional) sites table
create table sites (
  id uuid primary key,
  name text not null,
  code text unique
);
