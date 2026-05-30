"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FolderContentReview,
  type FolderContentReviewCommentsProps,
} from "@/components/folder-content-review";
import {
  folderStatusDotClass,
  PROJECT_STATUS_LABELS,
} from "@/lib/project-status";
import {
  isReviewFolderLocked,
  pickDefaultReviewFolderId,
  type ReviewFolder,
} from "@/lib/review";
import { cn } from "@/lib/utils";

type ReviewFoldersTabsProps = {
  folders: ReviewFolder[];
  /** Controlled selection (client review). Omit for preview-only tabs. */
  selectedFolderId?: string | null;
  onSelectedFolderChange?: (folderId: string) => void;
  /** Uncontrolled initial tab (e.g. preview deep-link). */
  initialFolderId?: string | null;
  comments?: FolderContentReviewCommentsProps;
};

function FolderReviewStatusBanner({ folder }: { folder: ReviewFolder }) {
  if (folder.status === "approved") {
    const signer = folder.client_approved_by_name;
    return (
      <div className="mb-6 rounded-xl border bg-muted/30 px-4 py-4">
        <p className="font-medium">Approved and locked</p>
        {signer ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Signed by <span className="font-medium text-foreground">{signer}</span>
            {folder.approved_at ? (
              <span> · {new Date(folder.approved_at).toLocaleString()}</span>
            ) : null}
          </p>
        ) : null}
        {folder.client_signature ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={folder.client_signature}
            alt={`Signature of ${signer ?? "client"}`}
            className="mt-3 max-h-20 rounded-md border bg-white"
          />
        ) : null}
      </div>
    );
  }

  return null;
}

export function ReviewFoldersTabs({
  folders,
  selectedFolderId: controlledId,
  onSelectedFolderChange,
  initialFolderId = null,
  comments,
}: ReviewFoldersTabsProps) {
  const sorted = useMemo(
    () => [...folders].sort((a, b) => a.sort_order - b.sort_order),
    [folders],
  );

  const defaultId = useMemo(() => {
    if (
      initialFolderId &&
      sorted.some((folder) => folder.id === initialFolderId)
    ) {
      return initialFolderId;
    }
    return pickDefaultReviewFolderId(sorted);
  }, [sorted, initialFolderId]);

  const [uncontrolledId, setUncontrolledId] = useState<string | null>(defaultId);
  const isControlled = onSelectedFolderChange !== undefined;

  const resolvedId =
    isControlled && controlledId && sorted.some((f) => f.id === controlledId)
      ? controlledId
      : (uncontrolledId ?? defaultId);

  const selected =
    sorted.find((f) => f.id === resolvedId) ?? sorted[0] ?? null;

  useEffect(() => {
    setUncontrolledId((current) => {
      if (current && sorted.some((f) => f.id === current)) {
        return current;
      }
      return defaultId;
    });
  }, [sorted, defaultId]);

  function selectFolder(folderId: string) {
    if (isControlled && onSelectedFolderChange) {
      onSelectedFolderChange(folderId);
    } else {
      setUncontrolledId(folderId);
    }
  }

  const showPills = sorted.length > 1;

  if (!selected) {
    return (
      <p className="py-24 text-center text-sm text-muted-foreground">
        No deliverables available yet.
      </p>
    );
  }

  const readOnly = isReviewFolderLocked(selected.status);

  const tabList = showPills ? (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      role="tablist"
      aria-label="Deliverables"
    >
      {sorted.map((folder) => {
        const isActive = folder.id === selected.id;
        return (
          <button
            key={folder.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            id={`review-tab-${folder.id}`}
            aria-controls={`review-panel-${folder.id}`}
            onClick={() => selectFolder(folder.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "border-foreground/20 bg-foreground text-background"
                : "border-border bg-background hover:bg-muted/50",
            )}
          >
            <span
              className={cn("size-1.5 rounded-full", folderStatusDotClass(folder.status))}
              title={PROJECT_STATUS_LABELS[folder.status]}
              aria-hidden
            />
            {folder.name}
          </button>
        );
      })}
    </div>
  ) : null;

  const tabPanel = (
    <div
      role="tabpanel"
      id={`review-panel-${selected.id}`}
      aria-labelledby={showPills ? `review-tab-${selected.id}` : undefined}
    >
      <FolderReviewStatusBanner folder={selected} />

      <FolderContentReview
        contentBlocks={selected.content_blocks}
        assets={selected.assets}
        folderName={selected.name}
        readOnly={readOnly}
        comments={comments}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {tabList}
      {tabPanel}
    </div>
  );
}
