-- Project metadata: type and description

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.projects.project_type IS 'Freelancer-defined category (e.g. branding, web)';
COMMENT ON COLUMN public.projects.description IS 'Optional project notes for the workspace';
