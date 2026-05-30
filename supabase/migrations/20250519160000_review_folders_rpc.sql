-- Review RPCs: project vs folder scope, public folders on project links

CREATE OR REPLACE FUNCTION public.sync_project_row_from_folders(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assets text[];
  v_status public.project_status;
  v_feedback text;
  v_has_active boolean;
  v_has_changes boolean;
  v_public_count integer;
  v_approved_count integer;
BEGIN
  SELECT COALESCE(array_agg(a ORDER BY f.sort_order, f.created_at), '{}')
  INTO v_assets
  FROM public.project_folders f
  CROSS JOIN LATERAL unnest(f.assets) AS a
  WHERE f.project_id = p_project_id;

  SELECT EXISTS (
    SELECT 1 FROM public.project_folders f
    WHERE f.project_id = p_project_id
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'changes_requested'
  ) INTO v_has_changes;

  SELECT EXISTS (
    SELECT 1 FROM public.project_folders f
    WHERE f.project_id = p_project_id
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'active'
  ) INTO v_has_active;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE f.status = 'approved')::integer
  INTO v_public_count, v_approved_count
  FROM public.project_folders f
  WHERE f.project_id = p_project_id
    AND f.visibility = 'public'::public.folder_visibility;

  IF v_has_changes THEN
    v_status := 'changes_requested';
    SELECT f.client_feedback INTO v_feedback
    FROM public.project_folders f
    WHERE f.project_id = p_project_id
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'changes_requested'
      AND f.client_feedback IS NOT NULL
    ORDER BY f.updated_at DESC
    LIMIT 1;
  ELSIF v_has_active THEN
    v_status := 'active';
    v_feedback := NULL;
  ELSIF v_public_count > 0 AND v_public_count = v_approved_count THEN
    v_status := 'approved';
    v_feedback := NULL;
  ELSE
    SELECT p.status, p.client_feedback
    INTO v_status, v_feedback
    FROM public.projects p
    WHERE p.id = p_project_id;
  END IF;

  UPDATE public.projects
  SET
    assets = COALESCE(v_assets, '{}'),
    status = v_status,
    client_feedback = v_feedback
  WHERE id = p_project_id;
END;
$$;

DROP FUNCTION IF EXISTS public.get_review_by_token(text);

CREATE OR REPLACE FUNCTION public.get_review_by_token(p_token text)
RETURNS TABLE (
  token_id uuid,
  project_id uuid,
  folder_id uuid,
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
GRANT EXECUTE ON FUNCTION public.get_review_by_token(text) TO anon, authenticated, service_role;

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
    AND (
      (rt.folder_id IS NULL)
      OR (rt.folder_id = f.id)
    )
  ORDER BY f.sort_order ASC, f.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.list_review_folders_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_review_folders_by_token(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.approve_review_by_token(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_id uuid;
  v_project_id uuid;
BEGIN
  SELECT rt.folder_id, rt.project_id
  INTO v_folder_id, v_project_id
  FROM public.review_tokens rt
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now());

  IF v_project_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_folder_id IS NOT NULL THEN
    UPDATE public.project_folders f
    SET
      status = 'approved',
      approved_at = now()
    FROM public.review_tokens rt
    WHERE rt.token = p_token
      AND f.id = v_folder_id
      AND f.id = rt.folder_id
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'active';

    PERFORM public.sync_project_row_from_folders(v_project_id);
    RETURN FOUND;
  END IF;

  UPDATE public.projects p
  SET
    status = 'approved',
    approved_at = now()
  FROM public.review_tokens rt
  WHERE rt.token = p_token
    AND p.id = rt.project_id
    AND rt.folder_id IS NULL
    AND p.status = 'active';

  PERFORM public.sync_project_row_from_folders(v_project_id);
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_changes_by_token(
  p_token text,
  p_feedback text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_id uuid;
  v_project_id uuid;
  v_notes text;
BEGIN
  v_notes := trim(p_feedback);

  IF v_notes = '' THEN
    RETURN false;
  END IF;

  SELECT rt.folder_id, rt.project_id
  INTO v_folder_id, v_project_id
  FROM public.review_tokens rt
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now());

  IF v_project_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_folder_id IS NOT NULL THEN
    UPDATE public.project_folders f
    SET
      status = 'changes_requested',
      client_feedback = v_notes
    FROM public.review_tokens rt
    WHERE rt.token = p_token
      AND f.id = v_folder_id
      AND f.id = rt.folder_id
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'active';

    PERFORM public.sync_project_row_from_folders(v_project_id);
    RETURN FOUND;
  END IF;

  UPDATE public.projects p
  SET
    status = 'changes_requested',
    client_feedback = v_notes
  FROM public.review_tokens rt
  WHERE rt.token = p_token
    AND p.id = rt.project_id
    AND rt.folder_id IS NULL
    AND p.status = 'active';

  PERFORM public.sync_project_row_from_folders(v_project_id);
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_review_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_changes_by_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_review_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_changes_by_token(text, text) TO anon, authenticated, service_role;
