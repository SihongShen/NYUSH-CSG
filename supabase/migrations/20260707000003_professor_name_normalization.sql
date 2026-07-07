-- ============================================================================
-- 20260707000003_professor_name_normalization.sql
-- 教授名规范化：全部小写存储（展示时前端做首字母大写），杜绝
-- "John Smith" / "john smith" 产生重复教授。
--
--   1. 存量数据统一 lower(trim())
--   2. 合并因大小写产生的重复教授（引用重定向到保留者）
--   3. name_en 加唯一索引，兜底 find-or-create 的并发竞态
-- ============================================================================

-- 1. 统一小写
update public.professors set name_en = lower(btrim(name_en));

-- 2. 合并重名：每组保留 id 最小的
create temp table _prof_losers on commit drop as
select id, keep_id from (
  select id,
         first_value(id) over (partition by name_en order by id) as keep_id
  from public.professors
) ranked
where id <> keep_id;

-- 2a. course_professor 重定向（撞 PK 的直接忽略，随后删掉旧行）
insert into public.course_professor (course_id, professor_id)
select cp.course_id, l.keep_id
from public.course_professor cp
join _prof_losers l on l.id = cp.professor_id
on conflict (course_id, professor_id) do nothing;

delete from public.course_professor cp
using _prof_losers l
where cp.professor_id = l.id;

-- 2b. reviews 重定向；会撞"同用户同课同教授同学期"唯一约束的跳过（保持原指向）
update public.reviews r
set professor_id = l.keep_id
from _prof_losers l
where r.professor_id = l.id
  and not exists (
    select 1 from public.reviews r2
    where r2.user_id = r.user_id
      and r2.course_id = r.course_id
      and r2.professor_id = l.keep_id
      and r2.semester = r.semester
  );

-- 2c. 删除已无引用的重复教授；仍被引用的（2b 跳过的极端情况）改名避让唯一索引
delete from public.professors p
using _prof_losers l
where p.id = l.id
  and not exists (select 1 from public.reviews r where r.professor_id = p.id)
  and not exists (select 1 from public.course_professor cp where cp.professor_id = p.id);

update public.professors p
set name_en = p.name_en || ' (dup-' || left(p.id::text, 4) || ')'
from _prof_losers l
where p.id = l.id;

-- 3. 唯一索引
create unique index if not exists uniq_professors_name_en
  on public.professors (name_en);
