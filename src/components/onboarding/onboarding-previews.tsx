"use client";

import type { ReactNode } from "react";
import { Check, CreditCard, Mail, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { OnboardingPlanOrbitPreview } from "@/components/onboarding/onboarding-plan-orbit";
import { cn } from "@/lib/utils";
import type { OnboardingPlan } from "@/types/database";

export function OnboardingPlanPreview({
  selectedPlan,
}: {
  selectedPlan: OnboardingPlan | null;
}) {
  return <OnboardingPlanOrbitPreview selectedPlan={selectedPlan} />;
}

export function OnboardingProfilePreview({
  displayName,
  companyName,
  jobTitle,
  teamSizeLabel,
  plan,
}: {
  displayName: string;
  companyName: string;
  jobTitle: string;
  teamSizeLabel?: string;
  plan: OnboardingPlan | null;
}) {
  const isPro = plan === "pro";
  const titleText = isPro
    ? teamSizeLabel?.trim() || "Select team size"
    : jobTitle.trim() || "Your job title";
  const companyText = companyName.trim() || "Organization";

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        Your personal access badge
      </p>
      <div className="flex min-h-[15.5rem] flex-col rounded-xl border bg-card p-7 shadow-sm">
        <div className="flex shrink-0 items-center justify-between gap-4 text-sm">
          <BrandLogo variant="header" tone="light" wordmarkClassName="text-sm" />
          <span className="shrink-0 font-heading font-semibold tracking-tight text-muted-foreground">
            {isPro ? "pro" : "personal"}
          </span>
        </div>
        <div className="mt-auto space-y-2 text-sm">
          <p className="truncate text-base font-medium text-foreground">
            {displayName.trim() || "Your name"}
          </p>
          <p className="truncate text-muted-foreground">
            {titleText}
            <span aria-hidden> | </span>
            {companyText}
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewLine({
  children,
  filled,
}: {
  children: ReactNode;
  filled: boolean;
}) {
  return (
    <p
      className={cn(
        "truncate",
        filled ? "font-medium text-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export function OnboardingInvitesPreview({ emails }: { emails: string[] }) {
  const slots = Array.from({ length: 5 }, (_, i) => emails[i] ?? null);

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Team workspace
      </p>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="size-4" />
          Up to 5 invites
        </div>
        <ul className="mt-4 space-y-2">
          {slots.map((email, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm"
            >
              <Mail className="size-3.5 shrink-0 text-muted-foreground" />
              <span className={cn("truncate", !email && "text-muted-foreground")}>
                {email || `teammate${i + 1}@company.com`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function OnboardingCheckoutPreview() {
  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Secure checkout
      </p>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <CreditCard className="size-5" />
          </span>
          <div>
            <p className="font-medium">Pro / Team</p>
            <p className="text-sm text-muted-foreground">
              Powered by Stripe when configured
            </p>
          </div>
        </div>
        <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
          <li>Return here after payment</li>
          <li>Click Get started to open your workspace</li>
          <li>Change or cancel billing anytime in settings</li>
        </ul>
      </div>
    </div>
  );
}

export function OnboardingCompletePreview({
  plan,
  inviteCount,
}: {
  plan: OnboardingPlan | null;
  inviteCount: number;
}) {
  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        You are ready
      </p>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex size-12 items-center justify-center rounded-full bg-foreground text-background">
          <Check className="size-6" />
        </div>
        <p className="mt-4 text-lg font-semibold">Workspace active</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {plan === "pro"
            ? `Pro / Team plan${inviteCount > 0 ? ` · ${inviteCount} invite${inviteCount === 1 ? "" : "s"} queued` : ""}`
            : "Personal plan · free"}
        </p>
        <div className="mt-6 rounded-lg bg-muted/40 px-4 py-3 text-sm">
          Next: create a project and send your first client review link.
        </div>
      </div>
    </div>
  );
}
