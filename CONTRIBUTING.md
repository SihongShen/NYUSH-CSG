# Contributing

Thanks for helping out with the NYUSH Course Selection Guide! This document covers the full workflow from environment setup to getting a PR merged.

## Before You Start

- **Report bugs / suggest features**: no code required — just use the [issue forms](https://github.com/SihongShen/NYUSH-CSG/issues/new/choose)
- **Read the docs before writing code**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (architecture and boundary rules) is the source of truth; if you use an AI coding assistant, have it read [docs/AGENT_CONTEXT.md](docs/AGENT_CONTEXT.md) first
- For large feature changes, open an issue to discuss first so no work goes to waste

## Environment Setup

See the [README](README.md#local-development). TL;DR: `npm install` → `cp .env.example .env.local` → `supabase start` → `supabase migration up` → `npm run dev`.

## Branching and PR Workflow

1. Branch off **`dev`** (`main` is protected and only accepts PRs)
2. Develop with commits split by feature and messages that clearly describe what changed
3. Run the checks locally before pushing:
   ```bash
   npm run typecheck && npm test
   ```
4. Open a PR (targeting `dev`) and fill in the PR template; CI automatically runs typecheck + test + build, and failing PRs won't be merged
5. After merging, maintainers merge `dev` → `main` to release when appropriate

## Hard Rules (violations will require rework)

- **No direct database access from the frontend**: components and hooks only call `/api/` routes; database logic lives in `src/lib/db/`
- **All database changes go through migrations**: create a new file in `supabase/migrations/`; never modify existing migrations or edit tables manually in the console
- **All copy goes through i18n**: add keys to both `messages/zh.json` and `en.json`; never hardcode Chinese or English text in components
- **Keep docs in sync with behavior changes**: update `docs/API_CONTRACT.md` when changing an endpoint, and `docs/FEATURES.md` when changing page behavior
- **Changes involving migrations**: describe the production impact in the PR description; when releasing, **apply the migration with `supabase db push` first, then deploy the code**

## Directory Quick Reference

| Location | What goes here |
|---|---|
| `src/app/[locale]/` | Pages (App Router, with i18n prefix) |
| `src/app/api/` | API routes (backend entry points) |
| `src/lib/db/` | Database query functions (server-side import only) |
| `src/components/` | React components (`ui/` is shadcn; modify per its rules) |
| `src/lib/constants/` | Constants and validation rules shared between frontend and backend |
| `supabase/migrations/` | Database schema changes |
| `docs/` | Project documentation |

If anything is unclear, just open an issue and ask.
