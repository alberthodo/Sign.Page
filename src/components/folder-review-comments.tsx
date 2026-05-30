"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, MessageSquare } from "lucide-react";
import {
  addFreelancerReviewMessage,
  listFolderReviewThreadsForOwner,
  listProjectReviewThreadsForOwner,
  type ReviewThread,
} from "@/app/actions/review";
import { buildThreadNumberByIdMap } from "@/lib/review-thread-numbers";
import { ReviewThreadPanel } from "@/components/review-thread-panel";
import { reviewBlockLabelById } from "@/lib/review-block-label";
import { resolveFolderBlocks } from "@/lib/folder-content";
import { clientPreviewPath } from "@/lib/client-preview";
import { Button } from "@/components/ui/button";

type FolderReviewCommentsProps = {
  projectId: string;
  folderId: string;
  folderName: string;
  contentBlocks: unknown;
  assets: string[];
  showWhenEmpty?: boolean;
};

export function FolderReviewComments({
  projectId,
  folderId,
  folderName,
  contentBlocks,
  assets,
  showWhenEmpty = false,
}: FolderReviewCommentsProps) {
  const router = useRouter();
  const [threads, setThreads] = useState<ReviewThread[]>([]);
  const [projectThreads, setProjectThreads] = useState<ReviewThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [sending, startSend] = useTransition();

  const blocks = useMemo(
    () => resolveFolderBlocks(contentBlocks, assets),
    [contentBlocks, assets],
  );

  const previewPath = `${clientPreviewPath(projectId)}?folder=${folderId}`;

  const threadNumberById = useMemo(
    () => buildThreadNumberByIdMap(projectThreads),
    [projectThreads],
  );

  const loadThreads = useCallback(async () => {
    setLoading(true);
    const [folderResult, projectResult] = await Promise.all([
      listFolderReviewThreadsForOwner(projectId, folderId),
      listProjectReviewThreadsForOwner(projectId),
    ]);
    setLoading(false);
    if (folderResult.error) {
      setError(folderResult.error);
      return;
    }
    setThreads(folderResult.threads ?? []);
    if (!projectResult.error) {
      setProjectThreads(projectResult.threads ?? []);
    }
    setError(null);
  }, [projectId, folderId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    setPanelOpen(true);
  }, []);

  const handlePanelSend = useCallback(
    (threadId: string, body: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      startSend(async () => {
        const result = await addFreelancerReviewMessage(
          projectId,
          folderId,
          thread.block_id,
          body,
          threadId,
        );
        if (result.error) {
          setError(result.error);
          return;
        }
        await loadThreads();
        router.refresh();
      });
    },
    [projectId, folderId, threads, loadThreads, router],
  );

  if (!loading && threads.length === 0 && !showWhenEmpty) {
    return null;
  }

  if (!loading && threads.length === 0 && showWhenEmpty) {
    return (
      <section className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Client requested changes</p>
        <p className="mt-1">
          When your client leaves pinned comments on the review link, they will appear
          here.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-4 rounded-xl border bg-muted/20 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Client feedback</h3>
              {!loading ? (
                <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs tabular-nums">
                  {threads.length}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Reply to pinned comments from your client. Open preview to see pin
              locations on the deliverable.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={previewPath}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-muted/50"
            >
              <ExternalLink className="size-3.5" />
              Preview pins
            </Link>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setPanelOpen(true)}
              disabled={loading}
            >
              {loading ? "Loading…" : "Reply to comments"}
            </Button>
          </div>
        </div>

        {!loading && threads.length > 0 ? (
          <ul className="divide-y rounded-lg border bg-background">
            {threads.map((t) => {
              const last = t.messages[t.messages.length - 1];
              const noteNumber = threadNumberById.get(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left text-sm hover:bg-muted/40"
                    onClick={() => selectThread(t.id)}
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {noteNumber != null ? (
                        <span className="mr-1.5 text-foreground tabular-nums">
                          #{noteNumber}
                        </span>
                      ) : null}
                      {reviewBlockLabelById(t.block_id, blocks)}
                    </span>
                    <span className="line-clamp-2">{last?.body ?? "Thread"}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.messages.length}{" "}
                      {t.messages.length === 1 ? "message" : "messages"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <ReviewThreadPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        folderName={folderName}
        blocks={blocks}
        threads={threads}
        threadNumberById={threadNumberById}
        activeThreadId={activeThreadId}
        onSelectThread={selectThread}
        onBack={() => setActiveThreadId(null)}
        onSend={handlePanelSend}
        canSend
        sending={sending}
        loading={loading}
        error={error}
        showClientName={false}
        freelancerDisplayName="You"
      />
    </>
  );
}
