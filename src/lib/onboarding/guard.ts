import { redirect } from "next/navigation";
import {
  canAccessOnboardingPath,
  getOnboardingResumePath,
  needsOnboarding,
} from "@/lib/onboarding/profile";
import { getOnboardingProfile } from "@/lib/onboarding/server";

export async function requireOnboardingAuth(): Promise<{
  userEmail: string;
  profile: NonNullable<Awaited<ReturnType<typeof getOnboardingProfile>>>["profile"];
}> {
  const ctx = await getOnboardingProfile();
  if (!ctx) {
    redirect("/login");
  }
  return { userEmail: ctx.email, profile: ctx.profile };
}

export async function guardOnboardingPage(pathname: string): Promise<{
  userEmail: string;
  profile: NonNullable<Awaited<ReturnType<typeof getOnboardingProfile>>>["profile"];
}> {
  const { userEmail, profile } = await requireOnboardingAuth();

  if (!needsOnboarding(profile)) {
    redirect("/dashboard");
  }

  if (!canAccessOnboardingPath(profile, pathname)) {
    redirect(getOnboardingResumePath(profile));
  }

  return { userEmail, profile };
}
