-- Sign.page OSS database bootstrap (final schema)
--
-- Run ONCE on a new Supabase project (SQL Editor or psql).
-- Do not run on a database that already applied supabase/migrations/* — use `supabase db push` there instead.
--
-- Derived from incremental migrations (May 2025–2026). This file reflects the end state only:
--   - Tables include folder model, content_blocks, signatures (no legacy `title` column)
--   - Review RPCs match the app: per-folder approve with signature, block notes, published-only folders
--   - No backfills or repair blocks (empty project = empty folders; the app creates folders)

-- =============================================================================
-- Types
-- =============================================================================

CREATE TYPE public.project_status AS ENUM (
  'draft',
  'active',
  'approved',
  'changes_requested'
);

CREATE TYPE public.folder_visibility AS ENUM ('public', 'hidden');

-- =============================================================================
-- Tables
-- =============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  company_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  project_type TEXT,
  description TEXT,
  assets TEXT[] NOT NULL DEFAULT '{}',
  status public.project_status NOT NULL DEFAULT 'draft',
  client_feedback TEXT,
  approved_at TIMESTAMPTZ,
  client_approved_by_name TEXT,
  client_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.projects.project_type IS 'Freelancer-defined category (e.g. branding, web)';
COMMENT ON COLUMN public.projects.description IS 'Optional project notes for the workspace';

CREATE TABLE public.project_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  visibility public.folder_visibility NOT NULL DEFAULT 'public',
  assets TEXT[] NOT NULL DEFAULT '{}',
  content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.project_status NOT NULL DEFAULT 'draft',
  client_feedback TEXT,
  approved_at TIMESTAMPTZ,
  client_approved_by_name TEXT,
  client_signature TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.review_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.project_folders (id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX projects_user_id_idx ON public.projects (user_id);
CREATE INDEX projects_status_idx ON public.projects (status);
CREATE INDEX project_folders_project_id_idx ON public.project_folders (project_id);
CREATE INDEX project_folders_visibility_idx ON public.project_folders (project_id, visibility);
CREATE INDEX review_tokens_project_id_idx ON public.review_tokens (project_id);
CREATE INDEX review_tokens_token_idx ON public.review_tokens (token);

CREATE UNIQUE INDEX review_tokens_one_project_link
  ON public.review_tokens (project_id)
  WHERE folder_id IS NULL;

CREATE UNIQUE INDEX review_tokens_one_per_folder
  ON public.review_tokens (folder_id)
  WHERE folder_id IS NOT NULL;

-- =============================================================================
-- Triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER project_folders_set_updated_at
  BEFORE UPDATE ON public.project_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Row level security
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view tokens for own projects"
  ON public.review_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = review_tokens.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tokens for own projects"
  ON public.review_tokens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = review_tokens.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tokens for own projects"
  ON public.review_tokens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = review_tokens.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tokens for own projects"
  ON public.review_tokens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = review_tokens.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view folders for own projects"
  ON public.project_folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_folders.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert folders for own projects"
  ON public.project_folders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_folders.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update folders for own projects"
  ON public.project_folders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_folders.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete folders for own projects"
  ON public.project_folders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_folders.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Storage (project-assets bucket)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-assets',
  'project-assets',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Authenticated users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read project assets"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'project-assets');

-- =============================================================================
-- Project ↔ folder sync (replaces project-only approve logic from early migrations)
-- =============================================================================

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

-- =============================================================================
-- Content block helpers
-- =============================================================================

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
  SELECT content_blocks INTO v_blocks
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

-- =============================================================================
-- Client review RPCs (anon + authenticated; no service_role required on /review)
-- =============================================================================

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

CREATE OR REPLACE FUNCTION public.bump_review_token_access(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.review_tokens
  SET access_count = access_count + 1
  WHERE token = p_token;
$$;

CREATE OR REPLACE FUNCTION public.list_review_folders_by_token(p_token text)
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

-- =============================================================================
-- Grants (client review uses anon key + RPC)
-- =============================================================================

REVOKE ALL ON FUNCTION public.get_review_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_review_token_access(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_review_folders_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_block_review_by_token(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_review_by_token(text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_changes_by_token(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_item_notes_by_token(text, jsonb, text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_review_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bump_review_token_access(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_review_folders_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_block_review_by_token(text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_review_by_token(text, text, text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_changes_by_token(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_item_notes_by_token(text, jsonb, text, uuid) TO anon, authenticated, service_role;

-- =============================================================================
-- Realtime (dashboard live refresh)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'project_folders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_folders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;
END $$;
