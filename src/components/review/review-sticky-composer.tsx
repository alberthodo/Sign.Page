"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ReviewStickyComposerProps = {
  open: boolean;
  body: string;
  onBodyChange: (value: string) => void;
  clientName: string;
  onClientNameChange: (value: string) => void;
  showClientName: boolean;
  sending: boolean;
  error?: string | null;
  onSend: () => void;
  onCancel: () => void;
  className?: string;
};

export function ReviewStickyComposer({
  open,
  body,
  onBodyChange,
  clientName,
  onClientNameChange,
  showClientName,
  sending,
  error,
  onSend,
  onCancel,
  className,
}: ReviewStickyComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => textareaRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && body.trim()) {
        onSend();
      }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div
      className={cn(
        "absolute z-30 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border bg-background shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        className,
      )}
      style={{ top: "calc(100% + 0.5rem)" }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Add comment"
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">Leave feedback</p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7"
          onClick={onCancel}
          aria-label="Cancel"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="space-y-2 p-3">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="What should change?"
          disabled={sending}
          className="min-h-[4.5rem] resize-none text-sm"
        />
        {showClientName ? (
          <input
            type="text"
            value={clientName}
            onChange={(e) => onClientNameChange(e.target.value)}
            placeholder="Your name (optional)"
            disabled={sending}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        ) : null}
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            Enter to send · Shift+Enter for new line
          </p>
          <Button
            type="button"
            size="sm"
            disabled={sending || !body.trim()}
            onClick={onSend}
          >
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
