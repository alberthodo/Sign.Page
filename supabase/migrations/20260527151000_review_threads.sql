-- Review threads: Discord-like comment threads per content block.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    INNER JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'review_message_author'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.review_message_author AS ENUM ('client', 'freelancer');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.review_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.project_folders (id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One thread per block per folder (v1).
CREATE UNIQUE INDEX IF NOT EXISTS review_threads_unique_anchor
  ON public.review_threads (folder_id, block_id);

CREATE INDEX IF NOT EXISTS review_threads_project_idx
  ON public.review_threads (project_id);

CREATE TABLE IF NOT EXISTS public.review_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.review_threads (id) ON DELETE CASCADE,
  author public.review_message_author NOT NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_messages_thread_created_idx
  ON public.review_messages (thread_id, created_at ASC);

ALTER TABLE public.review_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_messages ENABLE ROW LEVEL SECURITY;

-- Owner access in-app.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_threads'
      AND policyname = 'Users can view threads for own projects'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "Users can view threads for own projects"
        ON public.review_threads
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM public.projects
            WHERE projects.id = review_threads.project_id
              AND projects.user_id = auth.uid()
          )
        )
    $POL$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_threads'
      AND policyname = 'Users can insert threads for own projects'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "Users can insert threads for own projects"
        ON public.review_threads
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM public.projects
            WHERE projects.id = review_threads.project_id
              AND projects.user_id = auth.uid()
          )
        )
    $POL$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_messages'
      AND policyname = 'Users can view messages for own projects'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "Users can view messages for own projects"
        ON public.review_messages
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM public.review_threads t
            INNER JOIN public.projects p ON p.id = t.project_id
            WHERE t.id = review_messages.thread_id
              AND p.user_id = auth.uid()
          )
        )
    $POL$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_messages'
      AND policyname = 'Users can insert messages for own projects'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "Users can insert messages for own projects"
        ON public.review_messages
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM public.review_threads t
            INNER JOIN public.projects p ON p.id = t.project_id
            WHERE t.id = review_messages.thread_id
              AND p.user_id = auth.uid()
          )
        )
    $POL$;
  END IF;
END
$$;

-- Public RPC: list threads for a token + folder.
DROP FUNCTION IF EXISTS public.list_review_threads_by_token(text, uuid);
CREATE OR REPLACE FUNCTION public.list_review_threads_by_token(
  p_token text,
  p_target_folder_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope text;
  v_project_id uuid;
  v_token_folder_id uuid;
  v_folder_id uuid;
  v_threads jsonb;
BEGIN
  SELECT rt.scope, rt.project_id, rt.folder_id
  INTO v_scope, v_project_id, v_token_folder_id
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

  -- Ensure this folder is part of the token scope.
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

-- Public RPC: add a client message by token (immediate posting).
DROP FUNCTION IF EXISTS public.add_review_message_by_token(text, text, text, text, uuid);
CREATE OR REPLACE FUNCTION public.add_review_message_by_token(
  p_token text,
  p_block_id text,
  p_body text,
  p_client_name text DEFAULT NULL,
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
  v_block_id text;
  v_body text;
  v_name text;
  v_thread_id uuid;
  v_message_id uuid;
BEGIN
  v_block_id := trim(COALESCE(p_block_id, ''));
  v_body := trim(COALESCE(p_body, ''));
  v_name := NULLIF(trim(COALESCE(p_client_name, '')), '');

  IF v_block_id = '' OR v_body = '' THEN
    RETURN jsonb_build_object('error', 'Write a comment before sending.');
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

  -- Ensure thread exists (one per block).
  SELECT t.id INTO v_thread_id
  FROM public.review_threads t
  WHERE t.folder_id = v_folder_id
    AND t.block_id = v_block_id;

  IF v_thread_id IS NULL THEN
    INSERT INTO public.review_threads (project_id, folder_id, block_id)
    VALUES (v_project_id, v_folder_id, v_block_id)
    RETURNING id INTO v_thread_id;
  END IF;

  INSERT INTO public.review_messages (thread_id, author, author_name, body)
  VALUES (v_thread_id, 'client'::public.review_message_author, v_name, v_body)
  RETURNING id INTO v_message_id;

  -- Mirror into existing per-block review metadata.
  PERFORM public.set_block_review_by_token(p_token, v_block_id, 'changes_requested', v_body);
  PERFORM public.sync_folder_status_from_blocks(v_folder_id);
  PERFORM public.sync_project_row_from_folders(v_project_id);

  RETURN jsonb_build_object(
    'thread_id', v_thread_id,
    'message_id', v_message_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_review_message_by_token(text, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_review_message_by_token(text, text, text, text, uuid)
  TO anon, authenticated, service_role;

