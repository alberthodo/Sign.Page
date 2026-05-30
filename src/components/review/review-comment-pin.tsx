"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ReviewCommentPinProps = {
  /** Project-wide note number (chronological), not message count in thread. */
  noteNumber?: number;
  selected?: boolean;
  pending?: boolean;
  onClick: () => void;
  className?: string;
};

export function ReviewCommentPin({
  noteNumber,
  selected,
  pending,
  onClick,
  className,
}: ReviewCommentPinProps) {
  const label =
    noteNumber != null && noteNumber > 0
      ? `Note ${noteNumber}`
      : pending
        ? "New comment"
        : "Comment";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute z-20 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-md transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary text-primary-foreground scale-110"
          : pending
            ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
            : "border-background bg-foreground text-background hover:scale-105",
        className,
      )}
    >
      {noteNumber != null && noteNumber > 0 ? (
        <span className="text-xs font-semibold tabular-nums">
          {noteNumber > 99 ? "99+" : noteNumber}
        </span>
      ) : (
        <MessageCircle className="size-4" strokeWidth={2} />
      )}
    </button>
  );
}
