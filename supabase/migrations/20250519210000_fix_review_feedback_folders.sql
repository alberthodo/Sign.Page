-- Project-scoped approve/request must update published folders, not only the project row.
-- sync_project_row_from_folders derives project status from folders; updating only projects was undone on sync.

CREATE OR REPLACE FUNCTION public.approve_review_by_token(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_id uuid;
  v_project_id uuid;
  v_updated integer;
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
      approved_at = now(),
      client_feedback = NULL
    FROM public.review_tokens rt
    WHERE rt.token = p_token
      AND f.id = v_folder_id
      AND f.id = rt.folder_id
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'active'::public.project_status;

    PERFORM public.sync_project_row_from_folders(v_project_id);
    RETURN FOUND;
  END IF;

  UPDATE public.project_folders f
  SET
    status = 'approved',
    approved_at = now(),
    client_feedback = NULL
  WHERE f.project_id = v_project_id
    AND f.visibility = 'public'::public.folder_visibility
    AND f.status = 'active'::public.project_status;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  PERFORM public.sync_project_row_from_folders(v_project_id);
  RETURN v_updated > 0;
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
  v_updated integer;
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
      AND f.status = 'active'::public.project_status;

    PERFORM public.sync_project_row_from_folders(v_project_id);
    RETURN FOUND;
  END IF;

  UPDATE public.project_folders f
  SET
    status = 'changes_requested',
    client_feedback = v_notes
  WHERE f.project_id = v_project_id
    AND f.visibility = 'public'::public.folder_visibility
    AND f.status = 'active'::public.project_status;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  PERFORM public.sync_project_row_from_folders(v_project_id);
  RETURN v_updated > 0;
END;
$$;
