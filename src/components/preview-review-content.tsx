"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  addFreelancerReviewMessage,
  listFolderReviewThreadsForOwner,
  listProjectReviewThreadsForOwner,
  type ReviewThread,
} from "@/app/actions/review";
import { buildThreadNumberByIdMap } from "@/lib/review-thread-numbers";
import { groupReviewThreadsByBlockId } from "@/lib/review-threads";
import {
  FolderContentReview,
  type FolderContentReviewCommentsProps,
} from "@/components/folder-content-review";
import { ReviewThreadPanel } from "@/components/review-thread-panel";
import { resolveFolderBlocks } from "@/lib/folder-content";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type PreviewReviewContentProps = {
  projectId: string;
  folderId: string;
  folderName: string;
  contentBlocks: unknown;
  assets: string[];
};

export function PreviewReviewContent({
  projectId,
  folderId,
  folderName,
  contentBlocks,
  assets,
}: PreviewReviewContentProps) {
  const [threads, setThreads] = useState<ReviewThread[]>([]);
  const [projectThreads, setProjectThreads] = useState<ReviewThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, startSend] = useTransition();

  const blocks = useMemo(
    () => resolveFolderBlocks(contentBlocks, assets),
    [contentBlocks, assets],
  );

  const threadsByBlock = useMemo(
    () => groupReviewThreadsByBlockId(threads),
    [threads],
  );

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
  }, [projectId, folderId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const selectThread = useCallback(
    (threadId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      setActiveThreadId(threadId);
      setActiveBlockId(thread.block_id);
      setPanelOpen(true);
      document.getElementById(`review-block-${thread.block_id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    },
    [threads],
  );

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
      });
    },
    [projectId, folderId, loadThreads],
  );

  const commentsProps: FolderContentReviewCommentsProps = {
    threadsByBlock,
    threadNumberById,
    commentMode: false,
    canComment: false,
    activeThreadId,
    activeBlockId,
    pendingPin: null,
    stickyOpen: false,
    stickyBody: "",
    stickyClientName: "",
    showClientName: false,
    sending: false,
    stickyError: null,
    onStickyBodyChange: () => {},
    onStickyClientNameChange: () => {},
    onBlockClick: () => {},
    onPinClick: selectThread,
    onStickySend: () => {},
    onStickyCancel: () => {},
  };

  return (
    <>
      <div
        className={cn(
          "transition-opacity",
        )}
      >
        {threads.length > 0 ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <MessageSquare className="mr-1.5 inline size-4 align-text-bottom" />
              Client pins on this preview — click a pin to read and reply.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPanelOpen((o) => !o)}
            >
              Comments ({threads.length})
            </Button>
          </div>
        ) : null}

        <FolderContentReview
          contentBlocks={contentBlocks}
          assets={assets}
          folderName={folderName}
          readOnly
          comments={threads.length > 0 ? commentsProps : undefined}
        />
      </div>

      <ReviewThreadPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        folderName={folderName}
        blocks={blocks}
        threads={threads}
        threadNumberById={threadNumberById}
        activeThreadId={activeThreadId}
        onSelectThread={selectThread}
        onBack={() => {
          setActiveThreadId(null);
          setActiveBlockId(null);
        }}
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
