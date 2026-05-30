"use client";

import { useState } from "react";
import Link from "next/link";
import { ProfileSetupForm } from "@/components/onboarding/profile-setup-form";
import { OnboardingModalLayout } from "@/components/onboarding/onboarding-modal-layout";
import { OnboardingProfilePreview } from "@/components/onboarding/onboarding-previews";
import { ONBOARDING_TEAM_SIZE_OPTIONS } from "@/lib/onboarding/constants";
import type { OnboardingPlan, Profile } from "@/types/database";

type ProfileEditViewProps = {
  profile: Profile;
  plan: OnboardingPlan;
};

export function ProfileEditView({ profile, plan }: ProfileEditViewProps) {
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
      title="Your profile"
      description="Update how you appear on your access badge and in the workspace."
      showSignOut={false}
      dialogClassName="h-[min(82dvh,720px,calc(100dvh-3.5rem-2.5rem))] max-h-[min(92dvh,820px,calc(100dvh-3.5rem-2.5rem))]"
      previewHeader={
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back
        </Link>
      }
      preview={
        <OnboardingProfilePreview
          displayName={displayName}
          companyName={companyName}
          jobTitle={jobTitle}
          teamSizeLabel={teamSizeLabel}
          plan={plan}
        />
      }
    >
      <div className="mb-4 flex justify-end lg:hidden">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back
        </Link>
      </div>
      <ProfileSetupForm
        variant="settings"
        plan={plan}
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
