import { createClient } from "@/lib/supabase/server";
import type { OnboardingTeamInvite, Profile } from "@/types/database";

const PROFILE_ONBOARDING_SELECT =
  "id, email, company_name, display_name, onboarding_plan, onboarding_status, completed_onboarding, team_size, job_title, industry, referral_source, subscription_status, stripe_customer_id, created_at, updated_at";

export async function getOnboardingProfile(): Promise<{
  userId: string;
  email: string;
  profile: Profile;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_ONBOARDING_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? data.email,
    profile: data as Profile,
  };
}

export async function getOnboardingTeamInvites(
  userId: string,
): Promise<OnboardingTeamInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("onboarding_team_invites")
    .select("id, inviter_id, email, created_at")
    .eq("inviter_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getOnboardingTeamInvites:", error.message);
    return [];
  }

  return (data as OnboardingTeamInvite[]) ?? [];
}
