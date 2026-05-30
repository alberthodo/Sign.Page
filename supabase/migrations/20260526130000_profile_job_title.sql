ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title TEXT;

COMMENT ON COLUMN public.profiles.job_title IS 'Job title from onboarding (personal plan)';
