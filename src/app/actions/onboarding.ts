"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  MAX_ONBOARDING_TEAM_INVITES,
  ONBOARDING_PATHS,
} from "@/lib/onboarding/constants";
import { getOnboardingResumePath } from "@/lib/onboarding/profile";
import { getOnboardingProfile } from "@/lib/onboarding/server";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingPlan } from "@/types/database";

export type OnboardingActionState = {
  error?: string;
  success?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function selectOnboardingPlanFromForm(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const plan = String(formData.get("plan") ?? "") as OnboardingPlan;
  return selectOnboardingPlan(plan);
}

export async function selectOnboardingPlan(
  plan: OnboardingPlan,
): Promise<OnboardingActionState> {
  if (plan !== "personal" && plan !== "pro") {
    return { error: "Invalid plan." };
  }

  if (plan === "pro") {
    return {
      error: "Pro / Team is coming soon. Choose Personal (free) to continue.",
    };
  }

  const ctx = await getOnboardingProfile();
  if (!ctx) {
    return { error: "You must be signed in." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_plan: plan,
      onboarding_status: "plan_selected",
    })
    .eq("id", ctx.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/onboarding", "layout");
  redirect(ONBOARDING_PATHS.profile);
}

export async function saveOnboardingProfile(
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
    return { error: "Choose a plan first." };
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
      onboarding_status: "profile_complete",
    })
    .eq("id", ctx.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/onboarding", "layout");

  if (ctx.profile.onboarding_plan === "pro") {
    redirect(ONBOARDING_PATHS.invites);
  }

  return { success: "saved" };
}

export async function saveAndCompletePersonalOnboarding(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const saveResult = await saveOnboardingProfile(_prev, formData);
  if (saveResult.error) {
    return saveResult;
  }

  const ctx = await getOnboardingProfile();
  if (!ctx || ctx.profile.onboarding_plan !== "personal") {
    return { error: "Invalid plan." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      completed_onboarding: true,
      onboarding_status: "complete",
    })
    .eq("id", ctx.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/onboarding", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function completePersonalOnboarding(): Promise<OnboardingActionState> {
  const ctx = await getOnboardingProfile();
  if (!ctx) {
    return { error: "You must be signed in." };
  }
  if (ctx.profile.onboarding_plan !== "personal") {
    return { error: "Invalid plan for this action." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      completed_onboarding: true,
      onboarding_status: "complete",
    })
    .eq("id", ctx.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/onboarding", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function saveOnboardingInvites(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const ctx = await getOnboardingProfile();
  if (!ctx) {
    return { error: "You must be signed in." };
  }
  if (ctx.profile.onboarding_plan !== "pro") {
    return { error: "Team invites are for Pro plans only." };
  }

  const rawEmails = formData.getAll("inviteEmail").map((v) => String(v).trim().toLowerCase());
  const emails = [...new Set(rawEmails.filter(Boolean))];

  if (emails.length > MAX_ONBOARDING_TEAM_INVITES) {
    return {
      error: `You can invite up to ${MAX_ONBOARDING_TEAM_INVITES} teammates during setup.`,
    };
  }

  for (const email of emails) {
    if (!isValidEmail(email)) {
      return { error: `Invalid email: ${email}` };
    }
    if (email === ctx.email.toLowerCase()) {
      return { error: "You cannot invite yourself." };
    }
  }

  const supabase = await createClient();

  await supabase
    .from("onboarding_team_invites")
    .delete()
    .eq("inviter_id", ctx.userId);

  if (emails.length > 0) {
    const { error: insertError } = await supabase.from("onboarding_team_invites").insert(
      emails.map((email) => ({
        inviter_id: ctx.userId,
        email,
      })),
    );

    if (insertError) {
      return { error: insertError.message };
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ onboarding_status: "invites_complete" })
    .eq("id", ctx.userId);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/onboarding", "layout");
  redirect(ONBOARDING_PATHS.checkout);
}

export async function skipOnboardingInvites(): Promise<void> {
  const ctx = await getOnboardingProfile();
  if (!ctx || ctx.profile.onboarding_plan !== "pro") {
    redirect(ONBOARDING_PATHS.gettingStarted);
  }

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ onboarding_status: "invites_complete" })
    .eq("id", ctx.userId);

  revalidatePath("/onboarding", "layout");
  redirect(ONBOARDING_PATHS.checkout);
}

/** Dev / unconfigured Stripe: mark payment complete and go to finish step. */
export async function simulateOnboardingCheckoutSuccess(): Promise<void> {
  const ctx = await getOnboardingProfile();
  if (!ctx || ctx.profile.onboarding_plan !== "pro") {
    redirect(ONBOARDING_PATHS.gettingStarted);
  }

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      onboarding_status: "payment_complete",
      subscription_status: "active_dev",
    })
    .eq("id", ctx.userId);

  revalidatePath("/onboarding", "layout");
  redirect(`${ONBOARDING_PATHS.complete}?checkout=success`);
}

export async function completeProOnboarding(): Promise<OnboardingActionState> {
  const ctx = await getOnboardingProfile();
  if (!ctx) {
    return { error: "You must be signed in." };
  }
  if (ctx.profile.onboarding_plan !== "pro") {
    return { error: "Invalid plan." };
  }
  if (
    ctx.profile.onboarding_status !== "payment_complete" &&
    ctx.profile.onboarding_status !== "complete"
  ) {
    return { error: "Complete checkout before continuing." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      completed_onboarding: true,
      onboarding_status: "complete",
    })
    .eq("id", ctx.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/onboarding", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/** Exit onboarding and open the workspace (always marks complete, including in dev). */
export async function skipOnboardingSetup(): Promise<void> {
  const ctx = await getOnboardingProfile();
  if (!ctx) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      completed_onboarding: true,
      onboarding_status: "complete",
    })
    .eq("id", ctx.userId);

  revalidatePath("/onboarding", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/** Skip from plan selection — only Personal (free) is allowed. */
export async function skipOnboardingFromPlanStep(formData: FormData): Promise<void> {
  const plan = String(formData.get("plan") ?? "");
  if (plan !== "personal") {
    return;
  }

  const ctx = await getOnboardingProfile();
  if (!ctx) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      onboarding_plan: "personal",
      completed_onboarding: true,
      onboarding_status: "complete",
    })
    .eq("id", ctx.userId);

  revalidatePath("/onboarding", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function getOnboardingRedirectPath(): Promise<string> {
  const ctx = await getOnboardingProfile();
  if (!ctx) {
    return "/login";
  }
  return getOnboardingResumePath(ctx.profile);
}
