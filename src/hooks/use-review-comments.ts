"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addReviewMessage,
  listProjectReviewThreadsByToken,
  listReviewThreads,
  type ReviewThread,
} from "@/app/actions/review";
import { buildThreadNumberByIdMap } from "@/lib/review-thread-numbers";
import {
  countReviewThreadsOnBlock,
  groupReviewThreadsByBlockId,
  MAX_REVIEW_THREADS_PER_BLOCK,
} from "@/lib/review-threads";
import type { PendingCommentPin } from "@/components/review/review-block-comment-layer";
import type { ReviewCommentAnchor } from "@/lib/review-comment-anchor";
import {
  getStoredClientName,
  setStoredClientName,
} from "@/lib/review-client-name";

export function useReviewComments({
  token,
  folderId,
  canComment,
  commentMode,
  onCommentModeChange,
}: {
  token: string;
  folderId: string | null;
  canComment: boolean;
  /** Session-wide feedback mode (lives in ReviewWorkspace, not per folder). */
  commentMode: boolean;
  onCommentModeChange: (enabled: boolean) => void;
}) {
  const router = useRouter();
  const [threads, setThreads] = useState<ReviewThread[]>([]);
  const [projectThreads, setProjectThreads] = useState<ReviewThread[]>([]);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const setCommentMode = onCommentModeChange;
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [pendingPin, setPendingPin] = useState<PendingCommentPin | null>(null);
  const [stickyOpen, setStickyOpen] = useState(false);
  const [stickyBody, setStickyBody] = useState("");
  const [stickyClientName, setStickyClientName] = useState("");
  const [stickyError, setStickyError] = useState<string | null>(null);
  const [sending, startSendTransition] = useTransition();

  const threadsByBlock = useMemo(
    () => groupReviewThreadsByBlockId(threads),
    [threads],
  );

  const threadNumberById = useMemo(
    () => buildThreadNumberByIdMap(projectThreads),
    [projectThreads],
  );

  const loadProjectThreads = useCallback(async () => {
    const result = await listProjectReviewThreadsByToken(token);
    if (!result.error) {
      setProjectThreads(result.threads ?? []);
    }
  }, [token]);

  const loadThreads = useCallback(async () => {
    if (!folderId) {
      setThreads([]);
      return;
    }
    setLoadingThreads(true);
    setThreadsError(null);
    const result = await listReviewThreads(token, folderId);
    setLoadingThreads(false);
    if (result.error) {
      setThreadsError(result.error);
      return;
    }
    setThreads((result.threads ?? []).filter((t) => t.folder_id === folderId));
  }, [token, folderId]);

  useEffect(() => {
    if (!folderId) {
      setThreads([]);
      setLoadingThreads(false);
      setThreadsError(null);
      return;
    }

    let cancelled = false;
    setThreads([]);
    setLoadingThreads(true);
    setThreadsError(null);

    void (async () => {
      const result = await listReviewThreads(token, folderId);
      if (cancelled) return;
      setLoadingThreads(false);
      if (result.error) {
        setThreadsError(result.error);
        setThreads([]);
        return;
      }
      const scoped = (result.threads ?? []).filter((t) => t.folder_id === folderId);
      setThreads(scoped);
    })();

    return () => {
      cancelled = true;
    };
  }, [token, folderId]);

  useEffect(() => {
    setStickyClientName(getStoredClientName(token));
  }, [token]);

  useEffect(() => {
    void loadProjectThreads();
  }, [loadProjectThreads]);

  useEffect(() => {
    setPendingPin(null);
    setStickyOpen(false);
    setStickyBody("");
    setStickyError(null);
    setActiveBlockId(null);
    setActiveThreadId(null);
  }, [folderId]);

  useEffect(() => {
    if (!canComment) {
      setPendingPin(null);
      setStickyOpen(false);
      setStickyBody("");
      setStickyError(null);
    }
  }, [canComment]);

  useEffect(() => {
    if (!commentMode) {
      setPendingPin(null);
      setStickyOpen(false);
      setStickyBody("");
      setStickyError(null);
    }
  }, [commentMode]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveThreadId(null);
        setActiveBlockId(null);
        setPendingPin(null);
        setStickyOpen(false);
        setStickyBody("");
        setStickyError(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectThread = useCallback(
    (threadId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      setActiveThreadId(threadId);
      setActiveBlockId(thread.block_id);
      setPendingPin(null);
      setStickyOpen(false);
      setStickyBody("");
      setStickyError(null);
      setPanelOpen(true);
      document
        .getElementById(`review-block-${thread.block_id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [threads],
  );

  const handleBlockClick = useCallback(
    (blockId: string, anchor: ReviewCommentAnchor) => {
      if (
        countReviewThreadsOnBlock(threadsByBlock, blockId) >=
        MAX_REVIEW_THREADS_PER_BLOCK
      ) {
        setStickyError(
          `You can add up to ${MAX_REVIEW_THREADS_PER_BLOCK} notes per item. Tap an existing pin to reply.`,
        );
        return;
      }
      setActiveThreadId(null);
      setActiveBlockId(blockId);
      setPendingPin({ blockId, anchor });
      setStickyOpen(true);
      setStickyBody("");
      setStickyError(null);
      setPanelOpen(false);
    },
    [threadsByBlock],
  );

  const handlePinClick = useCallback(
    (threadId: string) => {
      selectThread(threadId);
    },
    [selectThread],
  );

  const handleStickyCancel = useCallback(() => {
    setStickyOpen(false);
    setStickyBody("");
    setStickyError(null);
    setPendingPin(null);
    setActiveBlockId(null);
    setActiveThreadId(null);
  }, []);

  const sendMessage = useCallback(
    (
      blockId: string,
      body: string,
      clientName?: string | null,
      anchor?: ReviewCommentAnchor | null,
      threadId?: string | null,
    ) => {
      if (!folderId) return;
      startSendTransition(async () => {
        setStickyError(null);
        const result = await addReviewMessage(
          token,
          folderId,
          blockId,
          body,
          clientName,
          anchor,
          threadId,
        );
        if (result.error) {
          setStickyError(result.error);
          return;
        }
        if (clientName?.trim()) {
          setStoredClientName(token, clientName);
        }
        setStickyOpen(false);
        setStickyBody("");
        setPendingPin(null);
        setPanelOpen(true);
        const nextThreadId = result.threadId ?? threadId ?? null;
        if (nextThreadId) {
          setActiveThreadId(nextThreadId);
          setActiveBlockId(blockId);
        }
        await Promise.all([loadThreads(), loadProjectThreads()]);
        router.refresh();
      });
    },
    [folderId, token, loadThreads, loadProjectThreads, router],
  );

  const handleStickySend = useCallback(() => {
    if (!activeBlockId || !stickyBody.trim()) return;
    const anchor =
      pendingPin?.blockId === activeBlockId ? pendingPin.anchor : null;
    sendMessage(activeBlockId, stickyBody, stickyClientName, anchor, null);
  }, [
    activeBlockId,
    stickyBody,
    stickyClientName,
    pendingPin,
    sendMessage,
  ]);

  const handlePanelSend = useCallback(
    (threadId: string, body: string, clientName?: string | null) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      sendMessage(thread.block_id, body, clientName, null, threadId);
    },
    [threads, sendMessage],
  );

  return {
    threads,
    threadsByBlock,
    threadNumberById,
    threadsError,
    loadingThreads,
    commentMode,
    setCommentMode,
    panelOpen,
    setPanelOpen,
    activeThreadId,
    activeBlockId,
    setActiveBlockId,
    setActiveThreadId,
    pendingPin,
    stickyOpen,
    stickyBody,
    setStickyBody,
    stickyClientName,
    setStickyClientName,
    stickyError,
    sending,
    selectThread,
    handleBlockClick,
    handlePinClick,
    handleStickyCancel,
    handleStickySend,
    handlePanelSend,
    loadThreads,
    commentCount: threads.length,
  };
}

export type ReviewCommentsController = ReturnType<typeof useReviewComments>;
