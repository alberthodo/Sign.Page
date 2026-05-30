-- Scoped review tokens: allow sharing a subset of folders as one link.

ALTER TABLE public.review_tokens
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS allowed_folder_ids UUID[];

-- Backfill existing tokens.
UPDATE public.review_tokens
SET scope = CASE
  WHEN folder_id IS NOT NULL THEN 'folder'
  ELSE 'project'
END
WHERE scope IS NULL OR scope = '';

-- De-dupe project-wide tokens before enforcing uniqueness.
-- Keep the newest token per project; delete older duplicates.
DELETE FROM public.review_tokens rt
USING public.review_tokens newer
WHERE rt.scope = 'project'
  AND newer.scope = 'project'
  AND rt.project_id = newer.project_id
  AND rt.created_at < newer.created_at;

-- Replace the "one project link" uniqueness to only apply to true project-wide links.
DROP INDEX IF EXISTS public.review_tokens_one_project_link;
CREATE UNIQUE INDEX review_tokens_one_project_link
  ON public.review_tokens (project_id)
  WHERE scope = 'project';

-- Folder links stay one-per-folder.
DROP INDEX IF EXISTS public.review_tokens_one_per_folder;
CREATE UNIQUE INDEX review_tokens_one_per_folder
  ON public.review_tokens (folder_id)
  WHERE folder_id IS NOT NULL;

-- Update get_review_by_token to return scope and allowed_folder_ids.
DROP FUNCTION IF EXISTS public.get_review_by_token(text);
CREATE OR REPLACE FUNCTION public.get_review_by_token(p_token text)
RETURNS TABLE (
  token_id uuid,
  project_id uuid,
  folder_id uuid,
  scope text,
  allowed_folder_ids uuid[],
  token text,
  expires_at timestamptz,
  access_count integer,
  token_created_at timestamptz,
  id uuid,
  user_id uuid,
  title text,
  assets text[],
  status public.project_status,
  client_feedback text,
  approved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rt.id AS token_id,
    rt.project_id,
    rt.folder_id,
    rt.scope,
    rt.allowed_folder_ids,
    rt.token,
    rt.expires_at,
    rt.access_count,
    rt.created_at AS token_created_at,
    p.id,
    p.user_id,
    p.title,
    p.assets,
    p.status,
    p.client_feedback,
    p.approved_at,
    p.created_at,
    p.updated_at
  FROM public.review_tokens rt
  INNER JOIN public.projects p ON p.id = rt.project_id
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now());
$$;

REVOKE ALL ON FUNCTION public.get_review_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_review_by_token(text) TO service_role;

-- Update list_review_folders_by_token to respect allowed_folder_ids for selection links.
DROP FUNCTION IF EXISTS public.list_review_folders_by_token(text);
CREATE OR REPLACE FUNCTION public.list_review_folders_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  name text,
  assets text[],
  content_blocks jsonb,
  status public.project_status,
  client_feedback text,
  approved_at timestamptz,
  client_approved_by_name text,
  client_signature text,
  sort_order integer,
  visibility public.folder_visibility
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.name,
    f.assets,
    f.content_blocks,
    f.status,
    f.client_feedback,
    f.approved_at,
    f.client_approved_by_name,
    f.client_signature,
    f.sort_order,
    f.visibility
  FROM public.review_tokens rt
  INNER JOIN public.project_folders f ON f.project_id = rt.project_id
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now())
    AND f.visibility = 'public'::public.folder_visibility
    AND f.status <> 'draft'::public.project_status
    AND (
      (rt.scope = 'folder' AND rt.folder_id = f.id)
      OR (rt.scope = 'selection' AND rt.allowed_folder_ids IS NOT NULL AND f.id = ANY (rt.allowed_folder_ids))
      OR (rt.scope = 'project')
    )
  ORDER BY f.sort_order ASC, f.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.list_review_folders_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_review_folders_by_token(text) TO anon, authenticated, service_role;

