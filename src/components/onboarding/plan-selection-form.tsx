"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  selectOnboardingPlanFromForm,
  type OnboardingActionState,
} from "@/app/actions/onboarding";
import { OnboardingProgressDots } from "@/components/onboarding/onboarding-progress-dots";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OnboardingPlan } from "@/types/database";

type PlanSelectionFormProps = {
  initialPlan: OnboardingPlan | null;
  currentStep: number;
  totalSteps: number;
  onPlanChange?: (plan: OnboardingPlan | null) => void;
};

const PLANS: {
  id: OnboardingPlan;
  title: string;
  badge: string;
  description: string;
  comingSoon?: boolean;
}[] = [
  {
    id: "personal",
    title: "Personal",
    badge: "Free",
    description:
      "For solo freelancers and independent client approvals. Projects get deleted after 30 days.",
  },
  {
    id: "pro",
    title: "Pro / Team",
    badge: "Paid",
    description:
      "Invite up to 5 teammates, share a workspace, uniquecustomizations, and more features.",
    comingSoon: true,
  },
];

function ContinueButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full"
      size="lg"
      disabled={disabled || pending}
    >
      {pending ? "Continuing…" : "Continue"}
    </Button>
  );
}

export const PLAN_SELECTION_FORM_ID = "onboarding-plan-selection-form";

export function PlanSelectionForm({
  initialPlan,
  currentStep,
  totalSteps,
  onPlanChange,
}: PlanSelectionFormProps) {
  const [selected, setSelected] = useState<OnboardingPlan | null>(initialPlan);

  function selectPlan(plan: OnboardingPlan) {
    setSelected(plan);
    onPlanChange?.(plan);
  }

  const [state, formAction] = useActionState(
    selectOnboardingPlanFromForm,
    {} as OnboardingActionState,
  );

  const canContinue = selected === "personal";

  return (
    <form
      id={PLAN_SELECTION_FORM_ID}
      action={formAction}
      className="flex min-h-0 flex-1 flex-col"
    >
      <input type="hidden" name="plan" value={selected ?? ""} />

      <div
        className="mt-2 shrink-0 space-y-2"
        role="radiogroup"
        aria-label="Choose a plan"
      >
          {PLANS.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => selectPlan(plan.id)}
                className={cn(
                  "w-full rounded-xl border bg-card p-4 text-left transition-colors",
                  "hover:border-foreground/25",
                  isSelected && "border-foreground/25 bg-muted/10 ring-1 ring-foreground/5",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{plan.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground text-pretty">
                      {plan.description}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                    {plan.badge}
                  </span>
                </div>

                <div
                  className={cn(
                    "mt-4 flex items-center gap-3",
                    plan.comingSoon ? "justify-between" : "justify-end",
                  )}
                >
                  {plan.comingSoon ? (
                    <p className="text-xs font-medium text-muted-foreground">
                      Coming soon
                    </p>
                  ) : null}
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full border",
                      isSelected
                        ? "border-foreground/30 bg-foreground/5"
                        : "border-muted-foreground/25 bg-muted/20",
                    )}
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full transition-opacity",
                        isSelected ? "bg-foreground opacity-100" : "bg-foreground opacity-0",
                      )}
                    />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {state.error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

      <div className="mt-auto shrink-0 space-y-4 pt-6">
        <ContinueButton disabled={!canContinue} />
        <OnboardingProgressDots
          currentStep={currentStep}
          totalSteps={totalSteps}
        />
      </div>
    </form>
  );
}
