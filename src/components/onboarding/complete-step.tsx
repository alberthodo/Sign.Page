"use client";

import { useTransition } from "react";
import { completeProOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";

export function CompleteStep() {
  const [isPending, startTransition] = useTransition();

  function handleGetStarted() {
    startTransition(async () => {
      await completeProOnboarding();
    });
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li>Pro / Team plan is active (or simulated in dev)</li>
        <li>Team invites will be sent when email is configured</li>
        <li>Create a project and share a client review link next</li>
      </ul>

      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        disabled={isPending}
        onClick={handleGetStarted}
      >
        {isPending ? "Opening workspace…" : "Get started"}
      </Button>
    </div>
  );
}
