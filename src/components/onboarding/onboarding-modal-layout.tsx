"use client";

import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

type OnboardingModalLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
  preview: ReactNode;
  previewHeader?: ReactNode;
  previewFooter?: ReactNode;
  /** Dimmed backdrop behind the panel (onboarding). Off for in-app profile edit. */
  showBackdrop?: boolean;
  /** Sign out link below the panel (onboarding). Off when the app header has account menu. */
  showSignOut?: boolean;
  dialogClassName?: string;
};

export function OnboardingModalLayout({
  title,
  description,
  children,
  preview,
  previewHeader,
  previewFooter,
  showBackdrop = true,
  showSignOut = true,
  dialogClassName,
}: OnboardingModalLayoutProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-muted/50">
      {showBackdrop ? (
        <div
          className="pointer-events-none fixed inset-0 z-40 bg-black/40 supports-backdrop-filter:backdrop-blur-sm"
          aria-hidden
        />
      ) : null}

      <div className="relative z-50 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 pb-5 pt-5 sm:px-6">
        <div className="flex max-h-full w-full max-w-6xl flex-col items-center gap-3">
          <div
            role="dialog"
            aria-modal="true"
            className={cn(
              "flex w-full min-h-0 flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10",
              "h-[min(82dvh,640px,calc(100dvh-11rem))] max-h-[min(92dvh,820px,calc(100dvh-11rem))]",
              dialogClassName,
            )}
          >
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[2fr_3fr]">
              <div className="flex min-h-0 flex-col">
                <div className="flex min-h-0 flex-1 flex-col px-6 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-6">
                  <div className="mb-6 shrink-0 space-y-2">
                    <h1 className="text-xl font-semibold tracking-tight text-balance">
                      {title}
                    </h1>
                    {description ? (
                      <p className="text-sm text-muted-foreground text-pretty">
                        {description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col">{children}</div>
                </div>
              </div>

              <div className="hidden min-h-0 flex-col bg-muted/30 p-6 lg:flex">
                <div className="flex min-h-0 flex-1 flex-col">
                  {previewHeader ? (
                    <div className="flex shrink-0 justify-end">{previewHeader}</div>
                  ) : null}
                  <div className="flex min-h-0 flex-1 items-center justify-center">
                    {preview}
                  </div>
                  {previewFooter ? (
                    <div className="flex shrink-0 justify-end pt-4">
                      {previewFooter}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {showSignOut ? (
            <form action={signOut} className="shrink-0">
              <button
                type="submit"
                className="text-sm text-white/90 transition-colors hover:text-white"
              >
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
