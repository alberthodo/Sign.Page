"use client";

import { useTransition } from "react";
import Link from "next/link";
import { simulateOnboardingCheckoutSuccess } from "@/app/actions/onboarding";
import { OnboardingCheckoutPreview } from "@/components/onboarding/onboarding-previews";
import { Button } from "@/components/ui/button";
import { ONBOARDING_PATHS } from "@/lib/onboarding/constants";
type CheckoutStepProps = {
  stripeConfigured: boolean;
  checkoutCancelled?: boolean;
};

export function CheckoutStep({
  stripeConfigured,
  checkoutCancelled,
}: CheckoutStepProps) {
  const [isPending, startTransition] = useTransition();
  const devMode = process.env.NODE_ENV === "development";

  function handleDevSimulate() {
    startTransition(async () => {
      await simulateOnboardingCheckoutSuccess();
    });
  }

  return (
    <>
      <div className="space-y-5">
        {checkoutCancelled ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Checkout was cancelled. You can try again when you are ready.
          </p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Upgrade to Pro / Team to unlock shared workspaces and team invites.
          After payment, return here and click Get started.
        </p>

        {stripeConfigured ? (
          <Button
            nativeButton={false}
            size="lg"
            className="w-full sm:w-auto"
            render={
              <a href="/api/stripe/checkout?onboarding=1">Continue to secure checkout</a>
            }
          >
            Continue to secure checkout
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Stripe is not configured yet. In development, simulate a successful
              payment to continue testing onboarding.
            </p>
            {devMode ? (
              <Button
                type="button"
                size="lg"
                disabled={isPending}
                onClick={handleDevSimulate}
              >
                {isPending ? "Processing…" : "Simulate successful payment (dev)"}
              </Button>
            ) : (
              <p className="text-sm text-destructive">
                Billing is not available. Contact support or try again later.
              </p>
            )}
          </div>
        )}

        <Button
          nativeButton={false}
          variant="ghost"
          size="sm"
          render={<Link href={ONBOARDING_PATHS.invites} />}
        >
          Back
        </Button>
      </div>

      <div className="mt-8 lg:hidden">
        <OnboardingCheckoutPreview />
      </div>
    </>
  );
}
