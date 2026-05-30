"use client";

import { useMemo } from "react";
import { ExternalLink, FileText } from "lucide-react";
import type { ReviewThread } from "@/app/actions/review";
import { ReviewBlockCommentLayer } from "@/components/review/review-block-comment-layer";
import type { PendingCommentPin } from "@/components/review/review-block-comment-layer";
import {
  hasFolderContent,
  isReviewableBlock,
  resolveFolderBlocks,
  type FolderContentBlock,
} from "@/lib/folder-content";
import type { ReviewCommentAnchor } from "@/lib/review-comment-anchor";
import { fileNameFromAssetUrl } from "@/lib/project-page";
import { PdfFilePreview } from "@/components/pdf-file-preview";
import { isImageUrl, isPdfUrl } from "@/lib/uploads";
import { cn } from "@/lib/utils";

export type FolderContentReviewCommentsProps = {
  threadsByBlock: Map<string, ReviewThread[]>;
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
};

type FolderContentReviewProps = {
  contentBlocks: unknown;
  assets?: string[];
  folderName: string;
  readOnly?: boolean;
  comments?: FolderContentReviewCommentsProps;
};

function ReviewFileBlock({
  url,
  folderName,
}: {
  url: string;
  folderName: string;
}) {
  const fileName = fileNameFromAssetUrl(url);
  const image = isImageUrl(url);
  const pdf = isPdfUrl(url);

  return (
    <figure className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={fileName}
          className="h-auto w-full object-contain"
          loading="lazy"
        />
      ) : pdf ? (
        <div className="flex flex-col">
          <PdfFilePreview url={url} title={`${folderName} PDF`} className="min-h-[28rem]" />
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            data-no-comment
            className="border-t px-4 py-3 text-sm font-medium underline-offset-4 hover:underline"
          >
            Open PDF in new tab
          </a>
        </div>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          data-no-comment
          className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm font-medium underline-offset-4 hover:underline"
        >
          <FileText className="size-10 text-muted-foreground" strokeWidth={1.25} />
          View file
        </a>
      )}
      <figcaption
        className="flex items-center justify-between gap-2 border-t px-4 py-2 text-xs"
        data-no-comment
      >
        <span className="truncate font-medium">{fileName}</span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={`Open ${fileName}`}
        >
          <ExternalLink className="size-3.5" />
        </a>
      </figcaption>
    </figure>
  );
}

function ReviewBlockContent({
  block,
  folderName,
}: {
  block: FolderContentBlock;
  folderName: string;
}) {
  if (block.type === "heading") {
    if (!block.text.trim()) {
      return null;
    }
    return (
      <div className="px-4 py-4">
        <h3 className="text-xl font-semibold tracking-tight whitespace-pre-wrap">
          {block.text}
        </h3>
      </div>
    );
  }

  if (block.type === "text") {
    if (!block.text.trim()) {
      return null;
    }
    return (
      <div className="px-4 py-4">
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {block.text}
        </p>
      </div>
    );
  }

  return <ReviewFileBlock url={block.url} folderName={folderName} />;
}

function AnnotatableBlock({
  block,
  folderName,
  readOnly,
  comments,
}: {
  block: FolderContentBlock;
  folderName: string;
  readOnly: boolean;
  comments?: FolderContentReviewCommentsProps;
}) {
  const inner = (
    <div
      className={cn(
        "rounded-xl",
        readOnly && !comments?.canComment && "opacity-95",
      )}
    >
      <ReviewBlockContent block={block} folderName={folderName} />
    </div>
  );

  if (!comments) {
    return inner;
  }

  const blockThreads = comments.threadsByBlock.get(block.id) ?? [];

  return (
    <ReviewBlockCommentLayer
      blockId={block.id}
      threads={blockThreads}
      threadNumberById={comments.threadNumberById}
      commentMode={comments.commentMode}
      canComment={comments.canComment && !readOnly}
      activeThreadId={comments.activeThreadId}
      activeBlockId={comments.activeBlockId}
      pendingPin={comments.pendingPin}
      stickyOpen={comments.stickyOpen}
      stickyBody={comments.stickyBody}
      stickyClientName={comments.stickyClientName}
      showClientName={comments.showClientName}
      sending={comments.sending}
      stickyError={comments.stickyError}
      onStickyBodyChange={comments.onStickyBodyChange}
      onStickyClientNameChange={comments.onStickyClientNameChange}
      onBlockClick={comments.onBlockClick}
      onPinClick={comments.onPinClick}
      onStickySend={comments.onStickySend}
      onStickyCancel={comments.onStickyCancel}
    >
      {inner}
    </ReviewBlockCommentLayer>
  );
}

export function FolderContentReview({
  contentBlocks,
  assets = [],
  folderName,
  readOnly = false,
  comments,
}: FolderContentReviewProps) {
  const blocks = useMemo(
    () => resolveFolderBlocks(contentBlocks, assets),
    [contentBlocks, assets],
  );

  if (!hasFolderContent(blocks)) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No deliverables available yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        const prev = index > 0 ? blocks[index - 1] : null;
        const tightBelow = block.type === "heading" && blocks[index + 1]?.type === "text";
        const tightAbove = prev?.type === "heading" && block.type === "text";

        if (!isReviewableBlock(block)) {
          return null;
        }

        return (
          <div
            key={block.id}
            className={cn(tightBelow && "-mb-1", tightAbove && "-mt-1")}
            id={`review-block-${block.id}`}
          >
            <AnnotatableBlock
              block={block}
              folderName={folderName}
              readOnly={readOnly}
              comments={comments}
            />
          </div>
        );
      })}
    </div>
  );
}
