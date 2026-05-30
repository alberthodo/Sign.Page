"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, GripVertical, Trash2 } from "lucide-react";
import {
  removeFolderAsset,
  saveFolderAssets,
  updateFolderContentBlocks,
} from "@/app/actions/folders";
import { FolderContentAddMenu } from "@/components/folder-content-add-menu";
import { createClient } from "@/lib/supabase/client";
import {
  getBlockReview,
  hasFolderContent,
  isReviewableBlock,
  newContentBlock,
  parseContentBlocks,
  resolveFolderBlocks,
  type FolderContentBlock,
} from "@/lib/folder-content";
import { fileNameFromAssetUrl } from "@/lib/project-page";
import { BlockReviewNotice } from "@/components/block-review-notice";
import { PdfFilePreview } from "@/components/pdf-file-preview";
import { FILE_INPUT_OVERLAY_CLASS } from "@/lib/open-file-dialog";
import { isImageUrl, isPdfUrl, storagePath, validateUploadFile } from "@/lib/uploads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CHANGES_REQUESTED_BADGE_CLASS } from "@/lib/project-status";
import { cn } from "@/lib/utils";

type FolderContentEditorProps = {
  projectId: string;
  folderId: string;
  contentBlocks: unknown;
  assets?: string[];
  readOnly?: boolean;
  replaceOnUpload?: boolean;
  /** Hide legacy per-block banners when threaded client pins are used. */
  hideBlockReviewNotices?: boolean;
  /** Amber badge label per block with client feedback (replaces outline highlight). */
  feedbackBadgeByBlockId?: Map<string, string>;
};

function HoverInsertSlot({
  children,
  compact,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "group/slot w-full shrink-0 transition-[padding] duration-150 ease-out",
        compact ? "min-h-2 py-0.5 hover:py-1.5" : "min-h-2.5 py-1 hover:py-2",
      )}
      aria-label="Insert content"
    >
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-150 ease-out",
          "grid-rows-[0fr] opacity-0",
          "group-hover/slot:grid-rows-[1fr] group-hover/slot:opacity-100",
          "group-focus-within/slot:grid-rows-[1fr] group-focus-within/slot:opacity-100",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex justify-center">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FilePreview({
  url,
  readOnly,
  isPending,
  onDelete,
}: {
  url: string;
  readOnly: boolean;
  isPending: boolean;
  onDelete: () => void;
}) {
  const fileName = fileNameFromAssetUrl(url);
  const image = isImageUrl(url);
  const pdf = isPdfUrl(url);

  const previewBody = image ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block"
      aria-label={`Open ${fileName}`}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center bg-muted/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={fileName}
          className="size-full object-contain p-1"
          loading="lazy"
        />
      </div>
    </a>
  ) : pdf ? (
    <PdfFilePreview url={url} title={fileName} className="min-h-[28rem]" />
  ) : (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block"
      aria-label={`Open ${fileName}`}
    >
      <div className="relative flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-muted/20 p-4 text-center">
        <FileText className="size-10 text-muted-foreground" strokeWidth={1.25} />
        <span className="text-xs text-muted-foreground">View file</span>
      </div>
    </a>
  );

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card",
        isPending && "opacity-60",
      )}
    >
      {previewBody}
      <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
        <span className="min-w-0 truncate text-xs font-medium">{fileName}</span>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={`Open ${fileName} in new tab`}
          >
            <ExternalLink className="size-3.5" />
          </a>
          {!readOnly ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-destructive"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              aria-label={`Delete ${fileName}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function FolderContentEditor({
  projectId,
  folderId,
  contentBlocks: initialRaw,
  assets = [],
  readOnly = false,
  replaceOnUpload = false,
  hideBlockReviewNotices = false,
  feedbackBadgeByBlockId,
}: FolderContentEditorProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertIndexRef = useRef<number | null>(null);
  const blocksRef = useRef<FolderContentBlock[]>([]);
  const userIdRef = useRef<string | null>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingBlockIdRef = useRef<string | null>(null);
  const blocksAtDragStartRef = useRef<FolderContentBlock[] | null>(null);
  const lastOverBlockIdRef = useRef<string | null>(null);
  const fileInputId = `folder-files-${folderId}`;
  const [blocks, setBlocks] = useState(() =>
    resolveFolderBlocks(initialRaw, assets),
  );
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false);
  const [isPending, startTransition] = useTransition();

  const applyServerBlocks = useCallback((raw: FolderContentBlock[] | undefined) => {
    if (raw) {
      setBlocks(parseContentBlocks(raw));
    }
  }, []);

  const metadataRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleMetadataRefresh = useCallback(() => {
    if (metadataRefreshRef.current) {
      clearTimeout(metadataRefreshRef.current);
    }
    metadataRefreshRef.current = setTimeout(() => {
      metadataRefreshRef.current = null;
      startTransition(() => {
        router.refresh();
      });
    }, 800);
  }, [router]);

  const serverBlocksKey = useMemo(
    () =>
      JSON.stringify({
        blocks: initialRaw,
        assets,
      }),
    [initialRaw, assets],
  );

  useEffect(() => {
    if (uploadingRef.current) {
      return;
    }
    setBlocks(resolveFolderBlocks(initialRaw, assets));
  }, [serverBlocksKey, initialRaw, assets]);

  blocksRef.current = blocks;

  useEffect(() => {
    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
      if (metadataRefreshRef.current) {
        clearTimeout(metadataRefreshRef.current);
      }
    };
  }, []);

  const persist = useCallback(
    async (next: FolderContentBlock[]) => {
      setError(null);
      const result = await updateFolderContentBlocks(folderId, next);
      if (result.error) {
        setError(result.error);
        return false;
      }
      applyServerBlocks(result.content_blocks ?? next);
      return true;
    },
    [applyServerBlocks, folderId],
  );

  const reorderByDrag = useCallback(
    (fromId: string, toId: string) => {
      if (!fromId || !toId || fromId === toId) return;
      const current = blocksRef.current;
      const fromIdx = current.findIndex((b) => b.id === fromId);
      const toIdx = current.findIndex((b) => b.id === toId);
      if (fromIdx < 0 || toIdx < 0) return;

      const next = [...current];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      setBlocks(next);
      blocksRef.current = next;
    },
    [],
  );

  const flushPendingTextSave = useCallback(async () => {
    if (!saveDebounceRef.current) {
      return;
    }
    clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = null;
    await persist(blocksRef.current);
  }, [persist]);

  const cancelPendingTextSave = useCallback(() => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
  }, []);

  const insertBlock = useCallback(
    (at: number, type: FolderContentBlock["type"]) => {
      const block = newContentBlock(type);
      const next = [
        ...blocksRef.current.slice(0, at),
        block,
        ...blocksRef.current.slice(at),
      ];
      setBlocks(next);
      if (type !== "file") {
        void persist(next);
      }
    },
    [persist],
  );

  const prepareFilePick = useCallback(
    (at: number) => {
      cancelPendingTextSave();
      insertIndexRef.current = at;
    },
    [cancelPendingTextSave],
  );

  const updateBlockText = useCallback((id: string, text: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id && (b.type === "heading" || b.type === "text")
          ? { ...b, text }
          : b,
      ),
    );
  }, []);

  const scheduleSaveBlockText = useCallback(() => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }
    saveDebounceRef.current = setTimeout(() => {
      saveDebounceRef.current = null;
      void persist(blocksRef.current);
    }, 400);
  }, [persist]);

  const removeBlock = useCallback(
    (id: string) => {
      const block = blocksRef.current.find((b) => b.id === id);
      if (!block) {
        return;
      }

      if (block.type === "file") {
        if (!window.confirm(`Remove "${fileNameFromAssetUrl(block.url)}"?`)) {
          return;
        }
        const previous = blocksRef.current;
        const next = previous.filter((b) => b.id !== id);
        setError(null);
        setBlocks(next);
        startTransition(async () => {
          const result = await removeFolderAsset(folderId, block.url);
          if (result.error) {
            setError(result.error);
            setBlocks(previous);
            return;
          }
          applyServerBlocks(result.content_blocks);
          scheduleMetadataRefresh();
        });
        return;
      }

      const next = blocksRef.current.filter((b) => b.id !== id);
      setBlocks(next);
      void persist(next);
    },
    [applyServerBlocks, folderId, persist, scheduleMetadataRefresh],
  );

  const getUserId = useCallback(async () => {
    if (userIdRef.current) {
      return userIdRef.current;
    }
    const {
      data: { user },
    } = await supabaseRef.current.auth.getUser();
    if (!user) {
      return null;
    }
    userIdRef.current = user.id;
    return user.id;
  }, []);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      if (files.length === 0) {
        return;
      }

      for (const file of files) {
        const validationError = validateUploadFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      await flushPendingTextSave();

      uploadingRef.current = true;
      setUploading(true);
      const userId = await getUserId();
      if (!userId) {
        setError("Session expired. Sign in again.");
        uploadingRef.current = false;
        setUploading(false);
        return;
      }

      const assetUrls: string[] = [];
      for (const file of files) {
        const path = storagePath(userId, projectId, file.name, folderId);
        const { error: uploadError } = await supabaseRef.current.storage
          .from("project-assets")
          .upload(path, file, { upsert: true, contentType: file.type });

        if (uploadError) {
          setError(uploadError.message);
          uploadingRef.current = false;
          setUploading(false);
          return;
        }

        const { data } = supabaseRef.current.storage
          .from("project-assets")
          .getPublicUrl(path);
        assetUrls.push(data.publicUrl);
      }

      const insertAt = insertIndexRef.current ?? blocksRef.current.length;
      const result = await saveFolderAssets(folderId, assetUrls, {
        replace: replaceOnUpload,
        insertAt,
      });

      if (result.error) {
        setError(result.error);
        uploadingRef.current = false;
        setUploading(false);
        return;
      }

      applyServerBlocks(result.content_blocks);
      uploadingRef.current = false;
      setUploading(false);
      insertIndexRef.current = null;
      scheduleMetadataRefresh();
    },
    [
      applyServerBlocks,
      flushPendingTextSave,
      folderId,
      getUserId,
      projectId,
      replaceOnUpload,
      scheduleMetadataRefresh,
    ],
  );

  const onFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files?.length) {
        void uploadFiles(Array.from(files));
      }
      event.target.value = "";
    },
    [uploadFiles],
  );

  const onDropzoneDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (event.dataTransfer.files.length) {
        insertIndexRef.current = blocksRef.current.length;
        void uploadFiles(Array.from(event.dataTransfer.files));
      }
    },
    [uploadFiles],
  );

  const renderAddMenu = useCallback(
    (at: number) => (
      <FolderContentAddMenu
        compact
        className="bg-background shadow-sm"
        fileInputId={fileInputId}
        onBeforeFilePick={() => prepareFilePick(at)}
        onAddHeading={() => insertBlock(at, "heading")}
        onAddText={() => insertBlock(at, "text")}
      />
    ),
    [fileInputId, insertBlock, prepareFilePick],
  );

  const hasContent = hasFolderContent(blocks);

  if (readOnly) {
    return hasContent ? (
      <div className="flex flex-col gap-4 rounded-xl border border-dashed p-4">
        {blocks.map((block) => (
          <div key={block.id}>
            {block.type === "heading" && block.text.trim() ? (
              <h3 className="text-lg font-semibold whitespace-pre-wrap">{block.text}</h3>
            ) : null}
            {block.type === "text" && block.text.trim() ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {block.text}
              </p>
            ) : null}
            {isReviewableBlock(block) && !hideBlockReviewNotices ? (
              <BlockReviewNotice block={block} className="mb-2" />
            ) : null}
            {block.type === "file" ? (
              <FilePreview
                url={block.url}
                readOnly
                isPending={false}
                onDelete={() => {}}
              />
            ) : null}
          </div>
        ))}
      </div>
    ) : null;
  }

  return (
    <section className="space-y-3">
      <input
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
        multiple
        className="sr-only"
        disabled={uploading}
        onChange={onFileInputChange}
        tabIndex={-1}
        aria-hidden
      />

      <div
        className={cn(
          "group/editor rounded-xl border-2 border-dashed border-border/80 bg-muted/10 p-4 transition-colors sm:p-5",
          "hover:border-primary/35 hover:bg-muted/20",
        )}
      >
        {blocks.length === 0 ? (
          <div className="px-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Hover here to add a title, notes, or files
            </p>
            <div className="mt-4 flex justify-center opacity-0 transition-opacity duration-150 group-hover/editor:opacity-100 group-focus-within/editor:opacity-100">
              {renderAddMenu(0)}
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            <HoverInsertSlot>{renderAddMenu(0)}</HoverInsertSlot>

            {blocks.map((block, index) => {
              const next = index < blocks.length - 1 ? blocks[index + 1] : null;
              const betweenTitleAndText =
                block.type === "heading" && next?.type === "text";
              const followsTitle =
                index > 0 && blocks[index - 1]?.type === "heading" && block.type === "text";

              const blockReview = getBlockReview(block);
              const feedbackBadgeLabel = feedbackBadgeByBlockId?.get(block.id);
              const showFeedbackBadge = Boolean(feedbackBadgeLabel);
              const showLegacyReviewRing =
                blockReview.status === "changes_requested" &&
                !hideBlockReviewNotices &&
                !showFeedbackBadge;

              return (
              <div
                key={block.id}
                onDragOver={(e) => {
                  if (!draggingBlockIdRef.current) return;
                  e.preventDefault();
                }}
                onDragEnter={() => {
                  const fromId = draggingBlockIdRef.current;
                  if (!fromId || fromId === block.id) return;
                  if (lastOverBlockIdRef.current === block.id) return;
                  lastOverBlockIdRef.current = block.id;
                  reorderByDrag(fromId, block.id);
                }}
              >
                {isReviewableBlock(block) &&
                !hideBlockReviewNotices &&
                blockReview.status !== "pending" ? (
                  <BlockReviewNotice block={block} className="mb-2" />
                ) : null}
                <div
                  data-block-container="true"
                  className={cn(
                    "group/block relative z-10 rounded-lg py-1 transition-colors",
                    block.type === "file"
                      ? "px-1"
                      : "px-1 pr-9 hover:bg-muted/25",
                    followsTitle && "pt-0.5",
                    showLegacyReviewRing && "ring-1 ring-amber-500/30",
                  )}
                >
                  {showFeedbackBadge ? (
                    <Badge
                      className={cn(
                        "absolute top-2 right-5 z-20 h-6 px-2.5 text-xs tabular-nums",
                        CHANGES_REQUESTED_BADGE_CLASS,
                      )}
                    >
                      {feedbackBadgeLabel}
                    </Badge>
                  ) : null}
                  <span
                    className={cn(
                      "absolute top-1 left-1 flex size-7 items-center justify-center rounded",
                      "opacity-0 transition-opacity group-hover/block:opacity-100 group-focus-within/block:opacity-100",
                    )}
                    draggable={!isPending && !uploading}
                    onDragStart={(e) => {
                      const container = (e.currentTarget as HTMLElement).closest(
                        '[data-block-container="true"]',
                      );
                      if (container) {
                        // Make the entire block follow the cursor (not just the handle).
                        e.dataTransfer.setDragImage(container, 16, 16);
                      }
                      blocksAtDragStartRef.current = blocksRef.current;
                      lastOverBlockIdRef.current = block.id;
                      draggingBlockIdRef.current = block.id;
                    }}
                    onDragEnd={() => {
                      const before = blocksAtDragStartRef.current;
                      blocksAtDragStartRef.current = null;
                      lastOverBlockIdRef.current = null;
                      draggingBlockIdRef.current = null;

                      const after = blocksRef.current;
                      if (
                        before &&
                        before.map((b) => b.id).join(",") !==
                          after.map((b) => b.id).join(",")
                      ) {
                        void persist(after);
                      }
                    }}
                    aria-label="Reorder block"
                    title="Drag to reorder"
                  >
                    <GripVertical
                      className="size-4 text-muted-foreground/70"
                      aria-hidden
                    />
                  </span>
                  {block.type === "heading" ? (
                    <Input
                      value={block.text}
                      onChange={(e) => updateBlockText(block.id, e.target.value)}
                      onBlur={scheduleSaveBlockText}
                      placeholder="Title"
                      className="h-9 border-0 bg-transparent px-0 py-1 pl-8 text-lg leading-tight font-semibold shadow-none focus-visible:ring-0"
                      disabled={isPending}
                    />
                  ) : null}
                  {block.type === "text" ? (
                    <Textarea
                      value={block.text}
                      onChange={(e) => updateBlockText(block.id, e.target.value)}
                      onBlur={scheduleSaveBlockText}
                      placeholder="Add context for your client…"
                      className={cn(
                        "resize-y border-0 bg-transparent px-0 py-1 pl-8 shadow-none focus-visible:ring-0 [field-sizing:fixed]",
                        followsTitle ? "min-h-16" : "min-h-20",
                      )}
                      disabled={isPending}
                    />
                  ) : null}
                  {block.type === "file" ? (
                    <FilePreview
                      url={block.url}
                      readOnly={false}
                      isPending={isPending || uploading}
                      onDelete={() => removeBlock(block.id)}
                    />
                  ) : null}
                  {block.type !== "file" ? (
                    <div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover/block:opacity-100">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                        onClick={() => removeBlock(block.id)}
                        aria-label="Remove block"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <HoverInsertSlot
                  compact={betweenTitleAndText || block.type === "heading" || next?.type === "text"}
                >
                  {renderAddMenu(index + 1)}
                </HoverInsertSlot>
              </div>
            );
            })}
          </div>
        )}

        <div
          className={cn(
            "relative mt-3 rounded-lg border border-dashed border-muted-foreground/20 px-4 py-4 text-center",
            uploading && "pointer-events-none opacity-70",
          )}
          onDragEnter={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropzoneDrop}
        >
          <label
            htmlFor={fileInputId}
            className={cn(FILE_INPUT_OVERLAY_CLASS, uploading && "cursor-not-allowed")}
            aria-label="Choose files to upload"
            onClick={() => prepareFilePick(blocks.length)}
          />
          <div className="pointer-events-none">
            <p className="text-sm font-medium">
              {uploading ? "Saving file to cloud…" : "Drop files or click to browse"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, JPEG, PDF — up to 10MB each
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
