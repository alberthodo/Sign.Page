# Sign.page

Open-source client review and approval for freelancers. Organize deliverables in **folders**, share **project** or **per-folder** review links, and collect signatures and feedback—clients never need an account.

Run on your own infrastructure with [Supabase](https://supabase.com) (Auth, Postgres, Storage). Full guide: **[docs/self-host.md](docs/self-host.md)**.

## Features

- **Dashboard** — Projects with status, attention banners, live refresh
- **Folders** — Public/hidden folders, draft vs published, per-folder client links
- **Content blocks** — Headings, text, and file blocks inside folders
- **Client review** — `/review/[token]` gallery, per-folder approve, signatures, block-level feedback
- **Auth** — Google and email for freelancers (project owners)
- **Storage** — `project-assets` bucket for uploads

## Prerequisites

- Node.js 20+
- Supabase project
- Supabase SQL Editor (or CLI) to run [`supabase/oss-schema.sql`](supabase/oss-schema.sql)

Optional: Docker — see [docs/self-host.md](docs/self-host.md).

## Quick start

### 1. Install

```bash
git clone https://github.com/alberthodo/Sign.Page.git
cd Sign.Page
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Yes | App URL for auth redirects and review links |
| `NEXT_PUBLIC_APP_NAME` | No | Display name (default `Sign.page`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Server-only; review fallbacks |

`SIGNOFF_EDITION=oss` (default). `/` redirects to `/login`.

### 3. Database

On a **new** Supabase project, run in the SQL Editor:

**[`supabase/oss-schema.sql`](supabase/oss-schema.sql)**

See **[docs/database.md](docs/database.md)** for migration history.

### 4. Supabase Auth

- Site URL: your `NEXT_PUBLIC_SITE_URL`
- Redirect URLs: `{SITE_URL}/auth/callback`
- Providers: Email; optionally Google

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → `/login` → `/dashboard`.

## Docker

```bash
cp .env.example .env
docker compose build
docker compose up -d
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |

## Sign.page Cloud (hosted)

A managed hosted version with marketing, trial, and billing is operated separately and is **not** part of this repository. This repo is the open-source application you run with your own Supabase project.

## Contributing & security

- **[Contributor guide](docs/contributing.md)** — how to report bugs, suggest features, and submit PRs
- [SECURITY.md](SECURITY.md)
- [CHANGELOG.md](CHANGELOG.md)

## License

MIT — [LICENSE](LICENSE). Branding assets are proprietary — [NOTICE](NOTICE).
