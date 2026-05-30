import { redirect } from "next/navigation";
import { ONBOARDING_PATHS } from "@/lib/onboarding/constants";

export default function OnboardingIndexPage() {
  redirect(ONBOARDING_PATHS.gettingStarted);
}
