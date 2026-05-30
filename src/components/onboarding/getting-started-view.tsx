"use client";

import { useState } from "react";
import {
  PLAN_SELECTION_FORM_ID,
  PlanSelectionForm,
} from "@/components/onboarding/plan-selection-form";
import { skipOnboardingFromPlanStep } from "@/app/actions/onboarding";
import { cn } from "@/lib/utils";
import { OnboardingModalLayout } from "@/components/onboarding/onboarding-modal-layout";
import { OnboardingPlanPreview } from "@/components/onboarding/onboarding-previews";
import type { OnboardingPlan } from "@/types/database";

type GettingStartedViewProps = {
  initialPlan: OnboardingPlan | null;
  currentStep: number;
  totalSteps: number;
};

export function GettingStartedView({
  initialPlan,
  currentStep,
  totalSteps,
}: GettingStartedViewProps) {
  const [selectedPlan, setSelectedPlan] = useState<OnboardingPlan | null>(
    initialPlan,
  );
  const canContinue = selectedPlan === "personal";

  return (
    <OnboardingModalLayout
      title="Choose a plan for Sign.page"
      preview={<OnboardingPlanPreview selectedPlan={selectedPlan} />}
      previewFooter={
        <button
          type="submit"
          form={PLAN_SELECTION_FORM_ID}
          formAction={skipOnboardingFromPlanStep}
          disabled={!canContinue}
          className={cn(
            "text-sm text-muted-foreground transition-colors hover:text-foreground",
            !canContinue && "cursor-not-allowed opacity-50 hover:text-muted-foreground",
          )}
        >
          Skip onboarding
        </button>
      }
    >
      <PlanSelectionForm
        initialPlan={initialPlan}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPlanChange={setSelectedPlan}
      />
    </OnboardingModalLayout>
  );
}
