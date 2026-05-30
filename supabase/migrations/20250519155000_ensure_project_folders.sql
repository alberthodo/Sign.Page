-- Ensure project_folders exists (repair if prior migration was skipped or partial)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'folder_visibility') THEN
    CREATE TYPE public.folder_visibility AS ENUM ('public', 'hidden');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.project_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Deliverables',
  visibility public.folder_visibility NOT NULL DEFAULT 'public',
  assets TEXT[] NOT NULL DEFAULT '{}',
  status public.project_status NOT NULL DEFAULT 'draft',
  client_feedback TEXT,
  approved_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Deliverables';

ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS visibility public.folder_visibility NOT NULL DEFAULT 'public';

ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS assets TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS status public.project_status NOT NULL DEFAULT 'draft';

ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS client_feedback TEXT;

ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS project_folders_project_id_idx
  ON public.project_folders (project_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'project_folders_set_updated_at'
  ) THEN
    CREATE TRIGGER project_folders_set_updated_at
      BEFORE UPDATE ON public.project_folders
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

ALTER TABLE public.review_tokens
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.project_folders (id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS review_tokens_one_project_link
  ON public.review_tokens (project_id)
  WHERE folder_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS review_tokens_one_per_folder
  ON public.review_tokens (folder_id)
  WHERE folder_id IS NOT NULL;

-- Backfill folders for projects that have none
INSERT INTO public.project_folders (
  project_id,
  name,
  visibility,
  assets,
  status,
  client_feedback,
  approved_at,
  sort_order
)
SELECT
  p.id,
  'Deliverables',
  'public'::public.folder_visibility,
  p.assets,
  p.status,
  p.client_feedback,
  p.approved_at,
  0
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_folders f WHERE f.project_id = p.id
);

ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_folders' AND policyname = 'Users can view folders for own projects'
  ) THEN
    CREATE POLICY "Users can view folders for own projects"
      ON public.project_folders
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.id = project_folders.project_id
            AND projects.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_folders' AND policyname = 'Users can insert folders for own projects'
  ) THEN
    CREATE POLICY "Users can insert folders for own projects"
      ON public.project_folders
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.id = project_folders.project_id
            AND projects.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_folders' AND policyname = 'Users can update folders for own projects'
  ) THEN
    CREATE POLICY "Users can update folders for own projects"
      ON public.project_folders
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.id = project_folders.project_id
            AND projects.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_folders' AND policyname = 'Users can delete folders for own projects'
  ) THEN
    CREATE POLICY "Users can delete folders for own projects"
      ON public.project_folders
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.id = project_folders.project_id
            AND projects.user_id = auth.uid()
        )
      );
  END IF;
END
$$;
