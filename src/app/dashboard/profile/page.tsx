import { redirect } from "next/navigation";
import { ProfileEditView } from "@/components/profile/profile-edit-view";
import { getOnboardingProfile } from "@/lib/onboarding/server";

export default async function DashboardProfilePage() {
  const ctx = await getOnboardingProfile();
  if (!ctx) {
    redirect("/login");
  }

  const { profile } = ctx;
  if (!profile.onboarding_plan) {
    redirect("/dashboard");
  }

  return <ProfileEditView profile={profile} plan={profile.onboarding_plan} />;
}
