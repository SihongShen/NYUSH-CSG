# NYUSH-CSG API 契约

> 所有 endpoint 在 `src/app/api/` 下。前端通过 `fetch('/api/...')` 调用；不经过 `[locale]` 前缀。
> 类型定义统一在 [`src/types/index.ts`](src/types/index.ts)。请求/响应 JSON 用 **snake_case** 对齐数据库列名。
> 通用错误格式：`ApiError { error: string; message?: string; fields?: string[] }`。

---

## 公共约定

| 项 | 约定 |
|----|------|
| Content-Type | 请求体 / 响应体均 `application/json` |
| 鉴权 | 通过 cookie 中的 Supabase session；服务端用 `requireUser()` 或 `getUser()` 拿当前用户 |
| 错误码 | HTTP 状态码语义化；body 中 `error` 字段是稳定 key（前端用于查 i18n） |
| 分页 | GET 列表接口支持 `?limit=&offset=`，默认 `limit=20, offset=0` |
| 时间字段 | ISO 8601 字符串（如 `2024-09-15T03:21:00.000Z`） |

### 通用错误码

| HTTP | error key | 含义 |
|------|-----------|------|
| 400 | `validation` | 字段校验失败，详见 `fields` |
| 401 | `unauthorized` | 未登录或 session 过期 |
| 403 | `forbidden` | 已登录但无权操作（如改别人的评价） |
| 404 | `not_found` | 资源不存在 |
| 409 | `conflict` | 业务冲突（如重复提交评价） |
| 500 | `internal` | 服务端异常 |

---

## Auth

### `POST /api/auth/register`
**Auth**: 公开  
**Body**: [`RegisterPayload`](src/types/index.ts) `{ netid, password }`  
**200**: `{ ok: true }`  
**400**: error ∈ `invalidNetid` / `passwordTooShort` / `emailNotAllowed` / Supabase 原始消息  
**业务规则**:
- netid 格式 `^[a-zA-Z][a-zA-Z0-9]{1,14}$`，密码 ≥ 8 位（`lib/auth/validate.ts`）
- 后端拼出 `${netid}@nyu.edu` 后再次复核域名（前端校验可绕过）
- 调用 `supabase.auth.signUp`，`emailRedirectTo` 指向 `/api/auth/callback`
- Supabase 异步发验证邮件；用户点链接后才真正激活

### `GET /api/auth/callback?code=...`
**Auth**: 公开（Supabase 回调）  
**Query**: `code` (string) — Supabase 发过来的一次性 code  
**302**: 重定向到 `/`  
**行为**: 调用 `exchangeCodeForSession(code)`，session cookie 写入浏览器

---

## Courses

### `GET /api/courses`
**Auth**: 需要登录  
**Query**: [`CourseSearchQuery`](src/types/index.ts) `{ q?, category?, department?, limit?, offset? }`  
**200**: `Paginated<Course>` — `{ items: Course[], total, limit, offset }`  
**业务规则**:
- 只返回 `is_verified = true` 的课程（管理员审核后才可见）
- `q` 模糊匹配 `code` / `name_en` / 关联教授名（ILIKE）
- TODO: 教授名联表查询的具体写法 —— 用 `lib/db/courses.ts` 封装

### `POST /api/courses`
**Auth**: 需要登录  
**Body**: [`CourseApplyPayload`](src/types/index.ts) `{ code, name_en, category?, core_type?, department?, professor_names[] }`  
**201**: `{ id }` — 新建课程 ID（`is_verified=false`，待管理员审核）  
**400**: `validation`（`code` / `name_en` 缺失，`category=Core` 时必须有 `core_type`）  
**409**: `conflict`（同 `code` + 同 `professor_names` 组合已存在）  
**业务规则**:
- 新建时 `is_verified=false`，不进搜索结果，只待管理员审核
- 同名教授若不存在则同时创建（`is_verified=false`）

### `GET /api/courses/[id]`
**Auth**: 需要登录  
**Params**: `id` (uuid)  
**200**: [`CourseDetail`](src/types/index.ts) — Course + `professors: Professor[]`  
**404**: 课程不存在或未审核  

---

## Reviews

### `GET /api/reviews`
**Auth**: 需要登录  
**Query**: [`ReviewListQuery`](src/types/index.ts) `{ course_id?, professor_id?, user_id?, limit?, offset? }`  
**200**: `Paginated<ReviewWithAuthor>`  
**403**: 当 `user_id` 不等于当前登录用户（不允许看别人"我的评价"）  
**业务规则**:
- 默认只返回 `is_visible = true` 的评价
- 当 `user_id = 当前用户` 时，也返回 `is_visible = false`（用户自己软删的）
- 排序：`created_at DESC`

### `POST /api/reviews`
**Auth**: 需要登录  
**Body**: [`ReviewCreatePayload`](src/types/index.ts)  
**201**: `{ id }`  
**400**: `validation`（详见下方业务规则）  
**409**: `conflict` — `UNIQUE (user_id, course_id, professor_id, semester)` 撞库  
**业务规则**:
- `rating` / `difficulty` / `workload` 均为 1-5 整数
- `content_zh` 和 `content_en` 至少一个非空非纯空白
- `semester` 格式 `"YYYY Fall"` / `"YYYY Spring"` / `"YYYY Summer"` / `"YYYY January"`
- `site` 当前用枚举 `'SH' | 'NY' | 'AD' | 'BUE' | 'BER' | 'FLO' | 'LON' | 'MAD' | 'PAR' | 'PRG' | 'SYD' | 'TEL' | 'WAS' | 'ACC'`（先放在校验函数里，不入库为枚举）
- `user_id` 强制取 session 用户，不接受前端传

### `PATCH /api/reviews/[id]`
**Auth**: 需要登录 + 评价归属本人  
**Params**: `id` (uuid)  
**Body**: [`ReviewUpdatePayload`](src/types/index.ts) — 只允许改 `rating` / `difficulty` / `workload` / `content_zh` / `content_en`  
**200**: `Review` — 更新后完整对象  
**403**: 评价不属于当前用户  
**404**: 评价不存在或已软删除  
**业务规则**:
- 不允许改 `course_id` / `professor_id` / `semester` / `site`（要改就删了重发）
- 服务端再次校验 content 非空规则

### `DELETE /api/reviews/[id]`
**Auth**: 需要登录 + 评价归属本人  
**Params**: `id` (uuid)  
**200**: `{ ok: true }`  
**403**: 评价不属于当前用户  
**404**: 评价不存在  
**业务规则**: **软删除** — `UPDATE reviews SET is_visible = false WHERE id = ? AND user_id = ?`，不真删行

---

## 待补充

- [ ] 课程详情页是否要把"该课所有评价"一起返回？（性能 vs 多一次请求）
- [ ] 评价点赞 / 举报 endpoint（MVP 不实现）
- [ ] 管理员审核 endpoint（`PATCH /api/admin/courses/:id` 等，等做 admin 后台时再加）
- [ ] 速率限制 / 防滥用策略（注册、提交评价）
- [ ] `site` 枚举的最终列表（先用宽松字符串，正式上线前定）
