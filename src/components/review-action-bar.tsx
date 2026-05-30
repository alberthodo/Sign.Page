"use client";

import { Button } from "@/components/ui/button";

type ReviewActionBarProps = {
  approveLabel: string;
  isPending: boolean;
  error: string | null;
  onApprove: () => void;
};

export function ReviewActionBar({
  approveLabel,
  isPending,
  error,
  onApprove,
}: ReviewActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Review everything above, then approve when it looks good.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            disabled={isPending}
            onClick={onApprove}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {approveLabel}
          </Button>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
