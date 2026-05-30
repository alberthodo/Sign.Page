-- Ordered folder content: headings, text, and file blocks

ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.project_folders f
SET content_blocks = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id',
        gen_random_uuid()::text,
        'type',
        'file',
        'url',
        a
      )
      ORDER BY ord
    )
    FROM unnest(f.assets) WITH ORDINALITY AS t(a, ord)
  ),
  '[]'::jsonb
)
WHERE content_blocks = '[]'::jsonb
  AND COALESCE(array_length(f.assets, 1), 0) > 0;

-- Return type changed (added content_blocks); must drop before recreate
DROP FUNCTION IF EXISTS public.list_review_folders_by_token(text);

CREATE FUNCTION public.list_review_folders_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  name text,
  assets text[],
  content_blocks jsonb,
  status public.project_status,
  client_feedback text,
  approved_at timestamptz,
  sort_order integer
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
    f.sort_order
  FROM public.review_tokens rt
  INNER JOIN public.project_folders f ON f.project_id = rt.project_id
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now())
    AND f.visibility = 'public'::public.folder_visibility
    AND f.status <> 'draft'::public.project_status
    AND (
      (rt.folder_id IS NULL)
      OR (rt.folder_id = f.id)
    )
  ORDER BY f.sort_order ASC, f.created_at ASC;
$$;
