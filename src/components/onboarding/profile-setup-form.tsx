"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  saveAndCompletePersonalOnboarding,
  saveOnboardingProfile,
  type OnboardingActionState,
} from "@/app/actions/onboarding";
import { saveAccountProfile } from "@/app/actions/profile";
import { OnboardingProgressDots } from "@/components/onboarding/onboarding-progress-dots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ONBOARDING_INDUSTRY_OPTIONS,
  ONBOARDING_PATHS,
  ONBOARDING_REFERRAL_OPTIONS,
  ONBOARDING_TEAM_SIZE_OPTIONS,
} from "@/lib/onboarding/constants";
import { cn } from "@/lib/utils";
import type { OnboardingPlan } from "@/types/database";

const fieldClass =
  "shadow-none focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:outline-none";

const inputClass = cn("h-10 bg-white", fieldClass);

const selectClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm",
  fieldClass,
);

type ProfileSetupFormVariant = "onboarding" | "settings";

type ProfileSetupFormProps = {
  variant?: ProfileSetupFormVariant;
  plan: OnboardingPlan;
  currentStep?: number;
  totalSteps?: number;
  displayName: string;
  companyName: string;
  jobTitle: string;
  teamSize: string;
  industry: string;
  referral: string;
  onDisplayNameChange: (value: string) => void;
  onCompanyNameChange: (value: string) => void;
  onJobTitleChange: (value: string) => void;
  onTeamSizeChange: (value: string) => void;
  onIndustryChange: (value: string) => void;
};

function SubmitButton({
  variant,
  isPersonal,
}: {
  variant: ProfileSetupFormVariant;
  isPersonal: boolean;
}) {
  const { pending } = useFormStatus();

  const label =
    variant === "settings"
      ? pending
        ? "Saving…"
        : "Save changes"
      : pending
        ? isPersonal
          ? "Getting started…"
          : "Saving…"
        : isPersonal
          ? "Get started"
          : "Continue";

  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {label}
    </Button>
  );
}

export const PROFILE_SETUP_FORM_ID = "onboarding-profile-setup-form";

export function ProfileSetupForm({
  variant = "onboarding",
  plan,
  currentStep = 1,
  totalSteps = 2,
  displayName,
  companyName,
  jobTitle,
  teamSize,
  industry,
  referral,
  onDisplayNameChange,
  onCompanyNameChange,
  onJobTitleChange,
  onTeamSizeChange,
  onIndustryChange,
}: ProfileSetupFormProps) {
  const isPersonal = plan === "personal";
  const isSettings = variant === "settings";
  const action = isSettings
    ? saveAccountProfile
    : isPersonal
      ? saveAndCompletePersonalOnboarding
      : saveOnboardingProfile;

  const [state, formAction] = useActionState(
    action,
    {} as OnboardingActionState,
  );

  return (
    <form
      id={PROFILE_SETUP_FORM_ID}
      action={formAction}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        <div className="space-y-2">
          <Label htmlFor="displayName">Full name</Label>
          <Input
            id="displayName"
            name="displayName"
            required
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="Alex Morgan"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">Organization name</Label>
          <Input
            id="companyName"
            name="companyName"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder="Studio name (optional)"
            className={inputClass}
          />
        </div>

        {isPersonal ? (
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Title</Label>
            <Input
              id="jobTitle"
              name="jobTitle"
              required
              value={jobTitle}
              onChange={(e) => onJobTitleChange(e.target.value)}
              placeholder="Your job title"
              className={inputClass}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="teamSize">Team size</Label>
            <select
              id="teamSize"
              name="teamSize"
              required
              value={teamSize}
              onChange={(e) => onTeamSizeChange(e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                Select team size
              </option>
              {ONBOARDING_TEAM_SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <select
            id="industry"
            name="industry"
            required
            value={industry}
            onChange={(e) => onIndustryChange(e.target.value)}
            className={selectClass}
          >
            <option value="" disabled>
              Select industry
            </option>
            {ONBOARDING_INDUSTRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="referralSource">How did you hear about us?</Label>
          <select
            id="referralSource"
            name="referralSource"
            defaultValue={referral}
            className={selectClass}
          >
            <option value="" disabled hidden={Boolean(referral)}>
              Select an option
            </option>
            {ONBOARDING_REFERRAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error ? (
        <p className="mt-4 shrink-0 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="mt-4 shrink-0 text-sm text-foreground" role="status">
          {state.success}
        </p>
      ) : null}

      <div className="mt-auto shrink-0 space-y-4 pt-6">
        <SubmitButton variant={variant} isPersonal={isPersonal} />
        {!isSettings ? (
          <div className="flex items-center justify-between gap-4">
            <OnboardingProgressDots
              currentStep={currentStep}
              totalSteps={totalSteps}
            />
            <Link
              href={ONBOARDING_PATHS.gettingStarted}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back
            </Link>
          </div>
        ) : null}
      </div>
    </form>
  );
}
