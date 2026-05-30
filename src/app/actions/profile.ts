"use server";

import { revalidatePath } from "next/cache";
import type { OnboardingActionState } from "@/app/actions/onboarding";
import { getOnboardingProfile } from "@/lib/onboarding/server";
import { createClient } from "@/lib/supabase/server";

export async function saveAccountProfile(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const teamSize = String(formData.get("teamSize") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const referralSource = String(formData.get("referralSource") ?? "").trim();

  if (!displayName) {
    return { error: "Full name is required." };
  }
  if (!industry) {
    return { error: "Industry is required." };
  }

  const ctx = await getOnboardingProfile();
  if (!ctx) {
    return { error: "You must be signed in." };
  }
  if (!ctx.profile.onboarding_plan) {
    return { error: "Account plan is missing." };
  }

  const isPersonal = ctx.profile.onboarding_plan === "personal";

  if (isPersonal && !jobTitle) {
    return { error: "Title is required." };
  }
  if (!isPersonal && !teamSize) {
    return { error: "Team size is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      company_name: companyName || null,
      job_title: isPersonal ? jobTitle : null,
      team_size: isPersonal ? null : teamSize,
      industry,
      referral_source: referralSource || null,
    })
    .eq("id", ctx.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");

  return { success: "Changes saved." };
}
