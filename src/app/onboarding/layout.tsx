import type { Metadata } from "next";
import { getAppName } from "@/lib/app-name";
import { isOnboardingDevForceNewUser } from "@/lib/onboarding/dev";
import { privateAppRouteMetadata } from "@/lib/seo/app-routes";

export const metadata: Metadata = {
  ...privateAppRouteMetadata,
  title: "Get started",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appName = getAppName();
  const devBanner = isOnboardingDevForceNewUser();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {devBanner ? (
        <div
          className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950"
          role="status"
        >
          Dev mode: open{" "}
          <code className="rounded bg-amber-100 px-1">/onboarding/getting-started</code>{" "}
          to run onboarding again. Set{" "}
          <code className="rounded bg-amber-100 px-1">SIGNOFF_ONBOARDING_ALWAYS_NEW=false</code>{" "}
          to hide this banner.
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
