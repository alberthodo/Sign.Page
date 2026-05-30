"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { publishFolderForReview } from "@/app/actions/folders";
import { Button } from "@/components/ui/button";

export type FolderPublishIntent = "initial" | "revision";

type FolderPublishButtonProps = {
  folderId: string;
  intent?: FolderPublishIntent;
  className?: string;
};

const COPY: Record<
  FolderPublishIntent,
  { message: string; button: string; loading: string }
> = {
  initial: {
    message:
      "Edits save automatically. Publish when you are ready for your client to see this folder.",
    button: "Publish for client review",
    loading: "Publishing…",
  },
  revision: {
    message:
      "When you are done updating, send this revision. Your client can approve or request changes again.",
    button: "Send revision to client",
    loading: "Sending revision…",
  },
};

export function FolderPublishButton({
  folderId,
  intent = "initial",
  className,
}: FolderPublishButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[intent];

  async function handlePublish() {
    setError(null);
    setLoading(true);
    const result = await publishFolderForReview(folderId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className={className}>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{copy.message}</p>
        <div className="flex w-full shrink-0 flex-col items-stretch gap-1 sm:w-auto sm:items-end">
          <Button type="button" size="sm" disabled={loading} onClick={handlePublish}>
            {loading ? copy.loading : copy.button}
          </Button>
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
