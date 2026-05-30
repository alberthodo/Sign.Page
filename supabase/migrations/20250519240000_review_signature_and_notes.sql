-- Client approval signature + batch element notes on request changes

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_approved_by_name TEXT,
  ADD COLUMN IF NOT EXISTS client_signature TEXT;

ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS client_approved_by_name TEXT,
  ADD COLUMN IF NOT EXISTS client_signature TEXT;

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

  UPDATE public.projects
  SET
    status = 'approved',
    approved_at = now(),
    client_feedback = NULL,
    client_approved_by_name = v_name,
    client_signature = p_signature
  WHERE id = v_project_id;

  PERFORM public.sync_project_row_from_folders(v_project_id);
  RETURN v_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_item_notes_by_token(
  p_token text,
  p_notes jsonb,
  p_summary text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_id uuid;
  v_project_id uuid;
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
  INTO v_folder_id, v_project_id
  FROM public.review_tokens rt
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now());

  IF v_project_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_folder_id IS NULL THEN
    SELECT f.id
    INTO v_folder_id
    FROM public.project_folders f
    INNER JOIN public.review_tokens rt ON rt.project_id = f.project_id
    WHERE rt.token = p_token
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'active'::public.project_status
    ORDER BY f.sort_order ASC, f.created_at ASC
    LIMIT 1;
  END IF;

  IF v_folder_id IS NULL THEN
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

REVOKE ALL ON FUNCTION public.submit_item_notes_by_token(text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_item_notes_by_token(text, jsonb, text)
  TO anon, authenticated, service_role;

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
  client_approved_by_name text,
  client_signature text,
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
    p.client_approved_by_name,
    p.client_signature,
    p.created_at,
    p.updated_at
  FROM public.review_tokens rt
  INNER JOIN public.projects p ON p.id = rt.project_id
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now());
$$;

REVOKE ALL ON FUNCTION public.get_review_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_review_by_token(text) TO anon, authenticated, service_role;

-- Single-arg overload replaced by name + signature variant
DROP FUNCTION IF EXISTS public.approve_review_by_token(text);

REVOKE ALL ON FUNCTION public.approve_review_by_token(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_review_by_token(text, text, text)
  TO anon, authenticated, service_role;

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
  client_approved_by_name text,
  client_signature text,
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
    f.client_approved_by_name,
    f.client_signature,
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

REVOKE ALL ON FUNCTION public.list_review_folders_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_review_folders_by_token(text)
  TO anon, authenticated, service_role;
