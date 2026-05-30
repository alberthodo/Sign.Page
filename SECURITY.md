# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| `main` on [Sign.Page](https://github.com/alberthodo/Sign.Page) | Yes |
| Other | No |

We recommend running the latest commit on `main` for self-hosted deployments.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately by opening a [GitHub Security Advisory](https://github.com/alberthodo/Sign.Page/security/advisories/new) on this repository, or contact the maintainer via GitHub.

Include:

- A description of the issue and impact
- Steps to reproduce (if applicable)
- Your suggested fix or mitigation (optional)

We aim to acknowledge reports within a few business days and will coordinate disclosure once a fix is available.

## Self-hosting notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; never prefix with `NEXT_PUBLIC_`.
- Rotate Supabase keys if you suspect exposure.
- Review [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security) whenever you customize `supabase/oss-schema.sql` or migrations.
