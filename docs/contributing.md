# Contributor guide

## What is Sign.page?

Sign.page is open-source software for **client review and approval**. Freelancers organize deliverables in folders, share review links, and collect signatures and feedback—clients open a link in the browser without creating an account.

You run it with your own [Supabase](https://supabase.com) project (database, auth, file storage). See [self-host.md](./self-host.md) for installation.

Sign.page **Cloud** (hosted, with billing) is a separate product and is not built from this repository.

## What is this guide?

This guide is for anyone who wants to **contribute to Sign.page** on GitHub. It is updated as the project grows; if something is missing, open an issue or PR to improve it.

**Repository:** [github.com/alberthodo/Sign.Page](https://github.com/alberthodo/Sign.Page)

## How can I contribute?

You can help in several ways:

- **[Report a bug](https://github.com/alberthodo/Sign.Page/issues/new)** — something broken or confusing
- **[Suggest a feature](https://github.com/alberthodo/Sign.Page/issues/new)** — an idea for the product
- **[Start a discussion](https://github.com/alberthodo/Sign.Page/discussions)** — questions or design feedback
- **[Submit a PR](https://github.com/alberthodo/Sign.Page/pulls)** — code, docs, or fixes (see below)

For **security vulnerabilities**, do not open a public issue. See [SECURITY.md](../SECURITY.md).

---

## Submit a PR

### 1. Get set up locally

```bash
git clone https://github.com/alberthodo/Sign.Page.git
cd Sign.Page
npm install
cp .env.example .env.local
```

Fill in Supabase keys in `.env.local`, apply the database schema ([self-host.md](./self-host.md)), then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in at `/login`.

### 2. Before you open a pull request

```bash
npm run lint
npm run build
```

CI runs the same checks on pull requests to `main`.

### 3. Database changes

If your PR changes the schema:

- Add a new file under `supabase/migrations/`
- Update [`supabase/oss-schema.sql`](../supabase/oss-schema.sql) so new self-host installs stay in sync
- Document the migration in [database.md](./database.md)

### 4. Code guidelines

- Match existing patterns (Next.js App Router, server actions, UI components)
- Keep PRs focused; avoid unrelated refactors
- Use `getAppName()` for user-facing product name
- Do not change files in `public/branding/` unless a maintainer asked you to (proprietary assets — see [NOTICE](../NOTICE))
- Never commit `.env` files or secrets

---

## More documentation

- [self-host.md](./self-host.md) — install and configure
- [database.md](./database.md) — migrations
- [editions.md](./editions.md) — this repo vs hosted Cloud

Thank you for contributing.
