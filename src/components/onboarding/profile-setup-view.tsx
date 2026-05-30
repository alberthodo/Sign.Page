"use client";

import { useState } from "react";
import { skipOnboardingSetup } from "@/app/actions/onboarding";
import {
  PROFILE_SETUP_FORM_ID,
  ProfileSetupForm,
} from "@/components/onboarding/profile-setup-form";
import { OnboardingModalLayout } from "@/components/onboarding/onboarding-modal-layout";
import { OnboardingProfilePreview } from "@/components/onboarding/onboarding-previews";
import { ONBOARDING_TEAM_SIZE_OPTIONS } from "@/lib/onboarding/constants";
import type { OnboardingPlan, Profile } from "@/types/database";

type ProfileSetupViewProps = {
  profile: Profile;
  plan: OnboardingPlan;
  currentStep: number;
  totalSteps: number;
};

export function ProfileSetupView({
  profile,
  plan,
  currentStep,
  totalSteps,
}: ProfileSetupViewProps) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [companyName, setCompanyName] = useState(profile.company_name ?? "");
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? "");
  const [teamSize, setTeamSize] = useState(profile.team_size ?? "");
  const [industry, setIndustry] = useState(profile.industry ?? "");

  const teamSizeLabel =
    ONBOARDING_TEAM_SIZE_OPTIONS.find((o) => o.value === teamSize)?.label ??
    teamSize;

  return (
    <OnboardingModalLayout
      title="Set up your workspace"
      description="Tell us a bit about you."
      preview={
        <OnboardingProfilePreview
          displayName={displayName}
          companyName={companyName}
          jobTitle={jobTitle}
          teamSizeLabel={teamSizeLabel}
          plan={plan}
        />
      }
      previewFooter={
        <button
          type="submit"
          form={PROFILE_SETUP_FORM_ID}
          formAction={skipOnboardingSetup}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip onboarding
        </button>
      }
    >
      <ProfileSetupForm
        plan={plan}
        currentStep={currentStep}
        totalSteps={totalSteps}
        displayName={displayName}
        companyName={companyName}
        jobTitle={jobTitle}
        teamSize={teamSize}
        industry={industry}
        referral={profile.referral_source ?? ""}
        onDisplayNameChange={setDisplayName}
        onCompanyNameChange={setCompanyName}
        onJobTitleChange={setJobTitle}
        onTeamSizeChange={setTeamSize}
        onIndustryChange={setIndustry}
      />
    </OnboardingModalLayout>
  );
}
