-- Onboarding: plan selection, profile setup, team invites, billing state

CREATE TYPE public.onboarding_plan AS ENUM ('personal', 'pro');

CREATE TYPE public.onboarding_status AS ENUM (
  'not_started',
  'plan_selected',
  'profile_complete',
  'invites_complete',
  'payment_complete',
  'complete'
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_plan public.onboarding_plan,
  ADD COLUMN IF NOT EXISTS onboarding_status public.onboarding_status NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS completed_onboarding BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_size TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN public.profiles.display_name IS 'Owner display name from onboarding';
COMMENT ON COLUMN public.profiles.onboarding_plan IS 'personal (free) or pro (paid team)';
COMMENT ON COLUMN public.profiles.team_size IS 'Self-reported team size band from onboarding';
COMMENT ON COLUMN public.profiles.industry IS 'Self-reported industry from onboarding';
COMMENT ON COLUMN public.profiles.referral_source IS 'How the user heard about Sign.page';

CREATE TABLE IF NOT EXISTS public.onboarding_team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inviter_id, email)
);

CREATE INDEX IF NOT EXISTS onboarding_team_invites_inviter_id_idx
  ON public.onboarding_team_invites (inviter_id);

ALTER TABLE public.onboarding_team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding invites"
  ON public.onboarding_team_invites
  FOR SELECT
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can insert own onboarding invites"
  ON public.onboarding_team_invites
  FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can delete own onboarding invites"
  ON public.onboarding_team_invites
  FOR DELETE
  USING (auth.uid() = inviter_id);
