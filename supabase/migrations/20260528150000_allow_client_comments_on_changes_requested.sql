-- Clients may add pinned notes on deliverables awaiting review or already marked changes requested.

CREATE OR REPLACE FUNCTION public.add_review_message_by_token(
  p_token text,
  p_block_id text,
  p_body text,
  p_client_name text DEFAULT NULL,
  p_target_folder_id uuid DEFAULT NULL,
  p_anchor_x real DEFAULT NULL,
  p_anchor_y real DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_token_folder_id uuid;
  v_folder_id uuid;
  v_block_id text;
  v_body text;
  v_name text;
  v_thread_id uuid;
  v_message_id uuid;
  v_ax real;
  v_ay real;
BEGIN
  v_block_id := trim(COALESCE(p_block_id, ''));
  v_body := trim(COALESCE(p_body, ''));
  v_name := NULLIF(trim(COALESCE(p_client_name, '')), '');

  IF v_block_id = '' OR v_body = '' THEN
    RETURN jsonb_build_object('error', 'Write a comment before sending.');
  END IF;

  v_ax := p_anchor_x;
  v_ay := p_anchor_y;
  IF v_ax IS NOT NULL AND (v_ax < 0 OR v_ax > 1) THEN
    v_ax := NULL;
  END IF;
  IF v_ay IS NOT NULL AND (v_ay < 0 OR v_ay > 1) THEN
    v_ay := NULL;
  END IF;

  SELECT rt.project_id, rt.folder_id
  INTO v_project_id, v_token_folder_id
  FROM public.review_tokens rt
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now());

  IF v_project_id IS NULL THEN
    RETURN jsonb_build_object('error', 'This review link is invalid or has expired.');
  END IF;

  v_folder_id := COALESCE(p_target_folder_id, v_token_folder_id);
  IF v_folder_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Missing deliverable for feedback.');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.project_folders f
    WHERE f.id = v_folder_id
      AND f.project_id = v_project_id
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status IN (
        'active'::public.project_status,
        'changes_requested'::public.project_status
      )
  ) THEN
    RETURN jsonb_build_object('error', 'This deliverable is not open for feedback.');
  END IF;

  SELECT t.id INTO v_thread_id
  FROM public.review_threads t
  WHERE t.folder_id = v_folder_id
    AND t.block_id = v_block_id;

  IF v_thread_id IS NULL THEN
    INSERT INTO public.review_threads (project_id, folder_id, block_id, anchor_x, anchor_y)
    VALUES (v_project_id, v_folder_id, v_block_id, v_ax, v_ay)
    RETURNING id INTO v_thread_id;
  ELSE
    UPDATE public.review_threads t
    SET
      anchor_x = COALESCE(t.anchor_x, v_ax),
      anchor_y = COALESCE(t.anchor_y, v_ay)
    WHERE t.id = v_thread_id;
  END IF;

  INSERT INTO public.review_messages (thread_id, author, author_name, body)
  VALUES (v_thread_id, 'client'::public.review_message_author, v_name, v_body)
  RETURNING id INTO v_message_id;

  PERFORM public.set_block_review_for_folder(v_folder_id, v_block_id, 'changes_requested', v_body);
  PERFORM public.sync_folder_status_from_blocks(v_folder_id);

  UPDATE public.project_folders
  SET
    status = 'changes_requested'::public.project_status,
    client_feedback = v_body,
    approved_at = NULL
  WHERE id = v_folder_id
    AND status = 'active'::public.project_status;

  PERFORM public.sync_project_row_from_folders(v_project_id);

  RETURN jsonb_build_object(
    'thread_id', v_thread_id,
    'message_id', v_message_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_review_message_by_token(text, text, text, text, uuid, real, real) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_review_message_by_token(text, text, text, text, uuid, real, real)
  TO anon, authenticated, service_role;
