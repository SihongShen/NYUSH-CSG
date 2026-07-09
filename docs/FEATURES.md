# FEATURES.md — NYUSH-CSG Frontend Feature Spec

> Describes what each page looks like, what users can do, and how it interacts with the backend.
> Companion docs: [API_CONTRACT.md](API_CONTRACT.md) (API contract) + [ARCHITECTURE.md](ARCHITECTURE.md) (routing / file locations).
>
> Each H2 is a page. Subsections follow a consistent structure:
> **Entry** / **Main UI** / **Fields / Validation** (if there's a form) / **Key Interactions** / **APIs Called** / **Empty / Error / Loading States** / **Open Questions**

---

## 1. `/login` — Login (Google OAuth)

**Entry**: Unauthenticated access to any route is redirected here by [middleware](../src/middleware.ts).

**Main UI**: A single centered card on a violet gradient background (deep violet top-left fading to light), with a mouse "wake" effect — moving the cursor leaves expanding ripple rings on a canvas layer (clicks splash a bigger one; disabled under prefers-reduced-motion). Inside the card, top to bottom:
- A 1.5px NYU-violet brand bar across the top edge
- Header: an "NYU" violet wordmark block + page title, subtitle below
- Chinese / EN language switcher as a small ghost button pinned to the card's top-right corner (reuses the Navbar's LocaleSwitcher)
- The "Sign in with your NYU Google account" button (outline style, inline-SVG Google logo) + "Only @nyu.edu accounts can sign in" hint
- A separator, then a three-item feature row (anonymous reviews / 16 campuses / equivalent courses) with icons
- Below the card: an acknowledgment link to the original course-selection doc maintained by students over the years (Google Docs, opens in a new tab)

No registration tab, no password fields — signing in is registering (a user record is auto-created on first login).

**Key Interactions**:
- Click the button → `supabase.auth.signInWithOAuth({ provider: 'google' })` (with `hd=nyu.edu`) → full-page redirect to Google authorization
- Authorization succeeds → Google → Supabase → `GET /api/auth/callback` → redirect to `/`
- Callback fails → redirect back to `/login?error=auth` (authorization failure) or `/login?error=domain` (non-NYU account); `LoginForm` reads the query and shows the corresponding `Alert`
- `/register` is a legacy-link compatibility redirect to `/login` (OAuth has no passwords; reset-password has been removed)

**Domain restriction**: The `hd` parameter is only a UX hint; enforcement happens server-side in `hook_before_user_created` (rejects non-@nyu.edu), with the callback re-validating at the application layer as a backstop.

**APIs Called**:
- Login: frontend `supabase.auth.signInWithOAuth()` (does not go through `/api`)
- OAuth callback: `GET /api/auth/callback`

**Empty / Error / Loading States**:
- Redirect initiation fails / callback errors: `Alert` shows "Sign-in failed, please try again" or "Only @nyu.edu accounts can sign in"
- While redirecting: button disabled + text changes to "Redirecting…"

---

## 2. `/` — Course Filter & Browse (Home)

**Entry**: Default landing page after login. Clicking the Navbar logo also returns here.

**Main UI**:
- Top Navbar (see [Cross-Page Conventions](#cross-page-conventions) at the end)
- Left column: filter panel (collapses into a top drawer on narrow screens)
- Right main area: search box + course card list

**Search** (global search box in the Navbar):
- Fuzzy match on `code` / `name_en` / associated professor names (ILIKE done on the backend)
- Submit on Enter; only updates the URL's `q` and **preserves the checked filters**; the input's content follows the URL (auto-syncs on forward/back navigation and logo clicks)

**Filters** (multi-select checkboxes; **OR within a dimension, AND across dimensions**; Major filtering matches required ∪ elective together):
- **Major** (matches required + elective combined)
- **Minor**
- **Core** (GPS / PoH / WAI and other subcategories)
- **General Elective** (single toggle)
- Campus is switched globally via the Navbar's CampusProvider (16 NYU sites, degree campuses first, study-away after); it is not in the filter panel

Filter state syncs to the URL query (e.g. `/?q=CSCI&major=CS,DS&core=GPS`) for sharing / browser back.

**Course card display**:
- Large text: `code`
- Subtitle: `name_en`
- Badges: major / minor / core_type / GE categories
- Corner badge: real review count, **merged across the equivalent-course group** (= 0 shows "No reviews yet")
- Click → `/courses/[id]`

**Key Interactions**:
- No results: EmptyState suggests adjusting filters / trying other keywords; an "Add course" button stays fixed at the top of the page (submits via dialog; campus follows the Navbar)

**APIs Called**:
- `GET /api/courses?q=&campus=&major=&minor=&core=&ge=&limit=20&offset=0`
- `q` matches course code / name / professor name simultaneously; items include `review_count`
- **Default sort: review count descending** (merged across equivalent-course groups), ties broken by course code alphabetically
- Pagination: a "Load more (N remaining)" button at the bottom of the list; offset accumulates and appends; the number of loaded items is written to the URL's `?n=` (replace), and returning from a detail page restores list depth per n (capped at 100); changing filters resets to the first page and clears n

**Empty / Error / Loading States**:
- Loading: skeleton cards
- No results: see "Key Interactions"
- Network error: main area EmptyState shows "Failed to load" (refresh the page to retry)

---

## 3. `/courses/[id]` — Course Detail + Reviews

**Entry**: From clicking a course card on `/`.

**Main UI** (three sections, top to bottom):

1. **Course info section**: back button, `code` as large heading, `name_en`, major / minor / core_type / GE badges, professor list, total review count (no quantitative rating), equivalent-course links (e.g. the same course at NY; clicking jumps to its detail page)
   - **Equivalent-course review aggregation**: the review list automatically includes reviews from other campuses' courses in the equivalent-course group, distinguished by each review's site label
2. **Review list section**: see "Sorting" below
3. **Write-review section**: see "Writing a Review" below

**Review list sorting / filtering**:
- Item 1: **the current user's own review** (pinned to the top, if any). Includes soft-deleted ones with `is_visible=false`, labeled "Deleted (visible only to you)" + a [Restore] button
- After that: others' reviews by `created_at DESC` (switchable to oldest first / semester ascending or descending)
- **Filter by professor**: options are derived from the loaded reviews (not the course's professor association table), so reviews aggregated from equivalent courses are filterable too; the filter only shows when there are ≥2 professors

Your own review has [Edit] [Delete] in its top-right corner; others' reviews don't.

**Write-review section**:
- User **has not reviewed this course** → large "Write a review" button at the bottom of the page → clicking expands an inline form
- User **has already reviewed** → the write-review section is hidden (to modify, click [Edit] on the pinned review)

**Review form fields / validation** (shared between write and edit; edit pre-fills):
- **Professor** dropdown, single-select: sourced from the course's associated professor list (stored lowercase, displayed title-cased); can also choose "New professor" and fill in `new_professor_name` (backend does find-or-create and associates it with the course)
- **Semester**: two dropdowns for year + season (Fall / Spring / Summer / January)
- **Campus**: not selected in the form — automatically taken from the Navbar's current global campus; the form shows a prominent purple dashed-border notice "This review will be marked as taken at **XX**; switch campus first if that's wrong"; for study-away, switch campus before writing the review
- **Review content**: two fields, Chinese / English, **at least one non-empty**; **≤ 5000 characters per field, no minimum** (validated on both frontend and backend; rules live in `lib/constants/reviews.ts`)
- rating / difficulty / workload quantitative metrics have been removed (MVP is text-only reviews; may be added back later)
- Submission returns 429 (over the 10-per-hour limit) → toast "Submitting too frequently"

**Key Interactions**:
- **Upvote / downvote**: 👍 / 👎 buttons + counts at the bottom of each review; click to vote, click again to retract, click the other to change vote (optimistic update, rolled back on failure); cannot vote on your own review (buttons disabled)
- Inline write-review form: successful submit → form collapses + the new review is inserted at the pinned top position + success toast
- Edit: click [Edit] → that review row turns into a form in place → save → back to read-only
- Delete: click [Delete] → confirmation dialog → PATCH `is_visible=false` → the review is grayed out but stays in the pinned position
- Restore: after soft delete, click [Restore] → PATCH `is_visible=true`
- Submission fails (e.g. 409 duplicate for the same semester) → Alert says "You've already reviewed this professor for this semester"

**APIs Called**:
- `GET /api/courses/[id]` **returns course info + all reviews in a single request** (includes the equivalent-course group; visible OR own is filtered by RLS)
- `POST /api/reviews` — create
- `PATCH /api/reviews/[id]` — edit / soft delete / restore
- `POST /api/reviews/[id]/vote` — upvote / downvote / retract
- The author's anonymous_id is included in results by the backend's `get_anonymous_id()` function (no separate frontend query needed)

**Empty / Error / Loading States**:
- Course 404: render "Course not found" + a "Back to home" button
- No reviews and the user hasn't written one either: show "No reviews yet, [write the first one]"
- Loading: 3 skeleton rows for the review list

---

## 4. `/profile` — My Reviews

**Entry**: [My Reviews] link on the right side of the Navbar.

**Main UI**:
- Top info card: shows "Your anonymous ID: **abc12345**" + copy button + a **"Get a new one" button** (resets the anonymous ID after confirmation; historical reviews immediately show the new ID; irreversible)
- Below: a list of **all** the current user's reviews (including soft-deleted ones)

**Each review shows**:
- Course code + name (clicking jumps to `/courses/[id]`)
- Professor / semester / campus (site shown with its full name)
- Full review content + upvote/downvote counts (your own review is not votable)
- Top-right corner: [Edit] / [Delete]
- Soft-deleted: entire row grayed out + a "Deleted (visible only to you)" label + a [Restore] button

**Key Interactions**:
- Click [Edit] → navigate to `/courses/[id]?focus=review` → that page auto-scrolls to your own review (edit inline via [Edit] there)
- Delete / restore: same behavior as on `/courses/[id]`

**APIs Called**:
- `GET /api/reviews?user_id=<self>` fetches all of the user's own reviews (including is_visible=false, permitted by RLS)

**Empty / Error / Loading States**:
- No reviews written yet: show "You haven't written any reviews yet" + a [Browse courses] button
- Loading: 3 skeleton rows
- Error: toast + retry button

---

## Cross-Page Conventions

### Navbar (shown on every page except `/login`)
- Left: **NYU + campus name dropdown** (switch among 16 sites); clicking NYU returns to `/`
- Center: global search box (submit on Enter, preserves filter params)
- Right: GitHub icon (links to the repository) · [Chinese / EN language switcher] · user menu (shows netid; expands to [Go to profile], feedback links [Report a bug] / [Suggest a feature] / [GitHub repository] — deep links to the issue forms — and [Sign out])

### Footer (all pages, incl. login)
- Left: © year + MIT License link
- Right: [Report a bug] · [Suggest a feature] · [GitHub] — all feedback is routed to the GitHub issue forms (deep links open the structured templates directly)

### Toasts
- Uses sonner (`components/ui/sonner.tsx`)
- Success: `toast.success` with short copy; error: `toast.error` + error reason

### Loading States
- List loading uses shadcn `Skeleton` skeletons
- Button while submitting: `LoadingButton` (disabled + text changes to "Submitting…")

### Error Pages
- 404: custom `not-found.tsx`, "Page not found · [Back to home]"
- 500: `error.tsx`, "Something went wrong, please try again later"

### i18n
- All copy goes through `useTranslations`; hardcoded Chinese or English is forbidden
- Default locale is zh; `messages/zh.json` and `en.json` keep keys in sync, with both Chinese and English copy fully maintained

### URL State Sync
- The search keyword + filter conditions on the filter page `/` are written to the URL query; state survives refresh / back navigation
- `/courses/[id]?focus=review` uses the query to trigger auto-scrolling to the user's own review
- The home page's loaded-item count is written to `?n=` (replace); list depth is restored on return

### Unauthenticated Handling
- middleware uniformly intercepts; unauthenticated requests are always 302'd to `/login`
- The frontend does **not** implement "show a login button when logged out" fallback UI (middleware is the sole guard)
