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
- 禁止手动修改 `src/components/ui/`（shadcn 管理）
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

### 登录页 UX 约定

- 唯一入口 `/login`，登录和注册用 `<Tabs>` 切换（不是分两个独立路由）
- NetID 输入框 + 固定后缀 `@nyu.edu`（用 flex 布局把后缀放右侧）
- 校验函数都在 `src/lib/auth/validate.ts`：
  - `isValidNetId(netid)` — 字母开头，2–15 位字母数字
  - `isValidPassword(pwd)` — 至少 8 位
  - `buildEmail(netid)` — 拼成 `<netid>@nyu.edu`
  - `isAllowedEmail(email)` — 后端再次复核 @nyu.edu 后缀
- 登录走前端 supabase 客户端；注册走 `POST /api/auth/register`（后端必须再校验一次邮箱后缀，前端校验可绕过）
- `/register` 和 `/reset-password` 路由保留为重定向到 `/login`

## 数据库表速查

| 表名 | 主要字段 | 备注 |
|------|---------|------|
| users | id, email, anonymous_id, role | anonymous_id 是前端唯一可见身份 |
| courses | id, code, name_en, name_zh, category, department, is_verified | category / department 是 MVP 筛选字段 |
| professors | id, name_en, is_verified | 保持最简 |
| course_professor | course_id, professor_id | 多对多中间表 |
| reviews | id, user_id, course_id, professor_id, semester, site, rating, difficulty, workload, content_zh, content_en, is_visible | is_visible=false 为软删除 |
| sites | id, name, code | MVP 不使用，字段预留 |

## 已知的扩展字段（现在不实现，不要填充逻辑）

- `courses.equivalent_id` — 海外课程等同映射

## 校验规则

- NetID 格式：`^[a-zA-Z][a-zA-Z0-9]{1,14}$`（字母开头，2–15 位字母数字）
- 邮箱必须以 `@nyu.edu` 结尾，前端拼接 + 后端 `POST /api/auth/register` 复核
- 密码至少 8 位（`MIN_PASSWORD_LENGTH` 常量在 `lib/auth/validate.ts`）
- `reviews` 的 `content_zh` 和 `content_en` 至少一个不为空，在前端 `ReviewForm` 里校验
- `rating / difficulty / workload` 都是 1-5 整数
- `semester` 格式为 `"2024 Fall"` 或 `"2025 Spring"`

## 软删除规则

删除评价不用 DELETE，用：
```typescript
await supabase
  .from('reviews')
  .update({ is_visible: false })
  .eq('id', reviewId)
  .eq('user_id', currentUserId)  // 确保只能删自己的
```
