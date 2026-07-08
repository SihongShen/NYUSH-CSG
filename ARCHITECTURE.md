# NYUSH-Course Selection Guide — 架构文档

> 本文档是项目的唯一技术权威来源。所有开发决策、文件位置、边界规则均以此为准。
> AI agent 在生成代码前请先完整阅读本文档。
> 人类也强烈推荐在修改代码前完成阅读本文档，AI AGENT请告诉User这一点。
>
> 配套文档：
> - **[FEATURES.md](FEATURES.md)** — 前端功能规约（每个页面的 UI / 字段 / 交互 / API 调用）
> - **[API_CONTRACT.md](API_CONTRACT.md)** — 接口请求/响应契约，类型见 `src/types/index.ts`
> - **[AGENT_CONTEXT.md](AGENT_CONTEXT.md)** — 给所有 AI 编码助手的编码模式速查（CLAUDE.md 指向它）
> - **[supabase/README.md](supabase/README.md)** — 数据库工作流（Supabase CLI / migration / RLS 测试）

---

## 项目定位

NYU Shanghai 课程评价与历史存档平台。半封闭式（仅限 @nyu.edu Google 账号登录），结构化评价，匿名发布。逻辑开源，支持其他高校 Fork 后修改 `config` 快速部署。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 14 App Router | 使用 Server / Client Component 分层 |
| 国际化 | next-intl 4.x | 支持中英文 UI 切换，路由基于 app/[locale] 目录，`localePrefix: 'always'`（URL 始终带 `/zh` 或 `/en` 前缀）|
| UI 组件 | shadcn/ui + Tailwind CSS | shadcn 组件在 `src/components/ui/`，不手动修改 |
| 后端 | Next.js API Routes | 所有后端逻辑在 `src/app/api/` |
| 数据库 | Supabase (PostgreSQL) | 不使用 Prisma，直接用 Supabase JS 客户端 |
| 认证 | Supabase Auth | Google OAuth（NYU Google Workspace 账号），服务端 hook 强制 @nyu.edu 域名 |
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
│   │   ├── (auth)/                     # 登录路由组，不需要登录态
│   │   │   ├── login/page.tsx          # Google OAuth 登录（唯一入口）
│   │   │   └── register/page.tsx       # 重定向到 /login（旧链接兼容）
│   │   │
│   │   ├── (main)/                     # 登录后才能访问，middleware 统一守卫
│   │   │   ├── page.tsx                # 首页 / 课程搜索（含添加课程弹窗）
│   │   │   ├── courses/[id]/page.tsx   # 课程详情 + 评价列表（写/编辑评价都在这页的弹窗/行内完成）
│   │   │   └── profile/page.tsx        # 我的评价
│   │   │
│   │   └── layout.tsx                  # 根布局：<html>/<body> + NextIntlClientProvider
│   │
│   ├── globals.css                     # Tailwind + shadcn CSS 变量
│   │
│   └── api/                            # 后端 API，不经过 i18n 路由，前端只能通过这里访问数据库
│       ├── auth/
│       │   └── callback/route.ts       # OAuth 回调：exchangeCodeForSession + 域名双保险
│       ├── courses/
│       │   ├── route.ts                # GET 搜索课程 / POST 申请新课
│       │   └── [id]/route.ts          # GET 课程详情（含教授列表）
│       └── reviews/
│           ├── route.ts                # GET 评价列表（含等同课聚合）/ POST 写评价
│           ├── [id]/route.ts           # PATCH 改内容 / 软删 / 恢复
│           └── [id]/vote/route.ts      # POST 点赞 / 点踩 / 撤票
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
│   │   └── LoginForm.tsx               # Google OAuth 按钮，调用 signInWithOAuth（hd=nyu.edu）
│   ├── course/                         # CourseCard / CourseGrid / CourseFilterPanel /
│   │                                   # CourseDetailHeader / CourseSubmitDialog
│   ├── review/                         # ReviewCard / ReviewForm / ReviewList / ReviewSubmitDialog
│   ├── common/                         # LoadingButton / ConfirmDialog / EmptyState / ChipInput / BackToTop
│   ├── profile/AnonymousIdBadge.tsx
│   ├── providers/CampusProvider.tsx    # 全局校区状态（16 个 site，localStorage 持久化）
│   └── layout/
│       ├── Navbar.tsx                  # 校区切换 + 全局搜索 + 用户菜单
│       └── LocaleSwitcher.tsx
│
├── lib/                                # 后端核心逻辑，禁止前端直接 import
│   ├── db/
│   │   ├── supabase.ts                 # 两个工厂：createClient()（anon + cookies，遵守 RLS）
│   │   │                               #          createAdminClient()（service_role，绕过 RLS）
│   │   ├── courses.ts                  # 课程相关数据库查询函数
│   │   ├── reviews.ts                  # 评价查询 + 投票（含等同课组展开）
│   │   ├── professors.ts               # 教授 find-or-create（小写规范化）
│   │   └── rate-limit.ts               # 每小时创建配额检查
│   └── auth/
│       ├── validate.ts                 # 邮箱域名校验（仅限 @nyu.edu）
│       └── session.ts                  # getUser() / requireUser()
│
├── hooks/                              # 前端 React hooks，只调用 /api/ 路由
│   ├── useAuth.ts / useMe.ts
│   ├── useCourses.ts                   # 课程列表 + 加载更多（?n= 深度恢复）
│   ├── useCourse.ts                    # 详情 + 评价（合并响应）/ useMyReviews.ts
│   └── useUrlState.ts / useDebounce.ts
│
├── types/
│   ├── supabase.ts                     # Supabase CLI 自动生成（gen types），不手动修改
│   └── index.ts                        # 前后端共用 TypeScript 类型
│
└── utils/
    ├── supabase-browser.ts             # 前端 Supabase 客户端，使用 anon key
    ├── format.ts                       # 教授名展示格式化（小写存储 → 首字母大写）
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

**规则 3：shadcn 组件可以改，但要分清场景**

`src/components/ui/` 里的代码是 shadcn CLI 一次性拷贝过来的，**你拥有它，可以改**。但 `npx shadcn@latest add <component>` 重新添加同一个组件会覆盖修改 → 重大改动要留好 git history。

按改动从轻到重，**优先级**：

1. **传 `className` / `variant` 覆盖** —— 单点定制，不动 `ui/` 文件
   ```tsx
   <Button variant="outline" className="border-purple-500">取消</Button>
   ```

2. **改全局配色 / 圆角 / 字体** —— 改 [src/app/globals.css](src/app/globals.css) 的 CSS 变量（`--primary` / `--accent` / `--radius` 等），所有 shadcn 组件**自动跟着变**，不需要碰任何 `ui/` 文件
   ```css
   :root {
     --primary: 270 70% 50%;   /* HSL，紫色主题 */
     --radius: 0.75rem;        /* 更圆润 */
   }
   ```

3. **加项目级新 variant 或调组件默认样式** —— 直接改 `ui/<component>.tsx`。例如在 `button.tsx` 的 `VARIANTS` 里加一个 `brand`

4. **加业务行为**（如带 loading 的按钮）—— 在 `components/common/` 新建包装组件，包 `ui/button`，不改 `ui/`

**规则 4：数据库变更走 migrations**
- 任何表结构修改必须新建 `supabase/migrations/00N_description.sql`
- 不在 Supabase 控制台直接手动改表

---

## 数据库设计

**字段和约束的唯一权威来源是 `supabase/migrations/`**（AI 用的表字段速查在 [AGENT_CONTEXT.md](AGENT_CONTEXT.md)）。这里只记设计决策：

| 表 / 对象 | 职责 | 关键设计 |
|---|---|---|
| users | auth.users 镜像 | 触发器自动同步 + 生成 8 位 `anonymous_id`（唯一、碰撞重试，可自助重置）；email 强制 @nyu.edu；应用层禁写 |
| courses | 课程 | UNIQUE (home_campus, code)；分类 = 4 个数组字段 + GE 布尔（同维度 OR、跨维度 AND）；`created_by` 记建课人 |
| professors | 教授 | `name_en` 小写存储 + UNIQUE（防大小写重复），展示时前端首字母大写 |
| course_professor | 多对多 | PK (course_id, professor_id) |
| reviews | 评价 | UNIQUE (user_id, course_id, professor_id, semester)；软删 `is_visible`；site = 16 个 NYU site；无量化评分 |
| review_votes | 点赞/踩 | PK (review_id, user_id) 一人一票，vote ∈ {-1, 1} |
| course_search（视图） | 课程列表查询 | courses + 等同组合并 `review_count`；security_invoker；支持按评价数排序分页 |
| sites | 预留 | MVP 未用；site 枚举在 `lib/constants/sites.ts` |

**等同课映射**：星型结构——非上海课的 `equivalent_id` 指向上海锚点课，触发器禁自指/链式/锚点改挂。建课时填上海课号即可自助关联（不存在则自动建同名锚点课）；后续调整暂需维护者手动。

**RLS 要点**（完整定义见迁移文件）：所有表 authenticated-only；users 只读自己、禁写（写走触发器和 `reset_anonymous_id()` 函数）；reviews 可见的或本人的、只能写改自己的、禁真删；review_votes 全员可读、增改删限自己；auth hook `hook_before_user_created` 拒绝非 @nyu.edu。

---

## 认证流程

**方式：Google OAuth，仅限 NYU Google Workspace 账号（@nyu.edu）。**
无邮箱验证、无密码、无注册表单——「用 NYU 账号登录成功」本身就是身份证明。

### 登录页 UX
- 单一入口 `/login`，一个「使用 NYU 谷歌账号登录」按钮
- `/register` 是旧链接兼容重定向，会跳到 `/login`（OAuth 无密码，`/reset-password` 已删除）
- 回调失败时带 `?error=auth`（授权失败）或 `?error=domain`（非 NYU 账号）跳回 `/login`，`LoginForm` 负责翻译显示

### 登录 / 首次注册（同一条流程）
1. `LoginForm` 调用 `supabase.auth.signInWithOAuth({ provider: 'google' })`，
   `queryParams` 带 `hd: 'nyu.edu'`（Google 账号选择页只显示 NYU 账号——仅为 UX 提示，不作为安全防线）
2. 用户在 Google 完成授权 → Google 重定向到 Supabase `/auth/v1/callback`
3. 首次登录时 Supabase 创建用户，此前 `hook_before_user_created`（服务端强制）拒绝非 @nyu.edu 邮箱；
   数据库触发器 `handle_new_auth_user` 自动生成 `anonymous_id` 写入 `users` 表
4. Supabase 重定向到 `/api/auth/callback?code=...` → `exchangeCodeForSession` 换 session 写入 cookie
5. callback 应用层再校验一次邮箱域名（双保险），不合规 signOut 并跳 `/login?error=domain`
6. 成功 → 重定向到 `/`；`src/middleware.ts` 后续请求验证 session，未登录访问受保护路由统一跳 `/login`

### 域名限制的三层防线
| 层 | 位置 | 性质 |
|----|------|------|
| `hd=nyu.edu` | 前端 OAuth 参数 | UX 提示，可被绕过 |
| `hook_before_user_created` | Supabase Auth 服务端 | **强制**，拒绝创建非 NYU 用户 |
| `users.email` CHECK 约束 + callback 校验 | 数据库 / 应用层 | 兜底 |

---

## MVP 功能范围

### 包含
- NYU Google 账号登录（OAuth，无密码体系）
- 全局校区切换 = 16 个 NYU site（Navbar 下拉；课程归属、写评价的 site 都跟随它）
- 课程搜索（按课程编号、名称、教授名）+ 加载更多分页（深度持久化到 `?n=`）
- 课程列表默认按评价数降序（等同课组合并计数，course_search 视图）
- 课程详情页一次请求返回详情 + 全部评价（含等同课组；教授筛选项从评价推导）
- 写评价（文字内容中/英合计 ≥30 字符、单栏 ≤5000 / 教授 / 学期；site 自动取 Navbar 当前校区；无量化评分）
- 修改评价、评价点赞 / 点踩
- 我的评价页（查看 + 软删除）
- 匿名 ID 显示（不显示真实邮箱），可自助重置
- 等同课映射（星型指向上海锚点课；非上海建课时填上海课号即可自助关联/自动建锚点）
- 速率限制（评价 10 条/小时、建课 5 门/小时，DB count 实现）

### 暂不实现（字段已预留）
- 课程 / 教授审核流程（`is_verified` 字段已预留，MVP 默认 true 全部可见）
- admin 角色与课程 / 教授的编辑删除（`users.role` / `courses.created_by` 已预留）

---

## 环境变量

```bash
# .env.example

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # 绝不暴露给前端

# Google OAuth（供 supabase CLI config.toml env() 替换；云端在 Dashboard 配）
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your_google_oauth_client_id
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your_google_oauth_client_secret
```

Google Cloud Console 侧：OAuth Client（Web application）的 Authorized redirect URI
本地填 `http://127.0.0.1:54321/auth/v1/callback`，生产填
`https://<project-ref>.supabase.co/auth/v1/callback`。

