-- Project review links: approve / request changes on one folder at a time (no batch approve).

CREATE OR REPLACE FUNCTION public.approve_review_by_token(
  p_token text,
  p_signer_name text DEFAULT NULL,
  p_signature text DEFAULT NULL,
  p_target_folder_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_folder_id uuid;
  v_project_id uuid;
  v_target_folder_id uuid;
  v_name text;
  v_project_status public.project_status;
BEGIN
  v_name := trim(COALESCE(p_signer_name, ''));

  IF v_name = '' OR p_signature IS NULL OR trim(p_signature) = '' THEN
    RETURN false;
  END IF;

  SELECT rt.folder_id, rt.project_id
  INTO v_token_folder_id, v_project_id
  FROM public.review_tokens rt
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now());

  IF v_project_id IS NULL THEN
    RETURN false;
  END IF;

  v_target_folder_id := COALESCE(v_token_folder_id, p_target_folder_id);

  IF v_target_folder_id IS NULL THEN
    RETURN false;
  END IF;

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
    AND f.id = v_target_folder_id
    AND f.project_id = v_project_id
    AND (
      (v_token_folder_id IS NOT NULL AND f.id = rt.folder_id)
      OR (v_token_folder_id IS NULL AND p_target_folder_id IS NOT NULL AND f.id = p_target_folder_id)
    )
    AND f.visibility = 'public'::public.folder_visibility
    AND f.status = 'active'::public.project_status;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

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

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_item_notes_by_token(
  p_token text,
  p_notes jsonb,
  p_summary text DEFAULT NULL,
  p_target_folder_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_folder_id uuid;
  v_project_id uuid;
  v_folder_id uuid;
  v_note jsonb;
  v_block_id text;
  v_comment text;
  v_any boolean := false;
  v_summary text;
BEGIN
  v_summary := trim(COALESCE(p_summary, ''));

  IF p_notes IS NULL OR jsonb_typeof(p_notes) <> 'array' OR jsonb_array_length(p_notes) = 0 THEN
    IF v_summary = '' THEN
      RETURN false;
    END IF;
  END IF;

  SELECT rt.folder_id, rt.project_id
  INTO v_token_folder_id, v_project_id
  FROM public.review_tokens rt
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now());

  IF v_project_id IS NULL THEN
    RETURN false;
  END IF;

  v_folder_id := COALESCE(v_token_folder_id, p_target_folder_id);

  IF v_folder_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.project_folders f
    WHERE f.id = v_folder_id
      AND f.project_id = v_project_id
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'active'::public.project_status
  ) THEN
    RETURN false;
  END IF;

  FOR v_note IN SELECT value FROM jsonb_array_elements(COALESCE(p_notes, '[]'::jsonb))
  LOOP
    v_block_id := v_note->>'block_id';
    v_comment := trim(COALESCE(v_note->>'comment', ''));

    IF v_block_id IS NULL OR v_block_id = '' OR v_comment = '' THEN
      CONTINUE;
    END IF;

    PERFORM public.set_block_review_by_token(p_token, v_block_id, 'changes_requested', v_comment);
    v_any := true;
  END LOOP;

  IF v_summary <> '' THEN
    UPDATE public.project_folders
    SET client_feedback = v_summary
    WHERE id = v_folder_id;
    v_any := true;
  END IF;

  IF NOT v_any THEN
    RETURN false;
  END IF;

  PERFORM public.sync_folder_status_from_blocks(v_folder_id);
  PERFORM public.sync_project_row_from_folders(v_project_id);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_review_by_token(text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_review_by_token(text, text, text, uuid)
  TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_item_notes_by_token(text, jsonb, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_item_notes_by_token(text, jsonb, text, uuid)
  TO anon, authenticated, service_role;
