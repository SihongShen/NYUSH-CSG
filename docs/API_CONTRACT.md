# NYUSH-CSG API Contract

> All endpoints live under `src/app/api/`. The frontend calls them via `fetch('/api/...')`; they do not go through the `[locale]` prefix.
> Type definitions are centralized in [`src/types/index.ts`](../src/types/index.ts). Request/response JSON uses **snake_case** to match database column names.
> Common error format: `ApiError { error: string; message?: string; fields?: Record<string, string> }`
> (`fields` maps field name → error message, returned on validation failure).

---

## Common Conventions

| Item | Convention |
|----|------|
| Content-Type | `application/json` for both request and response bodies |
| Auth | Supabase session via cookies; server side uses `requireUser()` or `getUser()` to get the current user |
| Error codes | Semantic HTTP status codes; the `error` field in the body is a stable key (used by the frontend to look up i18n) |
| Pagination | Only `GET /api/courses` supports `?limit=&offset=` (default 20/0, limit capped at 100); review lists are returned in full |
| Time fields | ISO 8601 strings (e.g. `2024-09-15T03:21:00.000Z`) |

### Common Error Codes

| HTTP | error key | Meaning |
|------|-----------|------|
| 400 | `validation` | Field validation failed, see `fields` for details |
| 401 | `unauthorized` | Not logged in or session expired |
| 403 | `cannot_vote_own` | Logged in but not allowed to perform the action (currently only: voting on your own review). Note: editing/deleting someone else's review returns 404 based on updated row count, so resource existence is not exposed |
| 404 | `not_found` | Resource does not exist (or does not belong to the current user) |
| 409 | `duplicate` / `duplicate_code` | Business conflict (duplicate review / same course code on the same campus) |
| 429 | `rate_limited` | Hourly creation quota exceeded (reviews 10 / courses 5) |
| 500 | `internal` | Server error |

---

## Auth

Authentication method: **Google OAuth (@nyu.edu accounts only)**. There are no signup / password / password-reset endpoints —
the frontend calls `supabase.auth.signInWithOAuth({ provider: 'google' })` directly, and the user is created automatically on first login.
The domain restriction is enforced server-side by Supabase's `hook_before_user_created` (rejects non-@nyu.edu accounts).

### `GET /api/auth/callback?code=...`
**Auth**: Public (OAuth callback)  
**Query**: `code` (string) — one-time code sent by Supabase  
**302 success**: Redirects to `/` (`exchangeCodeForSession` writes the session cookie to the browser)  
**302 failure**: Redirects to `/login?error=auth` (missing code / exchange failed) or `/login?error=domain` (non-@nyu.edu account; the session has already been signed out)

### `GET /api/me`
**Auth**: Login required  
**200**: `{ id, email, anonymous_id }` — basic info for the current user (used by the profile page)  
**401**: `unauthorized`

### `POST /api/me/anonymous-id`
**Auth**: Login required  
**200**: `{ anonymous_id }` — the new anonymous ID after reset (`reset_anonymous_id()` security definer function, retries on collision)  
**401**: `unauthorized`  
**Behavior**: The displayed author of historical reviews switches to the new ID immediately (looked up live at display time, no snapshot stored); irreversible

---

## Courses

### `GET /api/courses`
**Auth**: Login required  
**Query**: `{ q?, campus?, major?, minor?, core?, ge?, limit?, offset? }`
(`major` / `minor` / `core` accept comma-separated multiple values; `ge=1` means only general electives; `campus` ∈ 16 NYU sites)  
**200**: `Paginated<CourseWithStats>` — `{ items: (Course & { review_count })[], total, limit, offset }`  
**Business rules**:
- Queries the `course_search` view (courses + `review_count` merged across equivalent-course groups, security_invoker so RLS applies)
- **Sort: `review_count` descending, then `code` alphabetically, then `id` as a final tiebreaker (total order, so offset pagination never duplicates/skips rows)**
- Returns all courses (no moderation filtering in MVP; the `is_verified` field is reserved for future use)
- `q` fuzzy-matches `code` / `name_en` / **associated professor names** (professor names are stored lowercase; matches are mapped back to courses via course_professor and merged into the OR)
- Filtering: OR within a dimension, AND across dimensions; Major matches `major_required ∪ major_elective`
- Default sort `code ASC`; `limit` capped at 100

### `POST /api/courses`
**Auth**: Login required  
**Body**: [`CourseApplyPayload`](../src/types/index.ts) `{ code, name_en, home_campus, major_required[], major_elective[], minor[], core_type[], is_general_elective, lecture_professors[], recitation_tas[], sh_equivalent_code? }`  
**201**: `{ id }` — ID of the newly created course (immediately visible in MVP)  
**400**: `validation` (missing `code` / `name_en` < 3 chars / invalid campus / no classification at all / no lecture professor), see `fields` for details  
**409**: `duplicate_code` + `existing_id` (same `code` already exists on the same campus; application-level dedup check + DB unique index as a concurrency backstop)  
**429**: `rate_limited` (max 5 courses per person per hour)  
**Business rules**:
- In the MVP, newly created courses are immediately visible with no moderation; `created_by` records the creator
- Lecture + recitation professors are merged and deduplicated; professor names are stored lowercase with find-or-create (unique index as a concurrency backstop)
- `sh_equivalent_code`: only accepted when `home_campus ≠ SH` (passing it for SH returns 400).
  If the code exists in the Shanghai catalog → set `equivalent_id` to link directly; if not → automatically create a Shanghai anchor course with the same name and classifications, then link

### `GET /api/courses/[id]`
**Auth**: Login required  
**Params**: `id` (uuid)  
**200**: [`CourseDetailWithReviews`](../src/types/index.ts) — Course + `professors[]` + `equivalents[]` (other members of the equivalent-course group, excluding itself) + **`reviews: ReviewWithAuthor[]` (all reviews across the equivalent-course group, in a single request)**  
**404**: Course does not exist  

---

## Reviews

### `GET /api/reviews?user_id=me`
**Auth**: Login required  
**Query**: `?user_id=me` — all reviews by the current user, including soft-deleted. (Reviews for a course are returned by `GET /api/courses/[id]`; there is no `course_id` branch.)  
**200**: `{ items: ReviewWithCourse[] }` (includes course code / name)  
**400**: `user_id_required` (missing/invalid `user_id`)  
**401**: `unauthorized` (not logged in)  
**Business rules**:
- Each item includes vote stats: `upvotes` / `downvotes` / `my_vote` (the current user's vote: 1 / -1 / 0)
- Visibility is controlled by RLS: rows with `is_visible = true`, or the user's own (including soft-deleted)
- Authors are displayed as `author_anonymous_id` (looked up via the `get_anonymous_id()` function; email is never exposed)
- Sort: `created_at DESC`

### `POST /api/reviews`
**Auth**: Login required  
**Body**: [`ReviewCreatePayload`](../src/types/index.ts) `{ course_id, professor_id? | new_professor_name?, semester, content_zh?, content_en? }`  
**201**: `{ id }`  
**400**: `validation` (see `fields` for details)  
**404**: `course_not_found`  
**409**: `duplicate` — hits the `UNIQUE (user_id, course_id, professor_id, semester)` constraint  
**429**: `rate_limited` (max 10 reviews per person per hour)  
**Business rules**:
- Exactly one of `professor_id` and `new_professor_name` is required; new professor names are stored lowercase with find-or-create and linked to the course
- Content validity (empty / too-long) is one rule set in `reviewContentError` (`lib/constants/reviews.ts`): at least one of `content_zh` / `content_en` non-empty, **each field ≤ 5000 chars (no minimum)**; same rules on PATCH edits
- `semester` format: `"YYYY Fall"` / `"YYYY Spring"` / `"YYYY Summer"` / `"YYYY January"`
- `site` is optional, one of the 16 NYU sites (the frontend automatically sends the current Navbar campus); defaults to `course.home_campus` if omitted
- `user_id` is always taken from the session user; values from the frontend are ignored

### `PATCH /api/reviews/[id]`
**Auth**: Login required + review must belong to the current user  
**Params**: `id` (uuid)  
**Body** (three mutually exclusive operations, dispatched by body content):
- `{ is_visible: false }` → soft delete
- `{ is_visible: true }` → restore
- `{ content_zh?, content_en? }` → edit content (at least one non-empty)

**200**: `{ ok: true }`  
**400**: `validation` (both fields empty when editing content)  
**404**: `not_found` (review does not exist or does not belong to the current user — determined by updated row count; 0 rows means 404)  
**Business rules**:
- Changing `course_id` / `professor_id` / `semester` / `site` is not allowed (delete and repost instead)
- There is no `DELETE` endpoint: hard deletes are rejected by RLS; all deletion goes through soft delete (`is_visible=false`)

### `POST /api/reviews/[id]/vote`
**Auth**: Login required  
**Params**: `id` (uuid)  
**Body**: `{ vote: 1 | -1 | 0 }` — 1 upvote / -1 downvote / 0 retract; one vote per person per review, changing a vote is an upsert  
**200**: `{ ok: true }`  
**400**: `validation` (vote is not 1/-1/0)  
**403**: `cannot_vote_own` (cannot vote on your own review)  
**404**: `not_found` (review does not exist or is not visible)
