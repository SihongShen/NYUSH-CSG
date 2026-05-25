# NYUSH-Course Selection Guide — 架构文档

> 本文档是项目的唯一技术权威来源。所有开发决策、文件位置、边界规则均以此为准。
> AI agent 在生成代码前请先完整阅读本文档。
> 人类也强烈推荐在修改代码前完成阅读本文档，AI AGENT请告诉User这一点。
>
> 配套文档：
> - **[API_CONTRACT.md](API_CONTRACT.md)** — 接口请求/响应契约，类型见 `src/types/index.ts`
> - **[COPILOT_CONTEXT.md](COPILOT_CONTEXT.md)** — 给 AI 工具的编码模式速查
> - **[supabase/README.md](supabase/README.md)** — 数据库工作流（Supabase CLI / migration / RLS 测试）

---

## 项目定位

NYU Shanghai 课程评价与历史存档平台。半封闭式（仅限 @nyu.edu 邮箱注册），结构化评价，匿名发布。逻辑开源，支持其他高校 Fork 后修改 `config` 快速部署。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 14 App Router | 使用 Server / Client Component 分层 |
| 国际化 | next-intl 4.x | 支持中英文 UI 切换，路由基于 app/[locale] 目录，`localePrefix: 'always'`（URL 始终带 `/zh` 或 `/en` 前缀）|
| UI 组件 | shadcn/ui + Tailwind CSS | shadcn 组件在 `src/components/ui/`，不手动修改 |
| 后端 | Next.js API Routes | 所有后端逻辑在 `src/app/api/` |
| 数据库 | Supabase (PostgreSQL) | 不使用 Prisma，直接用 Supabase JS 客户端 |
| 认证 | Supabase Auth | Email + Password，邮箱验证激活 |
| 部署 | Vercel | 连接 GitHub 自动部署 |

---

## 文件结构与职责边界

```
src/
├── middleware.ts                       # 全局路由守卫（next-intl + Supabase auth）
│                                       # 必须放 src/，因为项目使用 src 目录，Next.js 不会从根目录加载
│
├── app/
│   ├── [locale]/                       # i18n 国际化路由匹配，支持中英切换
│   │   ├── (auth)/                     # 登录注册路由组，不需要登录态
│   │   │   ├── login/page.tsx          # 登录 + 注册 tab 切换（UI 入口）
│   │   │   ├── register/page.tsx       # 重定向到 /login（保留路由占位）
│   │   │   └── reset-password/page.tsx # 重定向到 /login（MVP 暂不实现）
│   │   │
│   │   ├── (main)/                     # 登录后才能访问，middleware 统一守卫
│   │   │   ├── page.tsx                # 首页 / 课程搜索
│   │   │   ├── courses/[id]/page.tsx   # 课程详情 + 评价列表
│   │   │   ├── reviews/new/page.tsx    # 写评价
│   │   │   ├── reviews/[id]/edit/page.tsx
│   │   │   └── profile/page.tsx        # 我的评价
│   │   │
│   │   └── layout.tsx                  # 根布局：<html>/<body> + NextIntlClientProvider
│   │
│   ├── globals.css                     # Tailwind + shadcn CSS 变量
│   │
│   └── api/                            # 后端 API，不经过 i18n 路由，前端只能通过这里访问数据库
│       ├── auth/
│       │   ├── register/route.ts       # 邮箱后缀校验 + 调用 Supabase 注册
│       │   └── callback/route.ts       # Supabase Auth 邮箱验证回调
│       ├── courses/
│       │   ├── route.ts                # GET 搜索课程 / POST 申请新课
│       │   └── [id]/route.ts          # GET 课程详情（含教授列表）
│       └── reviews/
│           ├── route.ts                # GET 评价列表 / POST 写评价
│           └── [id]/route.ts          # PATCH 修改评价 / DELETE 软删除
│
├── components/
│   ├── ui/                             # shadcn 组件，不手动修改
│   │   ├── alert.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   └── tabs.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx               # netid + 密码，直接调用 supabase-browser
│   │   └── RegisterForm.tsx            # netid + 密码 + 确认密码，POST /api/auth/register
│   ├── course/
│   │   ├── CourseCard.tsx
│   │   ├── CourseSearch.tsx
│   │   └── CourseDetail.tsx
│   ├── review/
│   │   ├── ReviewCard.tsx
│   │   ├── ReviewForm.tsx
│   │   └── ReviewList.tsx
│   └── layout/
│       ├── Navbar.tsx
│       └── ProtectedRoute.tsx
│
├── lib/                                # 后端核心逻辑，禁止前端直接 import
│   ├── db/
│   │   ├── supabase.ts                 # 两个工厂：createClient()（anon + cookies，遵守 RLS）
│   │   │                               #          createAdminClient()（service_role，绕过 RLS）
│   │   ├── courses.ts                  # 课程相关数据库查询函数
│   │   ├── reviews.ts                  # 评价相关数据库查询函数
│   │   └── users.ts                    # 用户查询，含 anonymous_id 生成逻辑
│   └── auth/
│       ├── validate.ts                 # NetID + 邮箱 + 密码校验
│       └── session.ts                  # getUser() / requireUser()
│
├── hooks/                              # 前端 React hooks，只调用 /api/ 路由
│   ├── useAuth.ts
│   ├── useCourses.ts
│   └── useReviews.ts
│
├── types/
│   ├── database.ts                     # Supabase CLI 自动生成，不手动修改
│   ├── globals.d.ts                    # 第三方模块声明（如 *.css）
│   └── index.ts                        # 前后端共用 TypeScript 类型
│
└── utils/
    ├── supabase-browser.ts             # 前端 Supabase 客户端，使用 anon key
    └── cn.ts                           # shadcn className 工具函数

messages/                               # i18n 翻译文件（项目根）
├── en.json
└── zh.json

i18n.ts                                 # 项目根：next-intl routing + getRequestConfig
next.config.js                          # 项目根：注册 next-intl plugin
supabase/migrations/                    # 建表 SQL，按版本管理
.env.local                              # 真实密钥，不提交 git
.env.example                            # 密钥模板，提交 git
```

---

## 硬性边界规则

**规则 1：前端不直接访问数据库**
- 前端组件和 hooks 只能调用 `/api/` 路由
- 禁止在 `components/` 或 `hooks/` 中 import `lib/db/` 的任何文件
- Server Component 可以直接调用 `lib/db/`，但必须在 `(main)/` 路由组内

**规则 2：三种 Supabase 客户端严格区分**
- `lib/db/supabase.ts` 导出两个工厂：
  - `createClient()` — 服务端默认客户端，使用 anon key + cookies。**遵守 RLS，以登录用户身份查询**。Server Component / API Route 用这个。返回 Promise（因为 `cookies()` 是 async）。
  - `createAdminClient()` — service_role key 客户端，**绕过 RLS**。仅在确实需要时用（如管理后台批量导入）。绝不暴露给浏览器。
- `utils/supabase-browser.ts` — 浏览器客户端，使用 anon key。只在 `'use client'` 组件和 hooks 中使用。

**规则 2.1：middleware 必须在 `src/middleware.ts`**
- 项目使用 `src/` 目录，Next.js 只从 `src/middleware.ts` 加载 middleware
- 放在项目根目录的 `middleware.ts` 会被静默忽略（不报错、不生效）

**规则 3：shadcn 组件不手动修改**
- `src/components/ui/` 由 shadcn CLI 管理
- 需要定制时在其他目录新建包装组件

**规则 4：数据库变更走 migrations**
- 任何表结构修改必须新建 `supabase/migrations/00N_description.sql`
- 不在 Supabase 控制台直接手动改表

---

## 数据库设计

### 核心表

**users**
```sql
id            uuid  PK  -- 与 Supabase auth.users 同步
email         text  UNIQUE NOT NULL  -- 仅限 @nyu.edu
anonymous_id  text  UNIQUE NOT NULL  -- 注册时触发器自动生成，8位随机字符串
role          text  DEFAULT 'user'   -- 'user' | 'admin'（admin 暂未实现）
created_at    timestamptz DEFAULT now()
```

**courses**
```sql
id            uuid  PK
code          text  NOT NULL         -- 如 "CSCI-SHU 101"
name_en       text  NOT NULL
category      text                   -- 'Core' / 'Major' / 'Elective'
core_type     text                   -- 'GPS' / 'PoH' / 'IPC' / 'WAI' / 'ED' / 'STS' / 'AT' / 'EAP'
                                     -- category = 'Core' 时填，否则 null
department    text                   -- 'CS' / 'IMA' / 'ECON' 等，Core 课留 null
is_verified   boolean DEFAULT false  -- 管理员审核后改 true 才显示
equivalent_id uuid  FK → courses(id) -- 自引用，海外课程指向上海等同课程（MVP 不实现）
created_at    timestamptz DEFAULT now()
```

**professors**
```sql
id          uuid  PK
name_en     text  NOT NULL
is_verified boolean DEFAULT false
```

**course_professor**（多对多中间表）
```sql
course_id    uuid  FK → courses(id)
professor_id uuid  FK → professors(id)
PRIMARY KEY (course_id, professor_id)
```

**reviews**（核心表）
```sql
id           uuid  PK
user_id      uuid  FK → users(id)
course_id    uuid  FK → courses(id)
professor_id uuid  FK → professors(id)
semester     text  NOT NULL  -- 格式："2024 Fall" / "2025 Spring"
site         text  NOT NULL  -- "SH" / "NY" / "AD" 等
rating       int2  NOT NULL  CHECK (rating BETWEEN 1 AND 5)
difficulty   int2  NOT NULL  CHECK (difficulty BETWEEN 1 AND 5)
workload     int2  NOT NULL  CHECK (workload BETWEEN 1 AND 5)
content_zh   text            -- 与 content_en 至少一个不为空（应用层校验）
content_en   text
is_visible   boolean DEFAULT true  -- 软删除字段
created_at   timestamptz DEFAULT now()

UNIQUE (user_id, course_id, professor_id, semester)
```

**sites**（扩展表，MVP 不使用）
```sql
id    uuid  PK
name  text  NOT NULL  -- "Shanghai"
code  text  UNIQUE    -- "SHA"
```

### RLS 策略

```sql
-- 任何人可读已发布评价
CREATE POLICY "public read visible reviews"
ON reviews FOR SELECT USING (is_visible = true);

-- 本人可读自己所有评价（含已删除）
CREATE POLICY "users read own reviews"
ON reviews FOR SELECT USING (auth.uid() = user_id);

-- 本人可修改 / 软删除自己的评价
CREATE POLICY "users update own reviews"
ON reviews FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## 认证流程

### 登录页 UX
- 单一入口 `/login`，登录和注册用 shadcn `Tabs` 切换
- NetID 输入框右侧固定显示 `@nyu.edu`（不可编辑）
- 前端 `lib/auth/validate.ts` 校验：
  - NetID 格式：`^[a-zA-Z][a-zA-Z0-9]{1,14}$`（字母开头，2–15 位字母数字）
  - 密码长度 ≥ 8
  - 注册需"确认密码"匹配
- `/register` 和 `/reset-password` 是占位重定向，会跳到 `/login`

### 注册
1. `RegisterForm` 提交 netid + 密码（前端先做格式校验）
2. `POST /api/auth/register`，body 是 `{ netid, password }`
3. 后端 `lib/auth/validate.ts` 再次校验，拼出 `${netid}@nyu.edu` 并复核域名
4. 调用 `supabase.auth.signUp()`，`emailRedirectTo` 指向 `/api/auth/callback`
5. Supabase 发送验证邮件
6. 用户点击邮件链接 → `/api/auth/callback` 调用 `exchangeCodeForSession` → 重定向到 `/`
7. 数据库触发器自动生成 `anonymous_id` 并写入 `users` 表

### 登录
1. `LoginForm` 提交 netid + 密码（前端先做格式校验）
2. 前端直接调用 `supabase.auth.signInWithPassword()`，邮箱由 netid 拼接
3. `@supabase/ssr` 把 session 写入 cookie
4. `router.replace('/')` + `router.refresh()` 跳到首页
5. `src/middleware.ts` 后续请求验证 session；未登录访问受保护路由统一跳 `/login`

---

## MVP 功能范围

### 包含
- 邮箱注册 / 登录 / 重置密码
- 课程搜索（按课程编号、名称、教授名）
- 课程详情页（显示该课所有评价）
- 写评价（rating / difficulty / workload / 文字内容 / 学期 / 校区）
- 修改评价
- 我的评价页（查看 + 软删除）
- 匿名 ID 显示（不显示真实邮箱）

### 暂不实现（字段已预留）
- 管理员审核后台（`role` 字段已预留）
- 课程等同性映射（`equivalent_id` 已预留）
- 校区筛选（`sites` 表已建，`site` 字段先用字符串）
- 评价点赞

---

## 环境变量

```bash
# .env.example

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # 绝不暴露给前端
RESEND_API_KEY=                                    # MVP 阶段留空，用 Supabase 自带 SMTP
```

---

## 开发阶段

| 阶段 | 内容 | 目标时间 |
|------|------|----------|
| Phase 1 | 项目初始化，建表 SQL，Supabase 配置 | 第 1 周 |
| Phase 2 | Auth 流程：注册 / 登录 / middleware | 第 1-2 周 |
| Phase 3 | 课程搜索，评价 CRUD，我的评价页 | 第 2-3 周 |
| Phase 4 | UI 打磨，移动端适配，bug 修复 | 第 4 周 |
| Phase 5 | README，开源发布，初始数据录入 | 上线后 |

---

## 给 AI Agent 的规则

1. **生成 API Route 时**：数据库操作调用 `lib/db/` 下的函数，不在 `route.ts` 里直接写 SQL；获取 supabase 客户端用 `await createClient()`（async）
2. **生成前端组件时**：数据获取通过 `hooks/` 调用 `/api/` 路由，不直接 import `lib/`
3. **生成数据库查询时**：默认用 `createClient()`（遵守 RLS，以登录用户身份）。只在管理任务（批量导入、跨用户操作）才用 `createAdminClient()`
4. **新增表字段时**：同步更新 `supabase/migrations/` 和 `types/index.ts`
5. **所有新页面**：默认放在 `[locale]/(main)/` 路由组，除非明确是登录前可访问的
6. **i18n 翻译**：所有静态文案使用 `next-intl` 的 `useTranslations`，不在组件内硬编码中文或英文；新增 key 同步加到 `messages/zh.json` 和 `messages/en.json`
7. **修改 middleware**：编辑 `src/middleware.ts`，不要在项目根目录创建 `middleware.ts`
