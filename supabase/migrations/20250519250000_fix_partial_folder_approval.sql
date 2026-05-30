-- Project status should be "approved" only when every public folder is approved,
-- not when the client approves one folder or one active milestone on a project link.

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
  ELSIF v_approved_count > 0 THEN
    -- Some folders approved, others still draft / waiting — project stays open
    v_status := 'active';
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
    client_feedback = v_feedback,
    approved_at = CASE WHEN v_status = 'approved' THEN COALESCE(approved_at, now()) ELSE NULL END
  WHERE id = p_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_review_by_token(
  p_token text,
  p_signer_name text DEFAULT NULL,
  p_signature text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_id uuid;
  v_project_id uuid;
  v_updated integer;
  v_name text;
  v_project_status public.project_status;
BEGIN
  v_name := trim(COALESCE(p_signer_name, ''));

  IF v_name = '' OR p_signature IS NULL OR trim(p_signature) = '' THEN
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
      content_blocks = public.jsonb_approve_all_block_reviews(f.content_blocks),
      status = 'approved',
      approved_at = now(),
      client_feedback = NULL,
      client_approved_by_name = v_name,
      client_signature = p_signature
    FROM public.review_tokens rt
    WHERE rt.token = p_token
      AND f.id = v_folder_id
      AND f.id = rt.folder_id
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'active'::public.project_status;

    PERFORM public.sync_project_row_from_folders(v_project_id);
    RETURN FOUND;
  END IF;

  FOR v_folder_id IN
    SELECT f.id
    FROM public.project_folders f
    WHERE f.project_id = v_project_id
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'active'::public.project_status
  LOOP
    UPDATE public.project_folders
    SET
      content_blocks = public.jsonb_approve_all_block_reviews(content_blocks),
      status = 'approved',
      approved_at = now(),
      client_feedback = NULL,
      client_approved_by_name = v_name,
      client_signature = p_signature
    WHERE id = v_folder_id;
  END LOOP;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  PERFORM public.sync_project_row_from_folders(v_project_id);

  SELECT p.status INTO v_project_status
  FROM public.projects p
  WHERE p.id = v_project_id;

  IF v_project_status = 'approved' THEN
    UPDATE public.projects
    SET
      client_approved_by_name = v_name,
      client_signature = p_signature,
      approved_at = COALESCE(approved_at, now())
    WHERE id = v_project_id;
  END IF;

  RETURN v_updated > 0;
END;
$$;
