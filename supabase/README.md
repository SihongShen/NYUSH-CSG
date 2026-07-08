# Supabase Workflow

This directory manages the Postgres schema, RLS policies, triggers, and database functions for NYUSH-CSG.
**The SQL files are the source of truth; never modify tables or policies directly in the Supabase console UI.**

```
supabase/
├── config.toml              # Supabase CLI project config (generated on first init, committed to git)
├── migrations/              # All schema changes, ordered by timestamp
│   ├── 20250407000001_initial_schema.sql
│   └── 20260521000001_enable_rls.sql
└── README.md
```

---

## For Contributors (fixing code, adding features)

You do **not** need any accounts or keys from the project maintainers. A local Supabase environment is all you need.

### 1. Install Docker Desktop

```bash
brew install --cask docker
# If you don't have brew, install it first: https://brew.sh
# Or download the .dmg from https://www.docker.com
```
Open Docker.app after installing and wait for the tray icon to settle.

### 2. Install the Supabase CLI

```bash
brew install supabase/tap/supabase
# Or: npm install -g supabase
supabase --version  # verify
```

### 3. Start local Supabase (pulling images takes a few minutes the first time)

```bash
cd /Users/<path>/NYUSH-CSG
supabase start
```

Once started, it prints the local connection info (URL / anon key / service_role key). **These keys are the Supabase CLI's fixed development keys — identical for everyone locally**, so [.env.example](../.env.example) is already pre-filled and ready to use:

```bash
cp .env.example .env.local
```

### 4. Apply all migrations locally

```bash
supabase db reset
# Drops the local DB → runs all migrations in timestamp order → runs supabase/seed.sql (if present)
```

After it finishes, your local Postgres has the full schema + RLS policies + triggers.

### 5. Start the frontend

```bash
npm install
npm run dev
# Open http://localhost:3000/login
```

In summary: **full onboarding in 4 commands**

```bash
cp .env.example .env.local
supabase start
supabase db reset
npm run dev
```

---

## Everyday Command Reference

> For **local commands**, use the native `supabase` commands below directly. For **remote commands** (push / pull / diff / list / repair), you can use the [Makefile](../Makefile) in the project root to skip the long `--db-url` string — run `make help` for usage.

| Command | Purpose |
|------|------|
| `supabase start` | Start the local stack (Docker) |
| `supabase stop` | Stop containers, keep data |
| `supabase stop --no-backup` | Stop containers, delete data |
| `supabase status` | Show local stack URLs / keys |
| `supabase migration new <name>` | Create a new migration file |
| `supabase db reset` | Re-run all migrations locally from scratch (**most used — verifies your SQL is correct**) |
| `supabase db push` | Push new local migrations to the remote |
| `supabase db pull` | Diff remote changes back into a new migration |
| `supabase db diff` | Show differences between the local DB and migrations |

---

## RLS Testing Cookbook

### 1. List all current policies

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

### 2. Test as an "anonymous user" (everything should be denied)

In Studio's SQL Editor:

```sql
set local role anon;
select * from public.users;     -- expected: 0 rows (blocked by RLS)
select * from public.reviews;   -- expected: 0 rows (reviews policies require authenticated)
reset role;
```

### 3. Test as a "specific signed-in user"

```sql
-- Pretend the current user is user_id = 'aaaaaaaa-...'
set local role authenticated;
set local request.jwt.claims to '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

select * from public.reviews;
-- expected: all rows with is_visible=true plus the user's own rows (including soft-deleted)

insert into public.reviews (user_id, course_id, professor_id, semester, site, content_zh)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '...', '...', '2025 Spring', 'SH', '测试');
-- expected: fails — with_check requires user_id = auth.uid()

reset role;
```

### 4. Verify the anon key is actually blocked by the REST API

After starting the local stack, run this in the browser console:

```js
fetch('http://localhost:54321/rest/v1/users?select=*', {
  headers: { apikey: '<local anon key>' }
}).then(r => r.json()).then(console.log)
// expected: [] empty array
```

---

## Common Pitfalls

### Remote CLI commands can't connect behind a VPN / proxy

The CLI connects to the remote DB over **direct IPv6** by default (`db.<ref>.supabase.co:5432`). If your machine is running a VPN / proxy, IPv6 routing often breaks, producing:

```
failed to connect to postgres: ... tls error ... socket is not connected
```

Fix: use the Supabase **Session pooler** (IPv4) instead of the direct connection.

1. `cp .env.cli.example .env.cli`
2. In the Supabase Dashboard, top right **Connect** → **Session pooler** tab, copy the URI
3. Replace `[YOUR-PASSWORD]` in it with your database password (set when the project was created)
4. Paste it after `SUPABASE_DB_URL=` in `.env.cli`

`.env.cli` is gitignored and won't be committed. Once configured, use the [Makefile](../Makefile) in the project root:

```bash
make list      # check migration alignment
make push      # push migrations
make diff      # show schema diff
make repair MIG=20260521000001
```

Without `.env.cli`, the `make` commands automatically skip the `--db-url` flag and fall back to the CLI's default direct connection. So if your IPv6 network is fine, you can ignore this entirely.

### Docker is slow on M1/M2 Macs
The first `supabase start` image pull is very slow and memory-hungry. Give Docker Desktop at least 4GB of memory (Settings → Resources).

### Changed production without recording a migration
Someone edited a policy in the Supabase console → local schema drifts from production. Fix:

```bash
supabase db pull
# Diffs the remote changes into a new migration file
# Review it, then commit it to git
```

Going forward, the rule is: **only change SQL files, never the console**.

### Migration ordering got mixed up
The CLI sorts by timestamp. If you hand-write file names (like `003_xxx.sql`), mixing them with timestamps makes the ordering unpredictable. **Always generate files with `supabase migration new`** — never name them by hand.

### Local and production anon keys differ
The local key is a fixed value (printed by the CLI, same for everyone); production keys are generated per Supabase project.
- `.env.local` uses the local key (pre-filled in `.env.example`)
- Production deployments use your own Supabase project's key (copy it from console Settings → API)

### `db reset` wipes test data too
That's expected behavior. To keep seed data, put it in `supabase/seed.sql` — it runs automatically after every reset.

---

## Standard Workflow for a PR

1. `supabase migration new <describe-the-intent>` — create the new file
2. Edit the SQL until done
3. `supabase db reset` — re-run everything locally from scratch to verify
4. Test that the policies behave as expected with Studio / psql
5. Make the corresponding application code changes (e.g. a new endpoint)
6. `git add . && git commit && git push`
7. Once the PR passes → `supabase db push` to production (or let CI do it)

Remember: **every SQL change corresponds to one migration file, every migration file does one thing, and the file name reveals the intent**.
