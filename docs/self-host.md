# Self-host Sign.page

Run Sign.page on your own infrastructure with **bring-your-own Supabase**. The app needs Supabase for Auth, Postgres (RLS), Storage, and RPCs—a plain Postgres container is not enough.

**Time:** ~20–30 minutes on a fresh machine (Supabase project + one schema file + app).

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 20+** | For local dev or running migrations via CLI |
| **Docker** (optional) | For `docker compose up` |
| **Supabase project** | [supabase.com](https://supabase.com) free or paid tier |
| **Supabase SQL Editor** | To run the OSS bootstrap script (CLI optional) |

---

## Step 1 — Create a Supabase project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Note the **project ref** (Settings → General).
3. Copy from **Project Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only; recommended)

---

## Step 2 — Configure environment

From the repo root:

```bash
cp .env.example .env
```

Edit `.env` (Compose and local dev read this; for Next dev you can also use `.env.local`):

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com   # or http://localhost:3000
NEXT_PUBLIC_APP_NAME=Sign.page
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_GITHUB_REPO_URL=https://github.com/alberthodo/Sign.Page
SIGNOFF_EDITION=oss
```

`/` redirects to `/login`. Sign.page Cloud (hosted) is a separate product — not built from this repository.

---

## Step 3 — Set up the database (one file)

OSS installs use a **single bootstrap script** with the final schema—not the 18 incremental files under `supabase/migrations/` (those exist for core development and upgrades on existing databases).

**File:** [`supabase/oss-schema.sql`](../supabase/oss-schema.sql)

### Option A — Supabase SQL Editor (recommended for OSS)

1. Open your project → **SQL Editor** → **New query**.
2. Paste the full contents of `supabase/oss-schema.sql`.
3. Click **Run**.

Run it **once** on an empty project. If objects already exist, you will get errors—do not re-run on a populated database.

### Option B — Supabase CLI + psql

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db execute --file supabase/oss-schema.sql
```

(If your CLI version uses a different execute command, run the file via `psql` with the connection string from **Project Settings → Database**.)

### What the bootstrap includes

The script is the **end state** after the incremental migration history (not a blind merge). It reflects how the app actually works today:

| Area | Included |
|------|----------|
| **Core tables** | `profiles`, `projects`, `project_folders`, `review_tokens` |
| **Folders** | `name`, `visibility`, `content_blocks`, per-folder status, signatures |
| **Review links** | One project link + one link per folder (partial unique indexes) |
| **Storage** | `project-assets` bucket + RLS policies |
| **Client RPCs** | Token lookup, folder list (published only), per-folder approve + signature, block notes |
| **Sync logic** | Project status derived from folders; partial approval does not mark project approved |
| **Realtime** | `projects` and `project_folders` on `supabase_realtime` |

Omitted on purpose (only needed when upgrading old installs): legacy `title`→`name` repair, duplicate-token cleanup, and backfill inserts that created default folders from flat `projects.assets`.

### Contributors / existing databases

If you are hacking on this repo and already use `supabase db push`, keep using `supabase/migrations/*`. Do **not** run `oss-schema.sql` on that database.

### Verify

In the SQL editor:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'projects', 'project_folders', 'review_tokens');
```

You should see all four tables. Check functions:

```sql
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND proname = 'approve_review_by_token';
```

---

## Step 4 — Supabase Auth and URLs

In the dashboard → **Authentication → URL configuration**:

| Setting | Value |
|---------|--------|
| **Site URL** | Same as `NEXT_PUBLIC_SITE_URL` |
| **Redirect URLs** | `https://your-domain.com/auth/callback` (and `http://localhost:3000/auth/callback` for local dev) |

**Providers** (Authentication → Providers):

- **Email** — enable; for dev you may disable “Confirm email” to avoid rate limits.
- **Google** — optional; add OAuth client ID/secret from Google Cloud Console.

Clients reviewing work **do not** sign in—they use `/review/[token]` only.

---

## Step 5 — Run the app

### Option A — Node (development or simple prod)

```bash
npm install
npm run build
npm run start
```

Open `NEXT_PUBLIC_SITE_URL` (default [http://localhost:3000](http://localhost:3000)). Sign in at `/login`, create a project on `/dashboard`, add folders, publish, and share folder or project client links.

### Option B — Docker Compose

`NEXT_PUBLIC_*` values are embedded at **image build** time. Build with your `.env` loaded:

```bash
docker compose build
docker compose up -d
```

The app listens on **port 3000**. Logs:

```bash
docker compose logs -f web
```

Rebuild after changing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SITE_URL`, or other public env vars.

---

## Step 6 — Smoke test

1. **Freelancer:** `/login` → create project → upload assets → create folders → **Publish** folder(s).
2. **Client:** Open project or **folder** review link → approve or request changes (per folder if multiple are published).
3. **Regenerate link:** From dashboard, regenerate token; old link should stop working.

---

## Operations notes

- **Backups:** Use Supabase project backups; the app does not store files outside Supabase Storage.
- **Upgrades:** Pull new git tags. If the release notes include SQL changes, apply the documented delta (or re-read `supabase/oss-schema.sql` release notes for greenfield). Contributors upgrading dev DBs use `supabase db push`.
- **Service role key:** Recommended for some server fallbacks (see `src/lib/review.ts`); client review works with anon key + RPC after bootstrap.
---

## Troubleshooting

| Issue | Check |
|-------|--------|
| Build fails in CI/Docker | Set placeholder or real `NEXT_PUBLIC_SUPABASE_*` at build time |
| Review page empty | `oss-schema.sql` ran successfully; folders **published** |
| Auth redirect loop | Site URL and `/auth/callback` in Supabase match `NEXT_PUBLIC_SITE_URL` |
| Upload fails | `project-assets` bucket exists (created by bootstrap) |
| SQL errors on re-run | Bootstrap is for empty projects only; use incremental migrations for upgrades |

---

## Related docs

- [README](../README.md) — quick start
- [editions.md](./editions.md) — OSS repo vs hosted Cloud
