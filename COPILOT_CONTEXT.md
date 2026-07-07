# Copilot 上下文文档

> 把这个文件的内容粘贴到 Cursor 的 `.cursorrules`，或者在 GitHub Copilot Chat 里用 `#file` 引用它。
> 每次让 AI 生成代码前先引用这个文件。

---

## 这个项目是什么

NYU Shanghai 课程评价平台。Next.js 14 App Router + Supabase（Auth + Postgres）+ next-intl 4.x + Tailwind + shadcn/ui，部署在 Vercel。所有路由在 `[locale]` 下，URL 形如 `/zh/...` 或 `/en/...`。

## 你必须遵守的规则

### 文件放哪里

- Middleware → `src/middleware.ts`（**必须在 src/**，不能放项目根目录）
- 页面文件 → `src/app/[locale]/(main)/` 或 `src/app/[locale]/(auth)/`
- API 路由 → `src/app/api/`（不带 locale 前缀）
- React 组件 → `src/components/` 下按功能分子目录（ui / auth / course / review / layout）
- 数据库查询函数 → `src/lib/db/`
- 前端 hooks → `src/hooks/`
- TypeScript 类型 → `src/types/index.ts`
- i18n 文案 → `messages/zh.json` + `messages/en.json`（保持 key 同步）

### 绝对禁止

- 禁止在 `components/` 或 `hooks/` 里 import `src/lib/` 的任何东西
- 禁止在前端使用 `SUPABASE_SERVICE_ROLE_KEY`
- 不要随手乱改 `src/components/ui/`（参考下方"shadcn 组件改法"小节，按层级走）
- 禁止直接在 Supabase 控制台改表结构，必须写 migration 文件
- 禁止在组件里硬编码中文或英文文案，必须走 `useTranslations`
- 禁止把 middleware 放到项目根目录（项目用了 `src/`，根目录的 middleware 会被 Next.js 静默忽略）

### 三个 Supabase 客户端

```typescript
// Server Component / API Route 默认用这个：
// anon key + cookies，遵守 RLS，以登录用户身份查询
import { createClient } from '@/lib/db/supabase'
const supabase = await createClient()  // 注意 await

// 仅在确实需要绕过 RLS 时用（管理后台、跨用户操作等）：
import { createAdminClient } from '@/lib/db/supabase'
const admin = createAdminClient()      // 同步，无 cookies

// 客户端组件（'use client'）用这个：
import { createClient } from '@/utils/supabase-browser'
const supabase = createClient()        // 同步
```

### 写 API Route 的模式

```typescript
// src/app/api/reviews/route.ts
import { NextResponse } from 'next/server'
import { getReviews } from '@/lib/db/reviews'  // 数据库逻辑在 lib/db/
import { requireUser } from '@/lib/auth/session'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')
  const data = await getReviews(courseId)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()  // 抛 'Unauthorized' 如果未登录
    const body = await request.json()
    // 验证 + 写入（用 createClient() 拿 supabase 实例，自动以 user 身份执行）
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

### 写前端 hook 的模式

```typescript
// src/hooks/useReviews.ts
// 只调用 /api/ 路由，不 import lib/
export function useReviews(courseId: string) {
  const [reviews, setReviews] = useState([])
  useEffect(() => {
    fetch(`/api/reviews?courseId=${courseId}`)
      .then(r => r.json())
      .then(setReviews)
  }, [courseId])
  return reviews
}
```

### shadcn 组件改法

shadcn 不是库，组件代码就在 `src/components/ui/` 里，可以改。按改动大小走优先级：

| 优先级 | 场景 | 怎么做 |
|--------|------|--------|
| 1 | 单个用法定制 | `<Button className="..." variant="...">` |
| 2 | 全局配色 / 圆角 / 字体 | 改 [src/app/globals.css](src/app/globals.css) 的 CSS 变量（`--primary` 等） |
| 3 | 加项目级新 variant | 改 `ui/<component>.tsx` 里的 `VARIANTS` 常量 |
| 4 | 加业务行为（loading 按钮等） | 在 `components/common/` 新建包装组件 |

⚠️ 跑 `npx shadcn@latest add <component>` 重新添加会**覆盖** `ui/<component>.tsx` 修改。改了之后留好 git history。

### 写数据库查询函数的模式

```typescript
// src/lib/db/reviews.ts
import { createClient } from './supabase'

export async function getReviews(courseId: string) {
  const supabase = await createClient()  // 注意 await
  const { data, error } = await supabase
    .from('reviews')
    .select('*, users(anonymous_id), professors(name_en)')
    .eq('course_id', courseId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
```

### 认证约定（Google OAuth，仅限 @nyu.edu）

- 唯一入口 `/login`，一个 Google 登录按钮；**无注册表单、无密码体系、无验证邮件**
- 登录走前端 `supabase.auth.signInWithOAuth({ provider: 'google' })`，
  `queryParams` 带 `hd: 'nyu.edu'`（UX 提示，非安全防线）
- 域名强制在服务端：Supabase auth hook `hook_before_user_created` 拒绝非 @nyu.edu；
  `GET /api/auth/callback` 应用层再校验一次（`isAllowedEmail`，在 `src/lib/auth/validate.ts`）
- 回调失败跳 `/login?error=auth` 或 `/login?error=domain`，`LoginForm` 读 query 显示错误
- `/register` 和 `/reset-password` 路由保留为重定向到 `/login`（旧链接兼容）
- 首次登录自动建用户，数据库触发器生成 `anonymous_id`

## 数据库表速查

| 表名 | 主要字段 | 备注 |
|------|---------|------|
| users | id, email, anonymous_id, role | anonymous_id 是前端唯一可见身份 |
| courses | id, code, name_en, home_campus, major_required[], major_elective[], minor[], core_type[], is_general_elective, is_verified | UNIQUE (home_campus, code)；数组字段是筛选维度 |
| professors | id, name_en, is_verified | 保持最简 |
| course_professor | course_id, professor_id | 多对多中间表 |
| reviews | id, user_id, course_id, professor_id, semester, site, content_zh, content_en, is_visible | is_visible=false 为软删除；UNIQUE (user_id, course_id, professor_id, semester) |
| sites | id, name, code | MVP 不使用，字段预留 |

## 已知的扩展字段（现在不实现，不要填充逻辑）

- `courses.equivalent_id` — 海外课程等同映射

## 校验规则

- 邮箱必须以 `@nyu.edu` 结尾：服务端 auth hook 强制 + callback `isAllowedEmail()` 复核（`lib/auth/validate.ts`）
- `reviews` 的 `content_zh` 和 `content_en` 至少一个不为空，前端 `ReviewForm` 校验 + API 层复核
- `semester` 格式为 `"2024 Fall"` / `"2025 Spring"` / `"2025 Summer"` / `"2025 January"`（`lib/constants/semesters.ts`）
- `site` 不接受前端传值，后端自动取 `course.home_campus`

## 软删除规则

删除评价不用 DELETE，用：
```typescript
await supabase
  .from('reviews')
  .update({ is_visible: false })
  .eq('id', reviewId)
  .eq('user_id', currentUserId)  // 确保只能删自己的
```
