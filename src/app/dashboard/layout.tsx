import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { privateAppRouteMetadata } from "@/lib/seo/app-routes";
import { DashboardHeader } from "@/components/dashboard-header";
import { getOnboardingResumePath, needsOnboarding } from "@/lib/onboarding/profile";
import { getOnboardingProfile } from "@/lib/onboarding/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = privateAppRouteMetadata;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const onboardingCtx = await getOnboardingProfile();
  if (onboardingCtx && needsOnboarding(onboardingCtx.profile)) {
    redirect(getOnboardingResumePath(onboardingCtx.profile));
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardHeader email={user.email ?? ""} />
      <div className="flex flex-1 flex-col bg-muted/30">
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
