import { TeamInvitesForm } from "@/components/onboarding/team-invites-form";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { OnboardingInvitesPreview } from "@/components/onboarding/onboarding-previews";
import { ONBOARDING_PATHS } from "@/lib/onboarding/constants";
import { onboardingStepIndex } from "@/lib/onboarding/profile";
import { guardOnboardingPage } from "@/lib/onboarding/guard";
import { getOnboardingTeamInvites } from "@/lib/onboarding/server";
import { redirect } from "next/navigation";

export default async function OnboardingInvitesPage() {
  const { userEmail, profile } = await guardOnboardingPage(ONBOARDING_PATHS.invites);

  if (profile.onboarding_plan !== "pro") {
    redirect(ONBOARDING_PATHS.profile);
  }

  const invites = await getOnboardingTeamInvites(profile.id);
  const emails = invites.map((i) => i.email);
  const { current, total } = onboardingStepIndex(ONBOARDING_PATHS.invites, "pro");

  return (
    <OnboardingLayout
      userEmail={userEmail}
      currentStep={current}
      totalSteps={total}
      title="Invite your team"
      description="Add up to five emails now, or skip and invite people later."
      preview={<OnboardingInvitesPreview emails={emails} />}
    >
      <TeamInvitesForm initialEmails={emails} />
    </OnboardingLayout>
  );
}
