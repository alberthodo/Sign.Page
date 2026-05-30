import type { OnboardingPlan, OnboardingStatus, Profile } from "@/types/database";
import { ONBOARDING_PATHS } from "@/lib/onboarding/constants";

export function needsOnboarding(profile: Pick<Profile, "completed_onboarding">): boolean {
  return !profile.completed_onboarding;
}

export function isProfileStepComplete(
  profile: Pick<
    Profile,
    "display_name" | "team_size" | "job_title" | "industry" | "onboarding_plan"
  >,
): boolean {
  if (!profile.display_name?.trim() || !profile.industry?.trim()) {
    return false;
  }

  if (profile.onboarding_plan === "personal") {
    return Boolean(profile.job_title?.trim());
  }

  return Boolean(profile.team_size?.trim());
}

export function getOnboardingResumePath(
  profile: Pick<
    Profile,
    | "onboarding_plan"
    | "onboarding_status"
    | "display_name"
    | "team_size"
    | "job_title"
    | "industry"
    | "completed_onboarding"
  >,
): string {
  if (!needsOnboarding(profile)) {
    return "/dashboard";
  }

  if (!profile.onboarding_plan) {
    return ONBOARDING_PATHS.gettingStarted;
  }

  if (!isProfileStepComplete(profile)) {
    return ONBOARDING_PATHS.profile;
  }

  if (profile.onboarding_plan === "pro") {
    const status = profile.onboarding_status;
    if (!isProfileStepComplete(profile)) {
      return ONBOARDING_PATHS.profile;
    }
    if (status === "profile_complete" || status === "plan_selected") {
      return ONBOARDING_PATHS.invites;
    }
    if (status === "invites_complete") {
      return ONBOARDING_PATHS.checkout;
    }
    if (status === "payment_complete") {
      return ONBOARDING_PATHS.complete;
    }
    return ONBOARDING_PATHS.invites;
  }

  if (profile.onboarding_plan === "personal") {
    return ONBOARDING_PATHS.profile;
  }

  return ONBOARDING_PATHS.gettingStarted;
}

export function onboardingStepIndex(
  path: string,
  plan: OnboardingPlan | null,
): { current: number; total: number } {
  if (plan === "pro") {
    const steps = [
      ONBOARDING_PATHS.gettingStarted,
      ONBOARDING_PATHS.profile,
      ONBOARDING_PATHS.invites,
      ONBOARDING_PATHS.checkout,
      ONBOARDING_PATHS.complete,
    ];
    const idx = steps.findIndex((s) => path.startsWith(s));
    return { current: idx >= 0 ? idx + 1 : 1, total: 5 };
  }

  const steps = [ONBOARDING_PATHS.gettingStarted, ONBOARDING_PATHS.profile];
  const idx = steps.findIndex((s) => path.startsWith(s));
  return { current: idx >= 0 ? idx + 1 : 1, total: 2 };
}

export function canAccessOnboardingPath(
  profile: Pick<
    Profile,
    | "onboarding_plan"
    | "onboarding_status"
    | "display_name"
    | "team_size"
    | "job_title"
    | "industry"
    | "completed_onboarding"
  >,
  pathname: string,
): boolean {
  if (!needsOnboarding(profile)) {
    return false;
  }

  if (pathname.startsWith(ONBOARDING_PATHS.gettingStarted)) {
    return true;
  }

  if (!profile.onboarding_plan) {
    return false;
  }

  if (pathname.startsWith(ONBOARDING_PATHS.profile)) {
    return true;
  }

  if (profile.onboarding_plan !== "pro") {
    return false;
  }

  if (pathname.startsWith(ONBOARDING_PATHS.invites)) {
    return isProfileStepComplete(profile);
  }

  if (pathname.startsWith(ONBOARDING_PATHS.checkout)) {
    const status = profile.onboarding_status;
    return (
      isProfileStepComplete(profile) &&
      (status === "invites_complete" ||
        status === "payment_complete" ||
        status === "complete")
    );
  }

  if (pathname.startsWith(ONBOARDING_PATHS.complete)) {
    return (
      profile.onboarding_status === "payment_complete" ||
      profile.onboarding_status === "complete"
    );
  }

  return false;
}
