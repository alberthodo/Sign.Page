# Database schema

## Self-host (recommended)

New installations should run **[`supabase/oss-schema.sql`](../supabase/oss-schema.sql)** once in the Supabase SQL Editor. That file is the consolidated, final schema for OSS.

## Incremental migrations (contributors)

The files below are applied in **filename order** when developing against an existing database or using the Supabase CLI. They are the source history behind `oss-schema.sql`.

| # | File | Summary |
|---|------|---------|
| 1 | `20250519000000_initial_schema.sql` | Core tables: profiles, projects, assets, review tokens, RLS, project status enum. |
| 2 | `20250519100000_m2_storage.sql` | `project-assets` storage bucket and policies. |
| 3 | `20250519110000_review_token_rpc.sql` | `get_review_by_token` RPC (SECURITY DEFINER) for public review lookup. |
| 4 | `20250519120000_review_tokens_delete_policy.sql` | Lets project owners delete/regenerate review tokens. |
| 5 | `20250519130000_review_rpc_public.sql` | Client approve/request-changes via RPC + anon key (no service role on review page). |
| 6 | `20250519140000_project_metadata.sql` | Project `type` and `description` columns. |
| 7 | `20250519150000_project_folders.sql` | `project_folders` table, per-folder state, backfill default folder + move assets. |
| 8 | `20250519155000_ensure_project_folders.sql` | Repair migration if `project_folders` was missing or partial. |
| 9 | `20250519160000_review_folders_rpc.sql` | Review RPCs for project vs folder scope; public folders on project links. |
| 10 | `20250519170000_project_folders_title_to_name.sql` | Renames legacy `title` → `name` on folders. |
| 11 | `20250519180000_review_hide_draft_folders.sql` | Clients only see **published** folders on review links. |
| 12 | `20250519190000_folder_content_blocks.sql` | Ordered content blocks (heading, text, file) + RPC return shape updates. |
| 13 | `20250519210000_fix_review_feedback_folders.sql` | Project-scoped approve/request updates published folders correctly. |
| 14 | `20250519220000_realtime_review_tables.sql` | Realtime publication on review-related tables (dashboard sync). |
| 15 | `20250519230000_block_item_review.sql` | Per-block client comments and approve/request on each item. |
| 16 | `20250519240000_review_signature_and_notes.sql` | Signature on approval; batch notes on request changes. |
| 17 | `20250519250000_fix_partial_folder_approval.sql` | Project `approved` only when all public folders are approved. |
| 18 | `20250519260000_per_folder_review_actions.sql` | Project review links: approve/request changes one folder at a time. |

### Applying migrations locally

```bash
# With Supabase CLI linked to your project
supabase db push
```

After changing schema for OSS, regenerate or manually update `supabase/oss-schema.sql` so self-hosters stay in sync.
