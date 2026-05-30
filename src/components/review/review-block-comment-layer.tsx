"use client";

import { useRef, type ReactNode } from "react";
import type { ReviewThread } from "@/app/actions/review";
import { ReviewCommentPin } from "@/components/review/review-comment-pin";
import { ReviewStickyComposer } from "@/components/review/review-sticky-composer";
import {
  anchorFromPointerEvent,
  normalizeAnchor,
  pinStyleFromAnchor,
  type ReviewCommentAnchor,
} from "@/lib/review-comment-anchor";
import {
  MAX_REVIEW_THREADS_PER_BLOCK,
} from "@/lib/review-threads";
import { cn } from "@/lib/utils";

export type PendingCommentPin = {
  blockId: string;
  anchor: ReviewCommentAnchor;
};

type ReviewBlockCommentLayerProps = {
  blockId: string;
  threads: ReviewThread[];
  threadNumberById: Map<string, number>;
  commentMode: boolean;
  canComment: boolean;
  activeThreadId: string | null;
  activeBlockId: string | null;
  pendingPin: PendingCommentPin | null;
  stickyOpen: boolean;
  stickyBody: string;
  stickyClientName: string;
  showClientName: boolean;
  sending: boolean;
  stickyError: string | null;
  onStickyBodyChange: (value: string) => void;
  onStickyClientNameChange: (value: string) => void;
  onBlockClick: (blockId: string, anchor: ReviewCommentAnchor) => void;
  onPinClick: (threadId: string) => void;
  onStickySend: () => void;
  onStickyCancel: () => void;
  children: ReactNode;
};

export function ReviewBlockCommentLayer({
  blockId,
  threads,
  threadNumberById,
  commentMode,
  canComment,
  activeThreadId,
  activeBlockId,
  pendingPin,
  stickyOpen,
  stickyBody,
  stickyClientName,
  showClientName,
  sending,
  stickyError,
  onStickyBodyChange,
  onStickyClientNameChange,
  onBlockClick,
  onPinClick,
  onStickySend,
  onStickyCancel,
  children,
}: ReviewBlockCommentLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const blockSelected = activeBlockId === blockId;
  const pendingOnBlock = pendingPin?.blockId === blockId;
  const atThreadLimit = threads.length >= MAX_REVIEW_THREADS_PER_BLOCK;

  const feedbackCapture = commentMode && canComment;

  function handleLayerClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!feedbackCapture) return;
    const el = layerRef.current;
    if (!el) return;

    if (atThreadLimit) {
      return;
    }

    const nextAnchor = anchorFromPointerEvent(e, el);
    onBlockClick(blockId, nextAnchor);
  }

  return (
    <div
      ref={layerRef}
      className={cn(
        "relative",
        feedbackCapture && (atThreadLimit ? "cursor-default" : "cursor-crosshair"),
        blockSelected && "rounded-xl bg-primary/[0.04] transition-colors",
      )}
      data-review-block-layer={blockId}
    >
      {children}

      {feedbackCapture ? (
        <div
          className={cn(
            "absolute inset-0 z-[5] rounded-xl",
            atThreadLimit ? "cursor-default" : "cursor-crosshair",
          )}
          aria-hidden
          onClick={handleLayerClick}
        />
      ) : null}

      <div
        className="pointer-events-none absolute inset-0 z-10"
        aria-hidden={threads.length === 0 && !pendingOnBlock}
      >
        {threads.map((thread) => {
          const anchor = normalizeAnchor({
            x: thread.anchor_x,
            y: thread.anchor_y,
          });
          const noteNumber = threadNumberById.get(thread.id);
          const selected = activeThreadId === thread.id;

          return (
            <div
              key={thread.id}
              className="pointer-events-auto absolute"
              style={pinStyleFromAnchor(anchor)}
              onClick={(e) => e.stopPropagation()}
            >
              <ReviewCommentPin
                noteNumber={noteNumber}
                selected={selected}
                onClick={() => onPinClick(thread.id)}
              />
            </div>
          );
        })}

        {pendingOnBlock ? (
          <div
            className="pointer-events-auto absolute"
            style={pinStyleFromAnchor(pendingPin.anchor)}
            onClick={(e) => e.stopPropagation()}
          >
            <ReviewCommentPin pending selected={blockSelected} onClick={() => {}} />
            <ReviewStickyComposer
              open={stickyOpen && blockSelected}
              body={stickyBody}
              onBodyChange={onStickyBodyChange}
              clientName={stickyClientName}
              onClientNameChange={onStickyClientNameChange}
              showClientName={showClientName}
              sending={sending}
              error={stickyError}
              onSend={onStickySend}
              onCancel={onStickyCancel}
            />
          </div>
        ) : null}
      </div>

      {feedbackCapture && !atThreadLimit && !pendingOnBlock ? (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-primary/10 opacity-0 transition-opacity hover:opacity-100"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
