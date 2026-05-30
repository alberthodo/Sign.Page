-- Clients only see published folders (not draft) on review links

CREATE OR REPLACE FUNCTION public.list_review_folders_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  name text,
  assets text[],
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
