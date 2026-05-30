import { CompleteStep } from "@/components/onboarding/complete-step";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { OnboardingCompletePreview } from "@/components/onboarding/onboarding-previews";
import { ONBOARDING_PATHS } from "@/lib/onboarding/constants";
import { onboardingStepIndex } from "@/lib/onboarding/profile";
import { guardOnboardingPage } from "@/lib/onboarding/guard";
import { getOnboardingTeamInvites } from "@/lib/onboarding/server";
import { redirect } from "next/navigation";

export default async function OnboardingCompletePage() {
  const { userEmail, profile } = await guardOnboardingPage(ONBOARDING_PATHS.complete);

  if (profile.onboarding_plan !== "pro") {
    redirect(ONBOARDING_PATHS.profile);
  }

  if (
    profile.onboarding_status !== "payment_complete" &&
    profile.onboarding_status !== "complete"
  ) {
    redirect(ONBOARDING_PATHS.checkout);
  }

  const invites = await getOnboardingTeamInvites(profile.id);
  const { current, total } = onboardingStepIndex(ONBOARDING_PATHS.complete, "pro");

  return (
    <OnboardingLayout
      userEmail={userEmail}
      currentStep={current}
      totalSteps={total}
      title="You are set"
      description="Your Pro / Team workspace is ready. Create a project and send your first client review link."
      preview={
        <OnboardingCompletePreview
          plan="pro"
          inviteCount={invites.length}
        />
      }
    >
      <CompleteStep />
    </OnboardingLayout>
  );
}
