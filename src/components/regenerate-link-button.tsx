"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { regenerateReviewToken } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { cn } from "@/lib/utils";

type RegenerateLinkButtonProps = {
  projectId: string;
  hasToken: boolean;
  /** Hide helper text below the button (e.g. inline in a toolbar). */
  compact?: boolean;
};

export function RegenerateLinkButton({
  projectId,
  hasToken,
  compact = false,
}: RegenerateLinkButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);

  function handleRegenerate() {
    const message = hasToken
      ? "Rotate the client link? The current URL will stop working immediately."
      : "Create a client review link for this project?";

    if (!window.confirm(message)) {
      return;
    }

    setError(null);
    setNewUrl(null);

    startTransition(async () => {
      const result = await regenerateReviewToken(projectId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.reviewUrl) {
        setNewUrl(result.reviewUrl);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:items-start">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={handleRegenerate}
      >
        <RefreshCw className={cn("size-4", isPending && "animate-spin")} />
        {isPending ? "Rotating…" : hasToken ? "Rotate link" : "Create link"}
      </Button>
      {newUrl ? <CopyLinkButton url={newUrl} label="Copy new link" /> : null}
      {error ? (
        <p className={compact ? "sr-only" : "text-xs text-destructive"}>{error}</p>
      ) : null}
    </div>
  );
}
