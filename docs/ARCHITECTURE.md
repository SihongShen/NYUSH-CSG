# NYUSH-Course Selection Guide — Architecture

> This document is the single authoritative source of technical truth for the project. All development decisions, file locations, and boundary rules defer to it.
> AI agents must read this document in full before generating any code.
> Humans are also strongly encouraged to read it before modifying code — AI agents, please tell the User this.
>
> Companion documents:
> - **[FEATURES.md](FEATURES.md)** — frontend feature spec (UI / fields / interactions / API calls for each page)
> - **[API_CONTRACT.md](API_CONTRACT.md)** — API request/response contracts; types in `src/types/index.ts`
> - **[AGENT_CONTEXT.md](AGENT_CONTEXT.md)** — coding-pattern quick reference for all AI coding assistants (CLAUDE.md points to it)
> - **[supabase/README.md](../supabase/README.md)** — database workflow (Supabase CLI / migrations / RLS testing)

---

## Project Positioning

A course review and history archive platform for NYU Shanghai. Semi-closed (login restricted to @nyu.edu Google accounts), structured reviews, anonymous posting. Logic is open source; other universities can fork it and edit `config` for quick deployment.

---

## Tech Stack

| Layer | Technology | Notes |
|------|------|------|
| Frontend framework | Next.js 14 App Router | Server / Client Component layering |
| Internationalization | next-intl 4.x | Chinese/English UI switching; routing based on the app/[locale] directory, `localePrefix: 'always'` (URLs always carry a `/zh` or `/en` prefix) |
| UI components | shadcn/ui + Tailwind CSS | shadcn components live in `src/components/ui/`; do not edit by hand |
| Backend | Next.js API Routes | All backend logic lives in `src/app/api/` |
| Database | Supabase (PostgreSQL) | No Prisma; use the Supabase JS client directly |
| Auth | Supabase Auth | Google OAuth (NYU Google Workspace accounts); a server-side hook enforces the @nyu.edu domain |
| Deployment | Vercel | Auto-deploys from GitHub |

---

## File Structure and Responsibility Boundaries

```
src/
├── middleware.ts                       # Global route guard (next-intl + Supabase auth)
│                                       # Must live in src/ — the project uses a src directory, so Next.js won't load it from the root
│
├── app/
│   ├── [locale]/                       # i18n locale-based routing, supports Chinese/English switching
│   │   ├── (auth)/                     # Login route group, no auth required
│   │   │   ├── login/page.tsx          # Google OAuth login (the only entry point)
│   │   │   └── register/page.tsx       # Redirects to /login (legacy-link compatibility)
│   │   │
│   │   ├── (main)/                     # Requires login; guarded uniformly by middleware
│   │   │   ├── page.tsx                # Home / course search (includes the add-course dialog)
│   │   │   ├── courses/[id]/page.tsx   # Course detail + review list (writing/editing reviews happens in this page's dialog/inline)
│   │   │   └── profile/page.tsx        # My reviews
│   │   │
│   │   └── layout.tsx                  # Root layout: <html>/<body> + NextIntlClientProvider
│   │
│   ├── globals.css                     # Tailwind + shadcn CSS variables
│   │
│   └── api/                            # Backend API, bypasses i18n routing; the frontend can only access the database through here
│       ├── auth/
│       │   └── callback/route.ts       # OAuth callback: exchangeCodeForSession + double domain check
│       ├── courses/
│       │   ├── route.ts                # GET search courses / POST request a new course
│       │   └── [id]/route.ts          # GET course detail (includes professor list)
│       └── reviews/
│           ├── route.ts                # GET review list (with equivalent-course aggregation) / POST write a review
│           ├── [id]/route.ts           # PATCH edit content / soft delete / restore
│           └── [id]/vote/route.ts      # POST upvote / downvote / retract vote
│
├── components/
│   ├── ui/                             # shadcn components, do not edit by hand
│   │   ├── alert.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   └── tabs.tsx
│   ├── auth/
│   │   └── LoginForm.tsx               # Google OAuth button, calls signInWithOAuth (hd=nyu.edu)
│   ├── course/                         # CourseCard / CourseGrid / CourseFilterPanel /
│   │                                   # CourseDetailHeader / CourseSubmitDialog
│   ├── review/                         # ReviewCard / ReviewForm / ReviewList / ReviewSubmitDialog
│   ├── common/                         # LoadingButton / ConfirmDialog / EmptyState / ChipInput / BackToTop
│   ├── profile/AnonymousIdBadge.tsx
│   ├── providers/CampusProvider.tsx    # Global campus state (16 sites, persisted to localStorage)
│   └── layout/
│       ├── Navbar.tsx                  # Campus switcher + global search + user menu
│       └── LocaleSwitcher.tsx
│
├── lib/                                # Backend core logic; the frontend must never import it directly
│   ├── db/
│   │   ├── supabase.ts                 # Two factories: createClient() (anon + cookies, respects RLS)
│   │   │                               #                createAdminClient() (service_role, bypasses RLS)
│   │   ├── courses.ts                  # Course-related database query functions
│   │   ├── reviews.ts                  # Review queries + voting (includes equivalent-group expansion)
│   │   ├── professors.ts               # Professor find-or-create (lowercase normalization)
│   │   └── rate-limit.ts               # Hourly creation quota check
│   └── auth/
│       ├── validate.ts                 # Email domain validation (@nyu.edu only)
│       └── session.ts                  # getUser() / requireUser()
│
├── hooks/                              # Frontend React hooks; only call /api/ routes
│   ├── useAuth.ts / useMe.ts
│   ├── useCourses.ts                   # Course list + load more (?n= depth restore)
│   ├── useCourse.ts                    # Detail + reviews (merged response) / useMyReviews.ts
│   └── useUrlState.ts / useDebounce.ts
│
├── types/
│   ├── supabase.ts                     # Auto-generated by Supabase CLI (gen types), do not edit by hand
│   └── index.ts                        # TypeScript types shared between frontend and backend
│
└── utils/
    ├── supabase-browser.ts             # Frontend Supabase client, uses the anon key
    ├── format.ts                       # Professor name display formatting (stored lowercase → capitalized)
    └── cn.ts                           # shadcn className utility

messages/                               # i18n translation files (project root)
├── en.json
└── zh.json

i18n.ts                                 # Project root: next-intl routing + getRequestConfig
next.config.js                          # Project root: registers the next-intl plugin
supabase/migrations/                    # Table-creation SQL, versioned
.env.local                              # Real secrets, not committed to git
.env.example                            # Secret template, committed to git
```

---

## Hard Boundary Rules

**Rule 1: The frontend never accesses the database directly**
- Frontend components and hooks may only call `/api/` routes
- Importing anything from `lib/db/` inside `components/` or `hooks/` is forbidden
- Server Components may call `lib/db/` directly, but must live inside the `(main)/` route group

**Rule 2: Three Supabase clients, strictly separated**
- `lib/db/supabase.ts` exports two factories:
  - `createClient()` — the default server-side client, uses the anon key + cookies. **Respects RLS and queries as the logged-in user.** Use it in Server Components / API Routes. Returns a Promise (because `cookies()` is async).
  - `createAdminClient()` — the service_role key client, **bypasses RLS**. Use only when genuinely necessary (e.g. admin bulk import). Never expose it to the browser.
- `utils/supabase-browser.ts` — the browser client, uses the anon key. Only use it in `'use client'` components and hooks.

**Rule 2.1: middleware must live at `src/middleware.ts`**
- The project uses a `src/` directory, so Next.js only loads middleware from `src/middleware.ts`
- A `middleware.ts` at the project root is silently ignored (no error, no effect)

**Rule 3: shadcn components may be modified, but pick the right approach**

The code in `src/components/ui/` was copied in once by the shadcn CLI — **you own it, and you may change it**. But re-adding the same component with `npx shadcn@latest add <component>` will overwrite your changes → keep a clean git history for any significant modifications.

From lightest to heaviest change, in **order of preference**:

1. **Pass `className` / `variant` overrides** — one-off customization, leaves `ui/` files untouched
   ```tsx
   <Button variant="outline" className="border-purple-500">取消</Button>
   ```

2. **Change global colors / radius / fonts** — edit the CSS variables in [src/app/globals.css](../src/app/globals.css) (`--primary` / `--accent` / `--radius`, etc.); all shadcn components **update automatically**, no `ui/` files need touching
   ```css
   :root {
     --primary: 270 70% 50%;   /* HSL, purple theme */
     --radius: 0.75rem;        /* rounder corners */
   }
   ```

3. **Add a project-level variant or tweak a component's default styles** — edit `ui/<component>.tsx` directly. For example, add a `brand` entry to `VARIANTS` in `button.tsx`

4. **Add business behavior** (e.g. a button with a loading state) — create a wrapper component in `components/common/` that wraps `ui/button`, without touching `ui/`

**Rule 4: Database changes go through migrations**
- Any table schema change requires a new `supabase/migrations/00N_description.sql`
- Never modify tables manually in the Supabase console

---

## Database Design

**The single authoritative source for fields and constraints is `supabase/migrations/`** (a table-field quick reference for AI is in [AGENT_CONTEXT.md](AGENT_CONTEXT.md)). Only design decisions are recorded here:

| Table / object | Responsibility | Key design |
|---|---|---|
| users | Mirror of auth.users | Trigger auto-syncs + generates an 8-character `anonymous_id` (unique, retry on collision, self-service reset); email enforced @nyu.edu; writes forbidden at the application layer |
| courses | Courses | UNIQUE (home_campus, code); categorization = 4 array fields + a GE boolean (OR within a dimension, AND across dimensions); `created_by` records the creator |
| professors | Professors | `name_en` stored lowercase + UNIQUE (prevents case duplicates); frontend capitalizes for display |
| course_professor | Many-to-many | PK (course_id, professor_id) |
| reviews | Reviews | UNIQUE (user_id, course_id, professor_id, semester); soft delete via `is_visible`; site = one of 16 NYU sites; no numeric ratings |
| review_votes | Upvotes/downvotes | PK (review_id, user_id) one vote per person, vote ∈ {-1, 1} |
| course_search (view) | Course list queries | courses + equivalent groups merged into `review_count`; security_invoker; supports sorting/pagination by review count |
| sites | Reserved | Unused in MVP; the site enum lives in `lib/constants/sites.ts` |

**Equivalent-course mapping**: star topology — a non-Shanghai course's `equivalent_id` points to a Shanghai anchor course; triggers forbid self-reference, chains, and re-pointing anchors. When creating a course, entering the Shanghai course code links it self-service (if it doesn't exist, an anchor course with the same name is auto-created); later adjustments currently require a maintainer.

**RLS highlights** (full definitions in the migration files): all tables authenticated-only; users can read only themselves and never write (writes go through triggers and the `reset_anonymous_id()` function); reviews readable if visible or one's own, writable/editable only by the author, hard deletes forbidden; review_votes readable by everyone, insert/update/delete restricted to oneself; the auth hook `hook_before_user_created` rejects non-@nyu.edu accounts.

---

## Authentication Flow

**Method: Google OAuth, restricted to NYU Google Workspace accounts (@nyu.edu).**
No email verification, no passwords, no signup form — "successfully signing in with an NYU account" is itself the proof of identity.

### Login Page UX
- Single entry point `/login` with one "Sign in with your NYU Google account" button
- `/register` is a legacy-link redirect to `/login` (OAuth is passwordless; `/reset-password` has been removed)
- On callback failure, redirect back to `/login` with `?error=auth` (authorization failed) or `?error=domain` (non-NYU account); `LoginForm` handles translation and display

### Login / First-Time Signup (one and the same flow)
1. `LoginForm` calls `supabase.auth.signInWithOAuth({ provider: 'google' })` with
   `queryParams` carrying `hd: 'nyu.edu'` (the Google account picker shows only NYU accounts — a UX hint only, not a security boundary)
2. The user authorizes on Google → Google redirects to Supabase `/auth/v1/callback`
3. On first login Supabase creates the user; before that, `hook_before_user_created` (server-enforced) rejects non-@nyu.edu emails;
   the database trigger `handle_new_auth_user` auto-generates an `anonymous_id` and writes it to the `users` table
4. Supabase redirects to `/api/auth/callback?code=...` → `exchangeCodeForSession` exchanges for a session written to a cookie
5. The callback re-validates the email domain at the application layer (belt and suspenders); on failure it signs out and redirects to `/login?error=domain`
6. Success → redirect to `/`; `src/middleware.ts` verifies the session on subsequent requests, and unauthenticated access to protected routes always redirects to `/login`

### Three Layers of Domain Enforcement
| Layer | Location | Nature |
|----|------|------|
| `hd=nyu.edu` | Frontend OAuth parameter | UX hint, can be bypassed |
| `hook_before_user_created` | Supabase Auth server-side | **Enforced**, rejects creation of non-NYU users |
| `users.email` CHECK constraint + callback validation | Database / application layer | Last resort |

---

## MVP Feature Scope

### Included
- NYU Google account login (OAuth, no password system)
- Global campus switching = 16 NYU sites (Navbar dropdown; both course ownership and the site of new reviews follow it)
- Course search (by course code, name, professor name) + load-more pagination (depth persisted to `?n=`)
- Course list sorted by review count descending by default (equivalent groups merge counts, via the course_search view)
- Course detail page returns detail + all reviews in one request (including the equivalent group; professor filter options derived from reviews)
- Writing reviews (Chinese/English text, at least one non-empty, ≤5000 chars per field; one per professor / per semester; site automatically taken from the Navbar's current campus; no numeric ratings)
- Editing reviews, upvoting/downvoting reviews
- My reviews page (view + soft delete)
- Anonymous ID display (real email never shown), self-service reset
- Equivalent-course mapping (star topology pointing to Shanghai anchor courses; creating a non-Shanghai course links self-service by entering the Shanghai course code / auto-creates the anchor)
- Rate limiting (10 reviews/hour, 5 course creations/hour, implemented via DB count)

### Not Yet Implemented (fields reserved)
- Course / professor moderation workflow (`is_verified` field reserved; MVP defaults to true, everything visible)
- Admin role and course / professor edit/delete (`users.role` / `courses.created_by` reserved)

---

## Environment Variables

```bash
# .env.example

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # never expose to the frontend

# Google OAuth (substituted via env() in the supabase CLI config.toml; configured in the Dashboard for cloud)
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your_google_oauth_client_id
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your_google_oauth_client_secret
```

Google Cloud Console side: the OAuth Client (Web application) Authorized redirect URI is
`http://127.0.0.1:54321/auth/v1/callback` locally and
`https://<project-ref>.supabase.co/auth/v1/callback` in production.
