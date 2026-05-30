"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { regenerateFolderReviewToken } from "@/app/actions/folders";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { cn } from "@/lib/utils";

type RegenerateFolderLinkButtonProps = {
  folderId: string;
  hasToken: boolean;
};

export function RegenerateFolderLinkButton({
  folderId,
  hasToken,
}: RegenerateFolderLinkButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);

  function handleRegenerate() {
    const message = hasToken
      ? "Rotate this folder link? The current URL will stop working."
      : "Create a client link for this folder?";

    if (!window.confirm(message)) {
      return;
    }

    setError(null);
    setNewUrl(null);

    startTransition(async () => {
      const result = await regenerateFolderReviewToken(folderId);
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
    <div className="flex flex-wrap items-center gap-2">
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
        <p className="w-full text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
