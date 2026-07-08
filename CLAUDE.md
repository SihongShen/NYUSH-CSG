# NYUSH-CSG

Before touching code, read in order:

1. **[docs/AGENT_CONTEXT.md](docs/AGENT_CONTEXT.md)** — quick reference for coding patterns (where files go, prohibited practices, Supabase client usage, table reference, validation rules)
2. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — the single source of truth for architecture decisions

Check [docs/API_CONTRACT.md](docs/API_CONTRACT.md) before changing endpoints and [docs/FEATURES.md](docs/FEATURES.md) before changing page behavior; update the corresponding doc after changing code.

Must pass before committing: `npm run typecheck && npm test`. All database changes go through `supabase/migrations/` (apply locally with `supabase migration up`).
