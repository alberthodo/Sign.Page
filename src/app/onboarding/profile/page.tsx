import { ProfileSetupView } from "@/components/onboarding/profile-setup-view";
import { ONBOARDING_PATHS } from "@/lib/onboarding/constants";
import { onboardingStepIndex } from "@/lib/onboarding/profile";
import { guardOnboardingPage } from "@/lib/onboarding/guard";
import { redirect } from "next/navigation";

export default async function OnboardingProfilePage() {
  const { profile } = await guardOnboardingPage(ONBOARDING_PATHS.profile);

  if (!profile.onboarding_plan) {
    redirect(ONBOARDING_PATHS.gettingStarted);
  }

  const plan = profile.onboarding_plan;
  const { current, total } = onboardingStepIndex(ONBOARDING_PATHS.profile, plan);

  return (
    <ProfileSetupView
      profile={profile}
      plan={plan}
      currentStep={current}
      totalSteps={total}
    />
  );
}
