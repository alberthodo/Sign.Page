"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addFreelancerReviewMessage,
  listFolderReviewThreadsForOwner,
  listProjectReviewThreadsForOwner,
  type ReviewThread,
} from "@/app/actions/review";
import type { FolderContentReviewCommentsProps } from "@/components/folder-content-review";
import { resolveFolderBlocks } from "@/lib/folder-content";
import { buildThreadNumberByIdMap } from "@/lib/review-thread-numbers";
import { groupReviewThreadsByBlockId } from "@/lib/review-threads";

export function useProjectFolderFeedback({
  projectId,
  folderId,
  contentBlocks,
  assets,
  feedbackMode,
}: {
  projectId: string;
  folderId: string;
  contentBlocks: unknown;
  assets: string[];
  feedbackMode: boolean;
}) {
  const router = useRouter();
  const [threads, setThreads] = useState<ReviewThread[]>([]);
  const [projectThreads, setProjectThreads] = useState<ReviewThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
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
    setError(null);
  }, [projectId, folderId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    setActiveThreadId(null);
    setActiveBlockId(null);
  }, [folderId]);

  const selectThread = useCallback(
    (threadId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      setActiveThreadId(threadId);
      setActiveBlockId(thread.block_id);
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
        router.refresh();
      });
    },
    [projectId, folderId, threads, loadThreads, router],
  );

  const commentsProps: FolderContentReviewCommentsProps | undefined = feedbackMode
    ? {
        threadsByBlock,
        threadNumberById,
        commentMode: true,
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
      }
    : undefined;

  return {
    blocks,
    threads,
    threadNumberById,
    loading,
    error,
    activeThreadId,
    activeBlockId,
    setActiveThreadId,
    setActiveBlockId,
    selectThread,
    handlePanelSend,
    sending,
    commentsProps,
    folderCommentCount: threads.length,
    reloadThreads: loadThreads,
  };
}
