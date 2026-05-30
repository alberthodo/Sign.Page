"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageSquare, Minus, X } from "lucide-react";
import type { ReviewThread } from "@/app/actions/review";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewBlockLabelById } from "@/lib/review-block-label";
import type { FolderContentBlock } from "@/lib/folder-content";
import { cn } from "@/lib/utils";

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function authorLabel(
  author: "client" | "freelancer",
  authorName: string | null,
  freelancerDisplayName: string,
): string {
  if (author === "freelancer") {
    return freelancerDisplayName;
  }
  return authorName?.trim() || "Client";
}

type ReviewThreadPanelProps = {
  open: boolean;
  onClose: () => void;
  folderName: string;
  blocks: FolderContentBlock[];
  threads: ReviewThread[];
  threadNumberById?: Map<string, number>;
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onBack: () => void;
  onSend: (threadId: string, body: string, clientName?: string | null) => void;
  canSend: boolean;
  sending: boolean;
  loading?: boolean;
  error?: string | null;
  showClientName?: boolean;
  freelancerDisplayName?: string;
};

export function ReviewThreadPanel({
  open,
  onClose,
  folderName,
  blocks,
  threads,
  threadNumberById,
  activeThreadId,
  onSelectThread,
  onBack,
  onSend,
  canSend,
  sending,
  loading,
  error,
  showClientName = true,
  freelancerDisplayName = "You",
}: ReviewThreadPanelProps) {
  const activeThread = useMemo(
    () => (activeThreadId ? threads.find((t) => t.id === activeThreadId) : null),
    [threads, activeThreadId],
  );
  const [draft, setDraft] = useState("");
  const [clientName, setClientName] = useState("");
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    setDraft("");
  }, [activeThreadId]);

  useEffect(() => {
    if (!open) {
      setMinimized(false);
    }
  }, [open]);

  if (!open) return null;

  const view: "list" | "thread" = activeThread ? "thread" : "list";
  const noteCount = threads.length;

  const expandedPanelClass = cn(
    "fixed z-50 flex flex-col bg-background shadow-xl",
    "max-sm:inset-x-0 max-sm:bottom-0 max-sm:border-t",
    "sm:top-24 sm:right-6 sm:bottom-6 sm:w-[min(100%,26rem)] sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl",
  );

  const minimizedPanelClass = cn(
    "fixed z-50 h-auto bg-background shadow-xl",
    "inset-x-0 bottom-0 border-t",
    "sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[min(100%,26rem)] sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl",
  );

  if (minimized) {
    return (
      <aside className={minimizedPanelClass} aria-label="Comments">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => setMinimized(false)}
          >
            <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium">Comments</span>
            {noteCount > 0 ? (
              <span className="shrink-0 rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs tabular-nums">
                {noteCount}
              </span>
            ) : null}
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setMinimized(false)}
              aria-label="Expand comments"
              title="Expand"
            >
              <Minus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close comments"
              title="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={expandedPanelClass} aria-label="Comments">
      <div className="flex h-[min(70dvh,100%)] flex-col sm:h-[calc(100dvh-7.5rem)]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {view === "thread" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onBack}
                aria-label="Back to list"
              >
                <ArrowLeft className="size-4" />
              </Button>
            ) : (
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                <MessageSquare className="size-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {view === "thread" ? "Thread" : "Comments"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {view === "thread" && activeThread
                  ? reviewBlockLabelById(activeThread.block_id, blocks)
                  : folderName}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setMinimized(true)}
              aria-label="Minimize comments"
              title="Minimize"
            >
              <Minus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close comments"
              title="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {view === "list" ? (
            <div className="h-full overflow-y-auto p-3">
              <p className="mb-2 px-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Comments on this deliverable
              </p>
              {loading ? (
                <p className="px-1 text-sm text-muted-foreground">Loading…</p>
              ) : threads.length === 0 ? (
                <div className="space-y-2 px-1 py-2">
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Turn on review mode, then click anywhere on an item to leave feedback.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {threads.map((t) => {
                    const last = t.messages[t.messages.length - 1];
                    const label = reviewBlockLabelById(t.block_id, blocks);
                    const noteNumber = threadNumberById?.get(t.id);
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          className={cn(
                            "w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                            "hover:bg-muted/60",
                          )}
                          onClick={() => onSelectThread(t.id)}
                        >
                          <p className="truncate text-xs font-medium text-muted-foreground">
                            {noteNumber != null ? (
                              <span className="mr-1.5 text-foreground tabular-nums">
                                #{noteNumber}
                              </span>
                            ) : null}
                            {label}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-sm">
                            {last?.body ?? "Thread"}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {t.messages.length}{" "}
                            {t.messages.length === 1 ? "message" : "messages"}
                            {last ? ` · ${formatRelativeTime(last.created_at)}` : ""}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : activeThread ? (
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {activeThread.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-xl border px-3 py-2.5",
                        m.author === "freelancer"
                          ? "border-primary/20 bg-primary/5"
                          : "bg-card",
                      )}
                    >
                      <p className="text-xs font-medium text-muted-foreground">
                        {authorLabel(m.author, m.author_name, freelancerDisplayName)}
                        <span className="font-normal"> · {formatRelativeTime(m.created_at)}</span>
                      </p>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                        {m.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="shrink-0 border-t bg-muted/20 p-4">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (canSend && !sending && draft.trim() && activeThreadId) {
                        onSend(activeThreadId, draft, clientName);
                        setDraft("");
                      }
                    }
                  }}
                  rows={3}
                  placeholder={canSend ? "Reply in this thread…" : "Comments are read-only."}
                  disabled={!canSend || sending}
                  className="min-h-[4.5rem] resize-none bg-background text-sm"
                />
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {showClientName ? (
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Your name (optional)"
                      disabled={!canSend || sending}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:max-w-[11rem]"
                    />
                  ) : (
                    <span />
                  )}
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 sm:ml-auto"
                    disabled={!canSend || sending || !draft.trim()}
                    onClick={() => {
                      if (!activeThreadId) return;
                      onSend(activeThreadId, draft, clientName);
                      setDraft("");
                    }}
                  >
                    {sending ? "Sending…" : "Reply"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="shrink-0 border-t px-4 py-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
