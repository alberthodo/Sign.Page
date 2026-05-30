import { CheckoutStep } from "@/components/onboarding/checkout-step";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { OnboardingCheckoutPreview } from "@/components/onboarding/onboarding-previews";
import { ONBOARDING_PATHS } from "@/lib/onboarding/constants";
import { onboardingStepIndex } from "@/lib/onboarding/profile";
import { guardOnboardingPage } from "@/lib/onboarding/guard";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function OnboardingCheckoutPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { userEmail, profile } = await guardOnboardingPage(ONBOARDING_PATHS.checkout);

  if (profile.onboarding_plan !== "pro") {
    redirect(ONBOARDING_PATHS.profile);
  }

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const { current, total } = onboardingStepIndex(ONBOARDING_PATHS.checkout, "pro");

  return (
    <OnboardingLayout
      userEmail={userEmail}
      currentStep={current}
      totalSteps={total}
      title="Upgrade to Pro / Team"
      description="Complete checkout to activate your team workspace."
      preview={<OnboardingCheckoutPreview />}
    >
      <CheckoutStep
        stripeConfigured={stripeConfigured}
        checkoutCancelled={params.checkout === "cancelled"}
      />
    </OnboardingLayout>
  );
}
