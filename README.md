# NYUSH Course Selection Guide

A course review and archive platform for NYU Shanghai: **anonymous, semi-closed (@nyu.edu only), cross-campus**.
Helps students see honest reviews from past cohorts before registering — and preserves those reviews for the long term.

🌐 Original document: **https://docs.google.com/document/d/1_46q2ZaguHqDbUTc0qgZt9BzO13IlvI1OLSGuiG0Pkg/edit?usp=sharing**

**Like it? Leave a ⭐ before you go!**

## Features

- 🔐 **Sign in with NYU Google account** — no passwords, no verification emails; signing in is registering; @nyu.edu domain enforced server-side
- 🕵️ **Anonymous reviews** — each user gets an 8-character anonymous ID (self-service regeneration); real emails are never shown anywhere on the site
- 🔍 **Course search and filtering** — search by course code / name / professor; multi-dimensional Major / Minor / Core / GE filters; sorted by review count by default
- 🌍 **16 campuses** — 3 degree-granting campuses + 13 study-away sites, switchable globally; reviews are automatically tagged with the campus attended
- 🔗 **Equivalent-course linking** — reviews for Data Structures in New York and its Shanghai equivalent are shown together; just enter the Shanghai course code when creating a course to link them
- ✍️ **Review system** — bilingual (Chinese/English) written reviews (30–5000 characters), upvotes/downvotes, editing, soft delete and restore
- 🈳 **Bilingual UI** — next-intl, URLs prefixed with `/zh` and `/en`
- 🛡️ **Abuse prevention** — per-user rate limits of ≤10 reviews and ≤5 new courses per hour; duplicate reviews blocked at the database level

## Tech Stack

Next.js 14 (App Router) · Supabase (Postgres + Auth + RLS) · Tailwind CSS + shadcn/ui · next-intl · Vercel

## Local Development

Prerequisites: Node 18+, Docker Desktop, [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```bash
git clone https://github.com/SihongShen/NYUSH-CSG.git && cd NYUSH-CSG
npm install
cp .env.example .env.local        # local dev keys work out of the box; see in-file comments for Google OAuth credentials
supabase start                    # start local Supabase (pulls images on first run)
supabase migration up             # apply database migrations (run whenever you pull new migrations)
npm run dev                       # http://localhost:3000
```

Common commands:

| Command | Purpose |
|---|---|
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (vitest) |
| `npm run test:db` | Database smoke tests (requires local Supabase running) |
| `supabase migration up` | Apply new migrations to the local database |

## Documentation

| Document | What it covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture decisions, file structure, boundary rules, database design, auth flow |
| [docs/FEATURES.md](docs/FEATURES.md) | UI / interactions / API calls for every page |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | Request/response contracts and error codes |
| [docs/AGENT_CONTEXT.md](docs/AGENT_CONTEXT.md) | Quick project context for AI coding assistants |
| [supabase/README.md](supabase/README.md) | Database workflow (CLI / migrations / RLS testing) |

## Contributing

- 🐛 **Report bugs / suggest features**: use the form templates in [Issues](https://github.com/SihongShen/NYUSH-CSG/issues/new/choose)
- 🔧 **Submit code**: full workflow in [CONTRIBUTING.md](CONTRIBUTING.md) — branch from `dev`, merge via PR (CI runs typecheck + test + build automatically)
- 🗃️ **Changes involving database migrations**: apply migrations with `supabase db push` first, then merge and deploy the code (never the other way around)
- 📜 Community guidelines are in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md); report security vulnerabilities through the private channel in [SECURITY.md](SECURITY.md)

## Deployment

Vercel (auto-deploys `main` via GitHub integration) + a Supabase cloud project. See the "Environment Variables" and "Auth Flow" sections of [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for environment variables and Auth configuration.

## License

[MIT](LICENSE)
