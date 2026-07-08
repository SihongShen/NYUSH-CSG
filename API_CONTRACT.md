# NYUSH-CSG API 契约

> 所有 endpoint 在 `src/app/api/` 下。前端通过 `fetch('/api/...')` 调用；不经过 `[locale]` 前缀。
> 类型定义统一在 [`src/types/index.ts`](src/types/index.ts)。请求/响应 JSON 用 **snake_case** 对齐数据库列名。
> 通用错误格式：`ApiError { error: string; message?: string; fields?: Record<string, string> }`
> （`fields` 是 字段名 → 错误文案 的映射，校验失败时返回）。

---

## 公共约定

| 项 | 约定 |
|----|------|
| Content-Type | 请求体 / 响应体均 `application/json` |
| 鉴权 | 通过 cookie 中的 Supabase session；服务端用 `requireUser()` 或 `getUser()` 拿当前用户 |
| 错误码 | HTTP 状态码语义化；body 中 `error` 字段是稳定 key（前端用于查 i18n） |
| 分页 | 仅 `GET /api/courses` 支持 `?limit=&offset=`（默认 20/0，limit 上限 100）；评价列表一次性全量返回 |
| 时间字段 | ISO 8601 字符串（如 `2024-09-15T03:21:00.000Z`） |

### 通用错误码

| HTTP | error key | 含义 |
|------|-----------|------|
| 400 | `validation` | 字段校验失败，详见 `fields` |
| 401 | `unauthorized` | 未登录或 session 过期 |
| 403 | `cannot_vote_own` | 已登录但无权操作（目前仅：给自己的评价投票）。注：改/删别人的评价按更新行数返回 404，不暴露资源是否存在 |
| 404 | `not_found` | 资源不存在（或不属于当前用户） |
| 409 | `duplicate` / `duplicate_code` | 业务冲突（重复评价 / 同校区同课号） |
| 429 | `rate_limited` | 超出每小时创建配额（评价 10 / 课程 5） |
| 500 | `internal` | 服务端异常 |

---

## Auth

认证方式：**Google OAuth（仅限 @nyu.edu 账号）**。无注册 / 密码 / 重置密码接口——
前端直接调 `supabase.auth.signInWithOAuth({ provider: 'google' })`，首次登录自动建用户。
域名限制由 Supabase 服务端 `hook_before_user_created` 强制（拒绝非 @nyu.edu）。

### `GET /api/auth/callback?code=...`
**Auth**: 公开（OAuth 回调）  
**Query**: `code` (string) — Supabase 发过来的一次性 code  
**302 成功**: 重定向到 `/`（`exchangeCodeForSession` 把 session cookie 写入浏览器）  
**302 失败**: 重定向到 `/login?error=auth`（无 code / 交换失败）或 `/login?error=domain`（非 @nyu.edu 账号，session 已被 signOut）

### `GET /api/me`
**Auth**: 需要登录  
**200**: `{ id, email, anonymous_id }` — 当前用户基本信息（profile 页用）  
**401**: `unauthorized`

### `POST /api/me/anonymous-id`
**Auth**: 需要登录  
**200**: `{ anonymous_id }` — 重置后的新匿名 ID（`reset_anonymous_id()` security definer 函数，碰撞重试）  
**401**: `unauthorized`  
**行为**: 历史评价的作者展示即时切换为新 ID（展示时实时反查，不存快照），不可撤销

---

## Courses

### `GET /api/courses`
**Auth**: 需要登录  
**Query**: `{ q?, campus?, major?, minor?, core?, ge?, limit?, offset? }`
（`major` / `minor` / `core` 为逗号分隔多值；`ge=1` 表示只看通识选修；`campus` ∈ 16 个 NYU site）  
**200**: `Paginated<CourseWithStats>` — `{ items: (Course & { review_count })[], total, limit, offset }`  
**业务规则**:
- 查 `course_search` 视图（courses + 等同课组合并的 `review_count`，security_invoker RLS 生效）
- **排序：`review_count` 降序，同数按 `code` 字母序**
- 返回所有课程（MVP 不做审核过滤；`is_verified` 字段保留供未来扩展）
- `q` 模糊匹配 `code` / `name_en` / **关联教授名**（教授名小写存储，匹配后经 course_professor 反查课程并入 OR）
- 筛选：同维度 OR、跨维度 AND；Major 匹配 `major_required ∪ major_elective`
- 默认排序 `code ASC`；`limit` 上限 100

### `POST /api/courses`
**Auth**: 需要登录  
**Body**: [`CourseApplyPayload`](src/types/index.ts) `{ code, name_en, home_campus, major_required[], major_elective[], minor[], core_type[], is_general_elective, lecture_professors[], recitation_tas[], sh_equivalent_code? }`  
**201**: `{ id }` — 新建课程 ID（MVP 立即可见）  
**400**: `validation`（`code` 缺失 / `name_en` < 3 字符 / 校区不合法 / 无任何分类 / 无 lecture 教授），详见 `fields`  
**409**: `duplicate_code` + `existing_id`（同校区同 `code` 已存在；应用层查重 + DB 唯一索引兜底并发）  
**429**: `rate_limited`（每人每小时最多 5 门）  
**业务规则**:
- MVP 阶段新建课程立即可见，不做审核；`created_by` 记录建课人
- lecture + recitation 教授合并去重；教授名小写存储 find-or-create（唯一索引兜底并发）
- `sh_equivalent_code`：仅 `home_campus ≠ SH` 时接受（SH 传了报 400）。
  上海库里有该课号 → 直接设 `equivalent_id` 关联；没有 → 自动建一门同名同分类的上海锚点课再关联

### `GET /api/courses/[id]`
**Auth**: 需要登录  
**Params**: `id` (uuid)  
**200**: [`CourseDetailWithReviews`](src/types/index.ts) — Course + `professors[]` + `equivalents[]`（等同课组成员，不含自己）+ **`reviews: ReviewWithAuthor[]`（含等同课组全部评价，一次请求）**  
**404**: 课程不存在  

---

## Reviews

### `GET /api/reviews`
**Auth**: 需要登录  
**Query**: `?course_id=<uuid>`（一门课的评价）或 `?user_id=me`（当前用户所有评价，含软删）  
**200**: `{ items: ReviewWithAuthor[] }`（course_id 分支）/ `{ items: ReviewWithCourse[] }`（user_id=me 分支，带课程 code / name）  
**400**: `course_id_required`（两个参数都没给）  
**401**: `unauthorized`（`user_id=me` 但未登录）  
**业务规则**:
- **等同课聚合**：course_id 分支自动展开等同课组（锚点 + 全部成员），返回整组评价，前端靠 `site` 区分来源
- 每条附带投票统计：`upvotes` / `downvotes` / `my_vote`（当前用户的票：1 / -1 / 0）
- 可见性由 RLS 控制：`is_visible = true` 的或本人的（含软删）
- 作者以 `author_anonymous_id` 显示（`get_anonymous_id()` 函数反查，不泄露邮箱）
- 排序：`created_at DESC`

### `POST /api/reviews`
**Auth**: 需要登录  
**Body**: [`ReviewCreatePayload`](src/types/index.ts) `{ course_id, professor_id? | new_professor_name?, semester, content_zh?, content_en? }`  
**201**: `{ id }`  
**400**: `validation`（详见 `fields`）  
**404**: `course_not_found`  
**409**: `duplicate` — `UNIQUE (user_id, course_id, professor_id, semester)` 撞库  
**429**: `rate_limited`（每人每小时最多 10 条）  
**业务规则**:
- `professor_id` 和 `new_professor_name` 二选一必填；新教授名小写存储 find-or-create 并关联到课程
- `content_zh` 和 `content_en` 至少一个非空非纯空白；**合计（trim 后）≥ 30 字符、单栏 ≤ 5000**（`lib/constants/reviews.ts`，PATCH 改内容同规则）
- `semester` 格式 `"YYYY Fall"` / `"YYYY Spring"` / `"YYYY Summer"` / `"YYYY January"`
- `site` 可选，16 个 NYU site 之一（前端自动带 Navbar 当前校区）；不传默认 `course.home_campus`
- `user_id` 强制取 session 用户，不接受前端传

### `PATCH /api/reviews/[id]`
**Auth**: 需要登录 + 评价归属本人  
**Params**: `id` (uuid)  
**Body**（三种操作互斥，按 body 内容分发）:
- `{ is_visible: false }` → 软删
- `{ is_visible: true }` → 恢复
- `{ content_zh?, content_en? }` → 改内容（至少一个非空）

**200**: `{ ok: true }`  
**400**: `validation`（改内容时两个都为空）  
**404**: `not_found`（评价不存在或不属于当前用户——按更新行数判断，0 行即 404）  
**业务规则**:
- 不允许改 `course_id` / `professor_id` / `semester` / `site`（要改就删了重发）
- 没有 `DELETE` 接口：真删被 RLS 拒绝，删除一律走软删（`is_visible=false`）

### `POST /api/reviews/[id]/vote`
**Auth**: 需要登录  
**Params**: `id` (uuid)  
**Body**: `{ vote: 1 | -1 | 0 }` — 1 赞 / -1 踩 / 0 撤票；每人每评价一票，改票 upsert  
**200**: `{ ok: true }`  
**400**: `validation`（vote 不是 1/-1/0）  
**403**: `cannot_vote_own`（不能给自己的评价投票）  
**404**: `not_found`（评价不存在或不可见）