import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OnboardingLayoutProps = {
  userEmail: string;
  currentStep: number;
  totalSteps: number;
  title: string;
  description?: string;
  children: ReactNode;
  preview: ReactNode;
  footer?: ReactNode;
};

export function OnboardingLayout({
  userEmail,
  currentStep,
  totalSteps,
  title,
  description,
  children,
  preview,
  footer,
}: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <BrandLogo href="/" variant="display" tone="light" />
          <p className="hidden truncate text-sm text-muted-foreground sm:block">
            {userEmail}
          </p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col lg:flex-row">
        <div className="flex w-full flex-col border-b lg:w-[42%] lg:border-b-0 lg:border-r">
          <div className="flex flex-1 flex-col px-6 py-8 sm:px-10 sm:py-10">
            <div className="mb-8 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                {title}
              </h1>
              {description ? (
                <p className="text-sm text-muted-foreground text-pretty">
                  {description}
                </p>
              ) : null}
            </div>

            <div className="flex-1">{children}</div>

            {footer ? <div className="mt-8">{footer}</div> : null}
          </div>

          <footer className="flex items-center justify-between gap-4 border-t px-6 py-4 sm:px-10">
            <div className="flex items-center gap-1.5" aria-label={`Step ${currentStep} of ${totalSteps}`}>
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
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                Sign out
              </Button>
            </form>
          </footer>
        </div>

        <div className="hidden min-h-[280px] flex-1 bg-muted/20 lg:flex lg:min-h-0 lg:flex-col lg:justify-center lg:p-10">
          {preview}
        </div>
      </div>
    </div>
  );
}
