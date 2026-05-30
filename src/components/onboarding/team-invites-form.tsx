"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import {
  saveOnboardingInvites,
  skipOnboardingInvites,
  type OnboardingActionState,
} from "@/app/actions/onboarding";
import { OnboardingInvitesPreview } from "@/components/onboarding/onboarding-previews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_ONBOARDING_TEAM_INVITES,
  ONBOARDING_PATHS,
} from "@/lib/onboarding/constants";

type TeamInvitesFormProps = {
  initialEmails: string[];
};

export function TeamInvitesForm({ initialEmails }: TeamInvitesFormProps) {
  const [emails, setEmails] = useState<string[]>(
    initialEmails.length > 0 ? initialEmails : [""],
  );
  const [state, formAction, isPending] = useActionState(
    saveOnboardingInvites,
    {} as OnboardingActionState,
  );

  function addRow() {
    if (emails.length >= MAX_ONBOARDING_TEAM_INVITES) return;
    setEmails([...emails, ""]);
  }

  function removeRow(index: number) {
    setEmails(emails.filter((_, i) => i !== index));
  }

  function updateRow(index: number, value: string) {
    setEmails(emails.map((e, i) => (i === index ? value : e)));
  }

  const filledEmails = emails.map((e) => e.trim()).filter(Boolean);

  return (
    <>
      <form action={formAction} className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Invite up to {MAX_ONBOARDING_TEAM_INVITES} teammates by email. You can
          add more later from settings.
        </p>

        <div className="space-y-3">
          {emails.map((email, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor={`invite-${index}`} className="sr-only">
                  Email {index + 1}
                </Label>
                <Input
                  id={`invite-${index}`}
                  name="inviteEmail"
                  type="email"
                  value={email}
                  onChange={(e) => updateRow(index, e.target.value)}
                  placeholder="teammate@company.com"
                  className="h-10 bg-white"
                />
              </div>
              {emails.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove email"
                  onClick={() => removeRow(index)}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>

        {emails.length < MAX_ONBOARDING_TEAM_INVITES ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
          >
            <Plus className="size-4" />
            Add another
          </Button>
        ) : null}

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? "Continuing…" : "Continue to payment"}
          </Button>
          <form action={skipOnboardingInvites} className="inline">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={isPending}
            >
              Skip for now
            </Button>
          </form>
          <Button
            nativeButton={false}
            variant="ghost"
            size="sm"
            render={<Link href={ONBOARDING_PATHS.profile} />}
          >
            Back
          </Button>
        </div>
      </form>

      <div className="mt-8 lg:hidden">
        <OnboardingInvitesPreview emails={filledEmails} />
      </div>
    </>
  );
}
