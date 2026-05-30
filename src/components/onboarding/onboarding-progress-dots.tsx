import { cn } from "@/lib/utils";

type OnboardingProgressDotsProps = {
  currentStep: number;
  totalSteps: number;
};

export function OnboardingProgressDots({
  currentStep,
  totalSteps,
}: OnboardingProgressDotsProps) {
  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`Step ${currentStep} of ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCurrent = step === currentStep;
        const isPast = step < currentStep;
        return (
          <span
            key={step}
            className={cn(
              "h-1.5 rounded-full transition-all",
              isCurrent ? "w-6 bg-foreground" : "w-1.5",
              isPast && !isCurrent && "bg-foreground/40",
              !isPast && !isCurrent && "bg-muted-foreground/25",
            )}
          />
        );
      })}
    </div>
  );
}
