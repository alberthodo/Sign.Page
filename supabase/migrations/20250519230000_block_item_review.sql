-- Per content-block client review (comment + approve / request changes on each item)

CREATE OR REPLACE FUNCTION public.block_is_reviewable(p_block jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_block->>'type' = 'file' THEN true
    WHEN p_block->>'type' IN ('heading', 'text')
      AND length(trim(COALESCE(p_block->>'text', ''))) > 0 THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.jsonb_set_block_review(
  p_blocks jsonb,
  p_block_id text,
  p_status text,
  p_comment text
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN elem->>'id' = p_block_id AND public.block_is_reviewable(elem) THEN
          elem || jsonb_build_object(
            'review',
            jsonb_build_object(
              'status', p_status,
              'comment',
              CASE
                WHEN p_comment IS NULL OR trim(p_comment) = '' THEN NULL
                ELSE trim(p_comment)
              END,
              'reviewed_at', to_jsonb(now())
            )
          )
        ELSE elem
      END
      ORDER BY ord
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(COALESCE(p_blocks, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ord);
$$;

CREATE OR REPLACE FUNCTION public.jsonb_approve_all_block_reviews(p_blocks jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN public.block_is_reviewable(elem) THEN
          elem || jsonb_build_object(
            'review',
            jsonb_build_object(
              'status', 'approved',
              'comment', NULL,
              'reviewed_at', to_jsonb(now())
            )
          )
        ELSE elem
      END
      ORDER BY ord
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(COALESCE(p_blocks, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ord);
$$;

CREATE OR REPLACE FUNCTION public.sync_folder_status_from_blocks(p_folder_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blocks jsonb;
  v_reviewable integer := 0;
  v_approved integer := 0;
  v_changes integer := 0;
  v_latest_comment text;
  v_elem jsonb;
BEGIN
  SELECT content_blocks
  INTO v_blocks
  FROM public.project_folders
  WHERE id = p_folder_id;

  IF v_blocks IS NULL THEN
    RETURN;
  END IF;

  FOR v_elem IN SELECT value FROM jsonb_array_elements(v_blocks)
  LOOP
    IF NOT public.block_is_reviewable(v_elem) THEN
      CONTINUE;
    END IF;

    v_reviewable := v_reviewable + 1;

    IF COALESCE(v_elem->'review'->>'status', 'pending') = 'changes_requested' THEN
      v_changes := v_changes + 1;
      v_latest_comment := COALESCE(
        NULLIF(trim(v_elem->'review'->>'comment'), ''),
        v_latest_comment
      );
    ELSIF v_elem->'review'->>'status' = 'approved' THEN
      v_approved := v_approved + 1;
    END IF;
  END LOOP;

  IF v_reviewable = 0 THEN
    RETURN;
  END IF;

  IF v_changes > 0 THEN
    UPDATE public.project_folders
    SET
      status = 'changes_requested',
      client_feedback = v_latest_comment,
      approved_at = NULL
    WHERE id = p_folder_id;
  ELSIF v_approved = v_reviewable THEN
    UPDATE public.project_folders
    SET
      status = 'approved',
      approved_at = now(),
      client_feedback = NULL
    WHERE id = p_folder_id;
  ELSE
    UPDATE public.project_folders
    SET
      status = 'active',
      client_feedback = NULL,
      approved_at = NULL
    WHERE id = p_folder_id
      AND status <> 'draft';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_block_review_by_token(
  p_token text,
  p_block_id text,
  p_status text,
  p_comment text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_id uuid;
  v_project_id uuid;
  v_blocks jsonb;
  v_new_blocks jsonb;
BEGIN
  IF p_status NOT IN ('approved', 'changes_requested') THEN
    RETURN false;
  END IF;

  IF p_status = 'changes_requested' AND (p_comment IS NULL OR trim(p_comment) = '') THEN
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

  IF v_folder_id IS NULL THEN
    SELECT f.id, f.content_blocks
    INTO v_folder_id, v_blocks
    FROM public.project_folders f
    INNER JOIN public.review_tokens rt ON rt.project_id = f.project_id
    WHERE rt.token = p_token
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'active'::public.project_status
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(f.content_blocks, '[]'::jsonb)) elem
        WHERE elem->>'id' = p_block_id
      )
    ORDER BY f.sort_order ASC, f.created_at ASC
    LIMIT 1;
  ELSE
    SELECT f.content_blocks
    INTO v_blocks
    FROM public.project_folders f
    INNER JOIN public.review_tokens rt ON rt.project_id = f.project_id
    WHERE rt.token = p_token
      AND f.id = v_folder_id
      AND f.id = rt.folder_id
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'active'::public.project_status;
  END IF;

  IF v_folder_id IS NULL OR v_blocks IS NULL THEN
    RETURN false;
  END IF;

  v_new_blocks := public.jsonb_set_block_review(v_blocks, p_block_id, p_status, p_comment);

  IF v_new_blocks = v_blocks THEN
    RETURN false;
  END IF;

  UPDATE public.project_folders
  SET content_blocks = v_new_blocks
  WHERE id = v_folder_id;

  PERFORM public.sync_folder_status_from_blocks(v_folder_id);
  PERFORM public.sync_project_row_from_folders(v_project_id);
  RETURN true;
END;
$$;

-- Whole-folder approve also marks every reviewable block approved
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
  v_row record;
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
      content_blocks = public.jsonb_approve_all_block_reviews(f.content_blocks),
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

  FOR v_row IN
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
      client_feedback = NULL
    WHERE id = v_row.id;
  END LOOP;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  PERFORM public.sync_project_row_from_folders(v_project_id);
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.set_block_review_by_token(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_block_review_by_token(text, text, text, text)
  TO anon, authenticated, service_role;
