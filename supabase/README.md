# Supabase 工作流

本目录管理 NYUSH-CSG 的 Postgres schema、RLS 策略、触发器和数据库函数。
**SQL 文件是真理；不要在 Supabase 控制台 UI 直接改表或策略**。

```
supabase/
├── config.toml              # Supabase CLI 项目配置（首次 init 生成，提交 git）
├── migrations/              # 所有 schema 变更，按时间戳排序
│   ├── 20250407000001_initial_schema.sql
│   └── 20260521000001_enable_rls.sql
└── README.md
```

---

## 给贡献者（修代码、加 feature）

你**完全不需要**项目维护者的任何账号 / 密钥。本地一套 Supabase 环境就够。

### 1. 装 Docker Desktop

```bash
brew install --cask docker
# 没有 brew 的话先装 brew：https://brew.sh
# 或者去 https://www.docker.com 下 .dmg
```
装完打开 Docker.app，等托盘图标稳定。

### 2. 装 Supabase CLI

```bash
brew install supabase/tap/supabase
# 或者：npm install -g supabase
supabase --version  # 验证
```

### 3. 启动本地 Supabase（一次性等几分钟拉镜像）

```bash
cd /Users/<path>/NYUSH-CSG
supabase start
```

启动后会输出本地连接信息（URL / anon key / service_role key）。**这些 key 是 Supabase CLI 的固定开发 key，所有人本地都一样**，所以 [.env.example](../.env.example) 已经预填好，可以直接用：

```bash
cp .env.example .env.local
```

### 4. 把所有 migrations 应用到本地

```bash
supabase db reset
# 删本地 DB → 按时间戳顺序跑所有 migrations → 跑 supabase/seed.sql（如果有）
```

跑完你的本地 Postgres 就有完整的 schema + RLS 策略 + trigger。

### 5. 起前端

```bash
npm install
npm run dev
# 打开 http://localhost:3000/login
```

总结：**4 行命令完整 onboarding**

```bash
cp .env.example .env.local
supabase start
supabase db reset
npm run dev
```

---

## 日常开发命令速查

| 命令 | 作用 |
|------|------|
| `supabase start` | 启动本地 stack（Docker） |
| `supabase stop` | 停容器，保留数据 |
| `supabase stop --no-backup` | 停容器，删数据 |
| `supabase status` | 查看本地 stack URL / key |
| `supabase migration new <name>` | 新建 migration 文件 |
| `supabase db reset` | 本地从头重跑所有 migrations（**最常用，验证 SQL 正确**） |
| `supabase db push` | 把本地新 migration 推到远端 |
| `supabase db pull` | 远端的变更反向 diff 成新 migration |
| `supabase db diff` | 看本地 DB 跟 migrations 的差异 |

---

## RLS 测试 cookbook

### 1. 看现在所有策略

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

### 2. 模拟"匿名用户"测试（应该被全部拒绝）

在 Studio 的 SQL Editor 里：

```sql
set local role anon;
select * from public.users;     -- 期望：返回 0 行（RLS 挡住）
select * from public.reviews;   -- 期望：返回 0 行（reviews 策略要 authenticated）
reset role;
```

### 3. 模拟"某个登录用户"测试

```sql
-- 假装当前是 user_id = 'aaaaaaaa-...'
set local role authenticated;
set local request.jwt.claims to '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

select * from public.reviews;
-- 期望：返回所有 is_visible=true 的 + 自己 user_id 的（含软删）

insert into public.reviews (user_id, course_id, professor_id, semester, site, rating, difficulty, workload, content_zh)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '...', '...', '2025 Spring', 'SH', 5, 3, 3, '测试');
-- 期望：失败 —— with_check 要求 user_id = auth.uid()

reset role;
```

### 4. 验证 anon key 真的被 REST API 挡住

启动本地 stack 后在浏览器 console 跑：

```js
fetch('http://localhost:54321/rest/v1/users?select=*', {
  headers: { apikey: '<本地 anon key>' }
}).then(r => r.json()).then(console.log)
// 期望：[] 空数组
```

---

## 常见坑

### M1/M2 Mac Docker 慢
`supabase start` 第一次拉 image 巨慢且耗内存。建议给 Docker Desktop 至少分配 4GB 内存（Settings → Resources）。

### 改了线上但没记进 migration
有人手贱在 Supabase 控制台改了策略 → 本地 schema 和线上 drift。修复：

```bash
supabase db pull
# 把远端的变更 diff 出来生成一个新 migration 文件
# review 后 commit 进 git
```

之后约定：**只能改 SQL 文件，绝不在控制台改**。

### Migration 顺序乱了
CLI 用时间戳排序。如果你手写文件名（如 `003_xxx.sql`），跟时间戳混用时排序行为不确定。**全部用 `supabase migration new` 生成**，不要手写命名。

### 本地和线上的 anon key 不同
本地是固定值（CLI 输出的，所有人都一样），线上是每个 Supabase 项目独立生成的。
- `.env.local` 用本地 key（已预填在 `.env.example`）
- 生产部署用你自己 Supabase 项目的 key（去控制台 Settings → API 抄）

### `db reset` 把测试数据也清了
预期行为。如果想保留 seed data，把测试数据写进 `supabase/seed.sql`，reset 后会自动跑。

---

## 一个 PR 的标准 workflow

1. `supabase migration new <意图描述>` —— 生成新文件
2. 编辑 SQL，写完
3. `supabase db reset` —— 本地从头跑一遍验证
4. 用 Studio / psql 测策略是否如预期工作
5. 把对应应用代码改了（如新 endpoint）
6. `git add . && git commit && git push`
7. 等 PR 通过 → `supabase db push` 推到生产（或 CI 自动做）

记住：**每个 SQL 改动都对应一个 migration 文件，每个 migration 文件只做一件事，文件名能看出意图**。
