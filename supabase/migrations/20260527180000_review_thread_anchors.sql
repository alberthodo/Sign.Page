-- Pin anchors for Figma-style review comments (0–1 relative to block).

ALTER TABLE public.review_threads
  ADD COLUMN IF NOT EXISTS anchor_x REAL,
  ADD COLUMN IF NOT EXISTS anchor_y REAL;

ALTER TABLE public.review_threads
  DROP CONSTRAINT IF EXISTS review_threads_anchor_x_range;

ALTER TABLE public.review_threads
  ADD CONSTRAINT review_threads_anchor_x_range
  CHECK (anchor_x IS NULL OR (anchor_x >= 0 AND anchor_x <= 1));

ALTER TABLE public.review_threads
  DROP CONSTRAINT IF EXISTS review_threads_anchor_y_range;

ALTER TABLE public.review_threads
  ADD CONSTRAINT review_threads_anchor_y_range
  CHECK (anchor_y IS NULL OR (anchor_y >= 0 AND anchor_y <= 1));

-- Public RPC: list threads (includes anchors).
DROP FUNCTION IF EXISTS public.list_review_threads_by_token(text, uuid);
CREATE OR REPLACE FUNCTION public.list_review_threads_by_token(
  p_token text,
  p_target_folder_id uuid DEFAULT NULL
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
  v_threads jsonb;
BEGIN
  SELECT rt.project_id, rt.folder_id
  INTO v_project_id, v_token_folder_id
  FROM public.review_tokens rt
  WHERE rt.token = p_token
    AND (rt.expires_at IS NULL OR rt.expires_at > now());

  IF v_project_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  v_folder_id := COALESCE(v_token_folder_id, p_target_folder_id);
  IF v_folder_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.list_review_folders_by_token(p_token) f
    WHERE f.id = v_folder_id
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(thread_json ORDER BY (thread_json->>'last_activity')::timestamptz DESC), '[]'::jsonb)
  INTO v_threads
  FROM (
    SELECT jsonb_build_object(
      'id', t.id,
      'folder_id', t.folder_id,
      'block_id', t.block_id,
      'anchor_x', t.anchor_x,
      'anchor_y', t.anchor_y,
      'created_at', t.created_at,
      'last_activity', COALESCE(max(m.created_at), t.created_at),
      'messages', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'author', m.author,
            'author_name', m.author_name,
            'body', m.body,
            'created_at', m.created_at
          )
          ORDER BY m.created_at ASC
        ) FILTER (WHERE m.id IS NOT NULL),
        '[]'::jsonb
      )
    ) AS thread_json
    FROM public.review_threads t
    LEFT JOIN public.review_messages m ON m.thread_id = t.id
    WHERE t.project_id = v_project_id
      AND t.folder_id = v_folder_id
    GROUP BY t.id
  ) s;

  RETURN v_threads;
END;
$$;

REVOKE ALL ON FUNCTION public.list_review_threads_by_token(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_review_threads_by_token(text, uuid)
  TO anon, authenticated, service_role;

-- Public RPC: add client message (with optional pin anchor).
DROP FUNCTION IF EXISTS public.add_review_message_by_token(text, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.add_review_message_by_token(text, text, text, text, uuid, real, real);
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

  v_folder_id := COALESCE(v_token_folder_id, p_target_folder_id);
  IF v_folder_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Missing deliverable for feedback.');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.project_folders f
    WHERE f.id = v_folder_id
      AND f.project_id = v_project_id
      AND f.visibility = 'public'::public.folder_visibility
      AND f.status = 'active'::public.project_status
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

  PERFORM public.set_block_review_by_token(p_token, v_block_id, 'changes_requested', v_body);
  PERFORM public.sync_folder_status_from_blocks(v_folder_id);
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
