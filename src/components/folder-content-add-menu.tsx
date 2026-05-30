"use client";

import type { PointerEvent } from "react";
import { FileUp, Heading, Type } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Keeps focus in title/text fields so blur-save does not steal the click target. */
function preventBlurOnClick(event: PointerEvent) {
  event.preventDefault();
}

type FolderContentAddMenuProps = {
  fileInputId: string;
  onBeforeFilePick: () => void;
  onAddHeading: () => void;
  onAddText: () => void;
  compact?: boolean;
  className?: string;
};

export function FolderContentAddMenu({
  fileInputId,
  onBeforeFilePick,
  onAddHeading,
  onAddText,
  compact = false,
  className,
}: FolderContentAddMenuProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/30 px-2 py-2",
        compact ? "py-1.5" : "py-2.5",
        className,
      )}
    >
      <span className="mr-1 text-xs text-muted-foreground">Add</span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 gap-1.5 text-xs"
        onPointerDown={preventBlurOnClick}
        onClick={onAddHeading}
      >
        <Heading className="size-3.5" />
        Title
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 gap-1.5 text-xs"
        onPointerDown={preventBlurOnClick}
        onClick={onAddText}
      >
        <Type className="size-3.5" />
        Text
      </Button>
      <label
        htmlFor={fileInputId}
        onClick={onBeforeFilePick}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "inline-flex h-8 cursor-pointer gap-1.5 text-xs",
        )}
      >
        <FileUp className="size-3.5" />
        File
      </label>
    </div>
  );
}
