-- Project folders (containers): public vs hidden, per-folder review state

CREATE TYPE public.folder_visibility AS ENUM ('public', 'hidden');

CREATE TABLE public.project_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  visibility public.folder_visibility NOT NULL DEFAULT 'public',
  assets TEXT[] NOT NULL DEFAULT '{}',
  status public.project_status NOT NULL DEFAULT 'draft',
  client_feedback TEXT,
  approved_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX project_folders_project_id_idx ON public.project_folders (project_id);
CREATE INDEX project_folders_visibility_idx ON public.project_folders (project_id, visibility);

CREATE TRIGGER project_folders_set_updated_at
  BEFORE UPDATE ON public.project_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.review_tokens
  ADD COLUMN folder_id UUID REFERENCES public.project_folders (id) ON DELETE CASCADE;

-- Keep a single project-scoped client link per project
DELETE FROM public.review_tokens rt
USING public.review_tokens newer
WHERE rt.folder_id IS NULL
  AND newer.folder_id IS NULL
  AND rt.project_id = newer.project_id
  AND rt.created_at < newer.created_at;

CREATE UNIQUE INDEX review_tokens_one_project_link
  ON public.review_tokens (project_id)
  WHERE folder_id IS NULL;

CREATE UNIQUE INDEX review_tokens_one_per_folder
  ON public.review_tokens (folder_id)
  WHERE folder_id IS NOT NULL;

-- Backfill: one default public folder per project; move flat assets into it
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
FROM public.projects p;

ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folders for own projects"
  ON public.project_folders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = project_folders.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert folders for own projects"
  ON public.project_folders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = project_folders.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update folders for own projects"
  ON public.project_folders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = project_folders.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete folders for own projects"
  ON public.project_folders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = project_folders.project_id
        AND projects.user_id = auth.uid()
    )
  );
