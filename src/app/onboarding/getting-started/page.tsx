import { GettingStartedView } from "@/components/onboarding/getting-started-view";
import { ONBOARDING_PATHS } from "@/lib/onboarding/constants";
import { resetOnboardingForDevIteration } from "@/lib/onboarding/dev-reset";
import { onboardingStepIndex } from "@/lib/onboarding/profile";
import { guardOnboardingPage, requireOnboardingAuth } from "@/lib/onboarding/guard";

export default async function OnboardingGettingStartedPage() {
  const { profile: authProfile } = await requireOnboardingAuth();
  await resetOnboardingForDevIteration(authProfile.id);

  const { profile } = await guardOnboardingPage(
    ONBOARDING_PATHS.gettingStarted,
  );
  const { current, total } = onboardingStepIndex(
    ONBOARDING_PATHS.gettingStarted,
    profile.onboarding_plan,
  );

  return (
    <GettingStartedView
      initialPlan={profile.onboarding_plan}
      currentStep={current}
      totalSteps={total}
    />
  );
}
