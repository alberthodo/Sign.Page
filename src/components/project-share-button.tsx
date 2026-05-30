"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronDown, Share2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { CopyLinkButton } from "@/components/copy-link-button";
import { createSelectionReviewToken } from "@/app/actions/projects";
import { RegenerateLinkButton } from "@/components/regenerate-link-button";
import { RegenerateFolderLinkButton } from "@/components/regenerate-folder-link-button";
import { publishFoldersForReview, ensureShareFolderLinks } from "@/app/actions/folders";
import { ensureProjectReviewLink } from "@/app/actions/projects";
import { clientPreviewPath } from "@/lib/client-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ProjectShareButtonProps = {
  projectId: string;
  reviewUrl: string | null;
  previewPath: string;
  shareable: boolean;
  /** Published folders the client will see on this project-wide link. */
  publishedFolderCount?: number;
  hasToken: boolean;
  folderLinks: {
    id: string;
    name: string;
    reviewUrl: string | null;
    shareable: boolean;
    hasToken: boolean;
    visibility: "public" | "hidden";
    status: "draft" | "active" | "approved" | "changes_requested";
  }[];
  className?: string;
};

function ShareLinkBlock({
  url,
  previewHref,
  rotate,
}: {
  url: string;
  previewHref: string;
  rotate: ReactNode;
}) {
  return (
    <div className="mt-auto space-y-4 pt-6">
      <code className="block w-full break-all rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
        {url}
      </code>
      <div className="flex flex-wrap items-center gap-2">
        <CopyLinkButton url={url} label="Copy link" />
        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          render={
            <Link href={previewHref} target="_blank" rel="noreferrer" />
          }
        >
          Preview client view
        </Button>
        {rotate}
      </div>
    </div>
  );
}

export function ProjectShareButton({
  projectId,
  reviewUrl,
  previewPath,
  shareable,
  publishedFolderCount = 0,
  hasToken,
  folderLinks,
  className,
}: ProjectShareButtonProps) {
  type FolderLink = ProjectShareButtonProps["folderLinks"][number];

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"folder" | "project">("folder");
  const folderSelectRef = useRef<HTMLDetailsElement | null>(null);
  const defaultFolderId = folderLinks[0]?.id ?? null;
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>(
    defaultFolderId ? [defaultFolderId] : [],
  );
  const [isPublishing, startPublish] = useTransition();
  const [publishError, setPublishError] = useState<string | null>(null);
  const [selectionUrl, setSelectionUrl] = useState<string | null>(null);
  const [isCreatingSelection, startCreateSelection] = useTransition();
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [folderLinkOverrides, setFolderLinkOverrides] = useState<
    Record<string, string>
  >({});
  const [projectLinkOverride, setProjectLinkOverride] = useState<string | null>(null);

  useEffect(() => {
    // Keep at least one folder selected when data loads/changes.
    if (selectedFolderIds.length > 0) return;
    if (defaultFolderId) setSelectedFolderIds([defaultFolderId]);
  }, [defaultFolderId, selectedFolderIds.length]);

  const selectedFolders = useMemo(() => {
    const map = new Map(folderLinks.map((f) => [f.id, f] as const));
    return selectedFolderIds
      .map((id) => map.get(id))
      .filter((f): f is FolderLink => Boolean(f));
  }, [folderLinks, selectedFolderIds]);

  const unshareableSelected = useMemo(
    () => selectedFolders.filter((f) => !f.shareable),
    [selectedFolders],
  );
  const projectShareFolders = useMemo(
    () => folderLinks.filter((f) => f.visibility === "public"),
    [folderLinks],
  );
  const unshareableProjectFolders = useMemo(
    () => projectShareFolders.filter((f) => !f.shareable),
    [projectShareFolders],
  );
  const isSelection = selectedFolderIds.length > 1;
  const allSelectedShareable =
    isSelection && selectedFolders.length > 0 && unshareableSelected.length === 0;

  const singleFolder = !isSelection ? selectedFolders[0] : undefined;
  const singleFolderReviewUrl = singleFolder
    ? (folderLinkOverrides[singleFolder.id] ?? singleFolder.reviewUrl)
    : null;
  const linkUrl = isSelection ? selectionUrl : singleFolderReviewUrl;
  const linkNeedsPublish = isSelection
    ? !allSelectedShareable && !linkUrl
    : Boolean(singleFolder && !singleFolder.shareable && !linkUrl);
  const showCreateSelectionLink =
    isSelection && allSelectedShareable && !linkUrl;

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void (async () => {
      const result = await ensureShareFolderLinks(projectId);
      if (cancelled || !result.folderReviewUrls) return;
      setFolderLinkOverrides((prev) => ({
        ...prev,
        ...result.folderReviewUrls,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const result = await ensureProjectReviewLink(projectId);
      if (cancelled) return;
      if (result.reviewUrl) setProjectLinkOverride(result.reviewUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  useEffect(() => {
    setFolderLinkOverrides((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      let changed = false;
      for (const folder of folderLinks) {
        if (folder.reviewUrl && next[folder.id]) {
          delete next[folder.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [folderLinks]);

  useEffect(() => {
    setSelectionUrl(null);
    setSelectionError(null);
  }, [selectedFolderIds.join(",")]);

  useEffect(() => {
    if (open) return;
    const details = folderSelectRef.current;
    if (details?.open) details.open = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const details = folderSelectRef.current;
      if (!details?.open) return;
      const target = event.target;
      if (target instanceof Node && details.contains(target)) return;
      details.open = false;
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const showProjectPublishBanner =
    scope === "project" &&
    publishedFolderCount === 0 &&
    unshareableProjectFolders.length > 0;
  const showFolderPublishBanner =
    scope === "folder" && unshareableSelected.length > 0;

  function toggleFolder(id: string) {
    setSelectedFolderIds((prev) => {
      if (prev.includes(id)) {
        // Don't allow zero selections.
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }

  function removeFolder(id: string) {
    setSelectedFolderIds((prev) => {
      if (!prev.includes(id)) return prev;
      if (prev.length === 1) return prev;
      return prev.filter((x) => x !== id);
    });
  }

  function handlePublishSelected() {
    setPublishError(null);
    const idsToPublish =
      scope === "project"
        ? unshareableProjectFolders.map((f) => f.id)
        : unshareableSelected.map((f) => f.id);

    startPublish(async () => {
      const result = await publishFoldersForReview(idsToPublish);
      if (result.error) {
        setPublishError(result.error);
        return;
      }
      if (result.folderReviewUrls) {
        setFolderLinkOverrides((prev) => ({
          ...prev,
          ...result.folderReviewUrls,
        }));
      }
      if (scope === "folder" && selectedFolderIds.length >= 2) {
        setSelectionError(null);
        const selectionResult = await createSelectionReviewToken({
          projectId,
          folderIds: selectedFolderIds,
        });
        if (selectionResult.error) {
          setSelectionError(selectionResult.error);
        } else if (selectionResult.reviewUrl) {
          setSelectionUrl(selectionResult.reviewUrl);
        }
      }
      router.refresh();
    });
  }

  function handleCreateSelectionLink() {
    setSelectionError(null);
    startCreateSelection(async () => {
      const result = await createSelectionReviewToken({
        projectId,
        folderIds: selectedFolderIds,
      });
      if (result.error) {
        setSelectionError(result.error);
        return;
      }
      if (result.reviewUrl) {
        setSelectionUrl(result.reviewUrl);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "shrink-0 border-0 bg-transparent shadow-none",
          "hover:bg-transparent hover:text-foreground",
          className,
        )}
        onClick={() => setOpen(true)}
        title="Share client links"
      >
        <Share2 className="size-4" />
        Share
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "sm:max-w-3xl",
            "h-[min(82dvh,640px,calc(100dvh-11rem))] max-h-[min(92dvh,820px,calc(100dvh-11rem))]",
            "p-0",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 px-6 py-5 sm:px-8">
          <DialogHeader>
            <DialogTitle>Share with client</DialogTitle>
            <DialogDescription>
                  Choose what you want to share. Folder links are best for a single
                  deliverable; the project link shows multiple folders in tabs.
            </DialogDescription>
          </DialogHeader>

              <div className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/20 p-1">
                <button
                  type="button"
                  onClick={() => setScope("folder")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    scope === "folder"
                      ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {scope === "folder" ? <Check className="size-4" /> : null}
                  Folder(s)
                </button>
                <button
                  type="button"
                  onClick={() => setScope("project")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    scope === "project"
                      ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {scope === "project" ? <Check className="size-4" /> : null}
                  Entire project
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8">
              <div className="flex min-h-full flex-col">
                {scope === "folder" ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Folders to share
                  </p>
                  {folderLinks.length > 1 ? (
                    <details ref={folderSelectRef} className="group relative">
                      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1 text-sm text-foreground transition-colors hover:bg-muted">
                        Select more
                        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border bg-popover p-2 shadow-lg ring-1 ring-foreground/10">
                        <div className="max-h-64 overflow-y-auto">
                          {folderLinks.map((f) => {
                            const checked = selectedFolderIds.includes(f.id);
                            return (
                              <label
                                key={f.id}
                                className="flex cursor-pointer items-start justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/50"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate">{f.name}</span>
                                  {!f.shareable ? (
                                    <span className="block truncate text-xs text-muted-foreground">
                                      Not published yet
                                    </span>
                                  ) : null}
                                </span>
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={checked}
                                  onChange={() => toggleFolder(f.id)}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </details>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedFolders.map((f) => (
                    <span
                      key={f.id}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm",
                      )}
                      title={!f.shareable ? "Not published yet" : undefined}
                    >
                      <span className="max-w-[14rem] truncate">{f.name}</span>
                      {selectedFolders.length > 1 ? (
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => removeFolder(f.id)}
                          aria-label={`Remove ${f.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>

              </div>

              {showFolderPublishBanner ? (
                <div className="mt-6 rounded-lg border bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Publish to generate share links
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {unshareableSelected.length === 1
                          ? "One selected folder isn’t published yet."
                          : `${unshareableSelected.length} selected folders aren’t published yet.`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPublishing}
                      onClick={handlePublishSelected}
                    >
                      {isPublishing ? "Publishing…" : "Publish selected"}
                    </Button>
                  </div>
                  {publishError ? (
                    <p className="mt-2 text-xs text-destructive" role="alert">
                      {publishError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-auto pt-6">
                {selectedFolders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Select a folder to share.
                  </p>
                ) : linkNeedsPublish ? (
                  <p className="text-sm text-muted-foreground">
                    {isSelection
                      ? "Publish selected folders above, then create one link for this set."
                      : "Publish this folder above to generate a share link."}
                  </p>
                ) : linkUrl ? (
                  <ShareLinkBlock
                    url={linkUrl}
                    previewHref={
                      singleFolder
                        ? clientPreviewPath(projectId, singleFolder.id)
                        : previewPath
                    }
                    rotate={
                      singleFolder ? (
                        <RegenerateFolderLinkButton
                          folderId={singleFolder.id}
                          hasToken={singleFolder.hasToken}
                        />
                      ) : null
                    }
                  />
                ) : showCreateSelectionLink ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      One link for all selected folders.
                    </p>
                <Button
                      type="button"
                  variant="outline"
                  size="sm"
                      disabled={isCreatingSelection}
                      onClick={handleCreateSelectionLink}
                    >
                      {isCreatingSelection ? "Creating…" : "Create link"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No link yet.</p>
                )}
                {selectionError && isSelection ? (
                  <p className="mt-2 text-xs text-destructive" role="alert">
                    {selectionError}
                  </p>
                ) : null}
              </div>
            </>
              ) : (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Folders to share
                </p>
                {projectShareFolders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add a public folder to include on this link.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {projectShareFolders.map((f) => (
                      <span
                        key={f.id}
                        className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm"
                        title={!f.shareable ? "Not published yet" : undefined}
                      >
                        <span className="max-w-[14rem] truncate">{f.name}</span>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Your client sees every published folder here in tabs on one link.
                </p>
              </div>

              {showProjectPublishBanner ? (
                <div className="mt-6 rounded-lg border bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Publish to generate share links
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {unshareableProjectFolders.length === 1
                          ? "One folder isn’t published yet."
                          : `${unshareableProjectFolders.length} folders aren’t published yet.`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPublishing}
                      onClick={handlePublishSelected}
                    >
                      {isPublishing ? "Publishing…" : "Publish all"}
                    </Button>
                  </div>
                  {publishError ? (
                    <p className="mt-2 text-xs text-destructive" role="alert">
                      {publishError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {reviewUrl || projectLinkOverride ? (
                <ShareLinkBlock
                  url={reviewUrl ?? projectLinkOverride ?? ""}
                  previewHref={`${previewPath}?all=1`}
                  rotate={
                    <RegenerateLinkButton
                      projectId={projectId}
                      hasToken={hasToken}
                      compact
                    />
                  }
                />
              ) : (
                <div className="mt-auto pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">No project link yet.</p>
                  <RegenerateLinkButton projectId={projectId} hasToken={hasToken} />
                </div>
              )}
            </>
              )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
