-- Align project_folders: app uses `name`; some databases have legacy `title` instead

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_folders'
      AND column_name = 'title'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_folders'
      AND column_name = 'name'
  ) THEN
    ALTER TABLE public.project_folders RENAME COLUMN title TO name;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_folders'
      AND column_name = 'title'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_folders'
      AND column_name = 'name'
  ) THEN
    UPDATE public.project_folders
    SET name = COALESCE(NULLIF(trim(name), ''), title)
    WHERE name IS NULL OR trim(name) = '';

    ALTER TABLE public.project_folders DROP COLUMN title;
  END IF;
END
$$;

ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS name TEXT;

UPDATE public.project_folders
SET name = 'Deliverables'
WHERE name IS NULL OR trim(name) = '';

ALTER TABLE public.project_folders
  ALTER COLUMN name SET NOT NULL;
