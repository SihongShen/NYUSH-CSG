# Agent Context Document

> This file is a quick-reference project context for **all AI coding assistants** (Claude Code / Cursor / Copilot / Codex, etc.).
> Read it in full before generating code; the authoritative source for architecture decisions is [ARCHITECTURE.md](ARCHITECTURE.md),
> the API contract is in [API_CONTRACT.md](API_CONTRACT.md), and page behavior is in [FEATURES.md](FEATURES.md).
> How to load it: Claude Code references it automatically via CLAUDE.md; for Cursor paste it into `.cursorrules`; for Copilot Chat reference it with `#file`.

---

## What This Project Is

A course review platform for NYU Shanghai. Next.js 14 App Router + Supabase (Auth + Postgres) + next-intl 4.x + Tailwind + shadcn/ui, deployed on Vercel. All routes live under `[locale]`, with URLs like `/zh/...` or `/en/...`.

## Rules You Must Follow

### Where Files Go

- Middleware → `src/middleware.ts` (**must be inside src/**, not the project root)
- Page files → `src/app/[locale]/(main)/` or `src/app/[locale]/(auth)/`
- API routes → `src/app/api/` (no locale prefix)
- React components → subdirectories under `src/components/` by feature (ui / auth / course / review / layout)
- Database query functions → `src/lib/db/`
- Frontend hooks → `src/hooks/`
- TypeScript types → `src/types/index.ts`
- i18n strings → `messages/zh.json` + `messages/en.json` (keep keys in sync)

### Absolutely Forbidden

- Never import anything from `src/lib/` inside `components/` or `hooks/`
- Never use `SUPABASE_SERVICE_ROLE_KEY` on the frontend
- Don't casually edit `src/components/ui/` (see the "How to Modify shadcn Components" section below and follow the tiers)
- Never change table schemas directly in the Supabase console; always write a migration file
- Never hardcode Chinese or English copy in components; always go through `useTranslations`
- Never put middleware in the project root (the project uses `src/`, so root-level middleware is silently ignored by Next.js)

### The Three Supabase Clients

```typescript
// Default for Server Components / API Routes:
// anon key + cookies, respects RLS, queries as the logged-in user
import { createClient } from '@/lib/db/supabase'
const supabase = await createClient()  // note: await

// Only when you genuinely need to bypass RLS (admin backend, cross-user operations, etc.):
import { createAdminClient } from '@/lib/db/supabase'
const admin = createAdminClient()      // synchronous, no cookies

// For client components ('use client'):
import { createClient } from '@/utils/supabase-browser'
const supabase = createClient()        // synchronous
```

### API Route Pattern

```typescript
// src/app/api/reviews/route.ts
import { NextResponse } from 'next/server'
import { getReviews } from '@/lib/db/reviews'  // database logic lives in lib/db/
import { requireUser } from '@/lib/auth/session'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')
  const data = await getReviews(courseId)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()  // throws 'Unauthorized' if not logged in
    const body = await request.json()
    // validate + write (use createClient() to get a supabase instance that runs as the user)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

### Frontend Hook Pattern

```typescript
// src/hooks/useReviews.ts
// only calls /api/ routes, never imports lib/
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

### How to Modify shadcn Components

shadcn is not a library — the component code lives in `src/components/ui/` and can be edited. Follow this priority order based on the size of the change:

| Priority | Scenario | What to do |
|--------|------|--------|
| 1 | One-off customization at a call site | `<Button className="..." variant="...">` |
| 2 | Global colors / border radius / fonts | Edit the CSS variables (`--primary`, etc.) in [src/app/globals.css](../src/app/globals.css) |
| 3 | Add a project-level new variant | Edit the `VARIANTS` constant in `ui/<component>.tsx` |
| 4 | Add business behavior (loading buttons, etc.) | Create a wrapper component in `components/common/` |

⚠️ Re-running `npx shadcn@latest add <component>` will **overwrite** your changes to `ui/<component>.tsx`. Keep good git history after modifying.

### Database Query Function Pattern

```typescript
// src/lib/db/reviews.ts
import { createClient } from './supabase'

export async function getReviews(courseId: string) {
  const supabase = await createClient()  // note: await
  const { data, error } = await supabase
    .from('reviews')
    .select('*, professors(id, name_en)')   // the users table is locked down by RLS and cannot be joined;
    .eq('course_id', courseId)              // look up the author's anonymous ID via rpc('get_anonymous_id')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
```

### Auth Conventions (Google OAuth, @nyu.edu only)

- Single entry point `/login` with one Google sign-in button; **no signup form, no password system, no verification emails**
- Login goes through the frontend `supabase.auth.signInWithOAuth({ provider: 'google' })`,
  with `queryParams` carrying `hd: 'nyu.edu'` (a UX hint, not a security boundary)
- Domain enforcement is server-side: the Supabase auth hook `hook_before_user_created` rejects non-@nyu.edu accounts;
  `GET /api/auth/callback` validates again at the application layer (`isAllowedEmail`, in `src/lib/auth/validate.ts`)
- On callback failure, redirect to `/login?error=auth` or `/login?error=domain`; `LoginForm` reads the query and shows the error
- The `/register` route is kept as a redirect to `/login` (legacy link compatibility; `/reset-password` has been removed)
- The user is created automatically on first login; a database trigger generates `anonymous_id`

## Database Table Quick Reference

| Table | Key columns | Notes |
|------|---------|------|
| users | id, email, anonymous_id, role | anonymous_id is the only identity visible on the frontend |
| courses | id, code, name_en, home_campus, major_required[], major_elective[], minor[], core_type[], is_general_elective, is_verified, equivalent_id, created_by | UNIQUE (home_campus, code); equivalent_id points star-style at the Shanghai anchor course (triggers prevent cycles/chains) |
| professors | id, name_en, is_verified | **name_en stored lowercase + UNIQUE**; use `formatProfessorName()` (utils/format.ts) for display |
| course_professor | course_id, professor_id | many-to-many join table |
| reviews | id, user_id, course_id, professor_id, semester, site, content_zh, content_en, is_visible | is_visible=false means soft-deleted; UNIQUE (user_id, course_id, professor_id, semester) |
| review_votes | review_id, user_id, vote(±1) | PK (review_id, user_id), one vote per person per review |
| course_search (view) | courses.* + review_count | used for course list queries; counts merged across equivalent groups, security_invoker, sortable by review count |
| sites | id, name, code | unused in MVP; the site enum lives in lib/constants/sites.ts (16 sites) |

## Known Reserved Fields (do not implement now, do not add logic for them)

- `users.role` / `courses.created_by` — admin role and course edit/delete (future admin backend)
- `courses.is_verified` / `professors.is_verified` — moderation flow

## Validation Rules

- Email must end with `@nyu.edu`: enforced by the server-side auth hook + re-checked in the callback via `isAllowedEmail()` (`lib/auth/validate.ts`)
- At least one of `content_zh` and `content_en` on `reviews` must be non-empty; validated in the frontend `ReviewForm` + re-checked at the API layer
- Review content length: combined (after trim) ≥ 30 characters, each field ≤ 5000 — the rules and validation functions live in `lib/constants/reviews.ts`, shared by frontend and backend
- Anonymous ID reset goes through `POST /api/me/anonymous-id` → `rpc('reset_anonymous_id')` (direct writes to the users table are forbidden)
- Course detail `GET /api/courses/[id]` returns `reviews[]` merged in; the frontend detail page makes only one request (useCourse)
- `semester` format: `"2024 Fall"` / `"2025 Spring"` / `"2025 Summer"` / `"2025 January"` (`lib/constants/semesters.ts`)
- Campus (`CampusCode`) = 16 NYU sites, switched globally via the Navbar (CampusProvider); both course `home_campus` and review `site` use it; use `siteName()` (`lib/constants/sites.ts`) to display a site code
- `GET /api/courses` items are `CourseWithStats` (adds `review_count`, merged across equivalent-course groups)
- `site` is automatically set by the frontend to the current Navbar campus (validated with `isValidSite`); defaults to `course.home_campus` if omitted
- Non-Shanghai course creation may include `sh_equivalent_code`: if the Shanghai course exists it is linked, otherwise a Shanghai anchor course is auto-created (`lib/db/courses.ts`)
- Professor names are `lower(trim())`-ed before writing; find-or-create always goes through `lib/db/professors.ts`
- Rate limits: 10 reviews/hour, 5 courses/hour (`lib/db/rate-limit.ts`, implemented via DB count); exceeding returns 429 `rate_limited`

## Soft Delete Rule

Deleting a review does not use DELETE; use:
```typescript
await supabase
  .from('reviews')
  .update({ is_visible: false })
  .eq('id', reviewId)
  .eq('user_id', currentUserId)  // ensures users can only delete their own
```
