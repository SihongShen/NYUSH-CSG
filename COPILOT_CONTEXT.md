# Copilot 上下文文档

> 把这个文件的内容粘贴到 Cursor 的 `.cursorrules`，或者在 GitHub Copilot Chat 里用 `#file` 引用它。
> 每次让 AI 生成代码前先引用这个文件。

---

## 这个项目是什么

NYU Shanghai 课程评价平台。Next.js 14 App Router + Supabase + Tailwind + shadcn/ui，部署在 Vercel。

## 你必须遵守的规则

### 文件放哪里

- 页面文件 → `src/app/(main)/` 或 `src/app/(auth)/`
- API 路由 → `src/app/api/`
- React 组件 → `src/components/` 下按功能分子目录（auth / course / review / layout）
- 数据库查询函数 → `src/lib/db/`
- 前端 hooks → `src/hooks/`
- TypeScript 类型 → `src/types/index.ts`

### 绝对禁止

- 禁止在 `components/` 或 `hooks/` 里 import `src/lib/` 的任何东西
- 禁止在前端使用 `SUPABASE_SERVICE_ROLE_KEY`
- 禁止手动修改 `src/components/ui/`（shadcn 管理）
- 禁止直接在 Supabase 控制台改表结构，必须写 migration 文件

### 两个 Supabase 客户端

```typescript
// 服务端（API Routes / Server Components）用这个
import { createClient } from '@/lib/db/supabase'

// 客户端组件（'use client'）用这个
import { createBrowserClient } from '@/utils/supabase-browser'
```

### 写 API Route 的模式

```typescript
// src/app/api/reviews/route.ts
import { getReviews } from '@/lib/db/reviews'  // 数据库逻辑在 lib/db/
import { getSession } from '@/lib/auth/session'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')
  const data = await getReviews(courseId)
  return Response.json(data)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  // 验证 + 写入
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
  const supabase = createClient()
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
- `users.role = 'admin'` — 管理员权限

## 校验规则

- 邮箱必须以 `@nyu.edu` 结尾，在 `POST /api/auth/register` 里校验
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
