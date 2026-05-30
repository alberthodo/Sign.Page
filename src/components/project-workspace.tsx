"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Folder, GripVertical, Lock } from "lucide-react";
import { listProjectReviewThreadsForOwner } from "@/app/actions/review";
import { NewFolderDialog } from "@/components/new-folder-dialog";
import { ProjectFolderMain } from "@/components/project-folder-main";
import { reorderProjectFolders } from "@/app/actions/folders";
import {
  pickDefaultFolderId,
  sortProjectFolders,
} from "@/lib/project-folders";
import {
  folderStatusDotClass,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_VARIANT,
  projectStatusBadgeClass,
} from "@/lib/project-status";
import type { ProjectFolderWithToken } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProjectWorkspaceProps = {
  projectId: string;
  folders: ProjectFolderWithToken[];
  siteUrl: string;
  projectReadOnly: boolean;
  initialClientCommentCount?: number;
};

export function ProjectWorkspace({
  projectId,
  folders,
  siteUrl,
  projectReadOnly,
  initialClientCommentCount = 0,
}: ProjectWorkspaceProps) {
  const sorted = useMemo(() => sortProjectFolders(folders), [folders]);
  const [ordered, setOrdered] = useState<ProjectFolderWithToken[]>(sorted);
  const defaultId = useMemo(() => pickDefaultFolderId(sorted), [sorted]);
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const orderAtDragStartRef = useRef<string[] | null>(null);
  const lastOverIdRef = useRef<string | null>(null);
  const [projectCommentCount, setProjectCommentCount] = useState(
    initialClientCommentCount,
  );
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const feedbackAutoEnabledRef = useRef(false);

  const hasClientFeedback = projectCommentCount > 0;

  useEffect(() => {
    setProjectCommentCount(initialClientCommentCount);
  }, [initialClientCommentCount]);

  useEffect(() => {
    if (projectCommentCount > 0 && !feedbackAutoEnabledRef.current) {
      feedbackAutoEnabledRef.current = true;
      setFeedbackMode(true);
      setPanelOpen(true);
    }
  }, [projectCommentCount]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listProjectReviewThreadsForOwner(projectId);
      if (cancelled || result.error) {
        return;
      }
      setProjectCommentCount(result.threads?.length ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, initialClientCommentCount]);

  useEffect(() => {
    setOrdered(sorted);
  }, [sorted]);

  function moveFolder(fromId: string, toId: string) {
    if (fromId === toId) return;
    setOrdered((prev) => {
      const fromIdx = prev.findIndex((f) => f.id === fromId);
      const toIdx = prev.findIndex((f) => f.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }

  const selected =
    ordered.find((f) => f.id === (selectedId ?? defaultId)) ??
    ordered[0] ??
    null;

  if (!selected) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
        No folders yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        {ordered.map((folder) => {
          const isActive = folder.id === selected.id;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => setSelectedId(folder.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "border-foreground/20 bg-foreground text-background"
                  : "border-border bg-background hover:bg-muted/50",
              )}
            >
              <span
                className={cn("size-1.5 rounded-full", folderStatusDotClass(folder.status))}
                aria-hidden
              />
              {folder.name}
            </button>
          );
        })}
        {!projectReadOnly ? (
          <NewFolderDialog projectId={projectId} compact />
        ) : null}
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <aside className="hidden w-52 shrink-0 md:block">
          <div className="flex items-center justify-between gap-2 pb-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Folders
            </p>
            {!projectReadOnly ? (
              <NewFolderDialog projectId={projectId} compact />
            ) : null}
          </div>
          <ul className="space-y-0.5" role="listbox" aria-label="Project folders">
            {ordered.map((folder) => {
              const isActive = folder.id === selected.id;
              return (
                <li
                  key={folder.id}
                  onDragOver={(e) => {
                    if (projectReadOnly || !draggingId) return;
                    e.preventDefault();
                  }}
                  onDragEnter={() => {
                    if (projectReadOnly || !draggingId) return;
                    if (lastOverIdRef.current === folder.id) return;
                    lastOverIdRef.current = folder.id;
                    moveFolder(draggingId, folder.id);
                  }}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => setSelectedId(folder.id)}
                    className={cn(
                      "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      draggingId === folder.id && "opacity-60",
                    )}
                  >
                    {!projectReadOnly ? (
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded",
                          "opacity-0 transition-opacity group-hover:opacity-100",
                        )}
                        draggable
                        onDragStart={(e) => {
                          const li = (e.currentTarget as HTMLElement).closest("li");
                          if (li) {
                            // Make the entire row follow the cursor (not just the handle).
                            e.dataTransfer.setDragImage(li, 12, 12);
                          }
                          orderAtDragStartRef.current = ordered.map((f) => f.id);
                          lastOverIdRef.current = folder.id;
                          setDraggingId(folder.id);
                        }}
                        onDragEnd={async () => {
                          const before = orderAtDragStartRef.current;
                          orderAtDragStartRef.current = null;
                          lastOverIdRef.current = null;
                          setDraggingId(null);

                          const after = ordered.map((f) => f.id);
                          if (before && before.join(",") !== after.join(",")) {
                            await reorderProjectFolders({
                              projectId,
                              orderedFolderIds: after,
                            });
                          }
                        }}
                        aria-label="Reorder folder"
                        title="Drag to reorder"
                      >
                        <GripVertical
                          className="size-4 text-muted-foreground/70"
                          aria-hidden
                        />
                      </span>
                    ) : null}
                    <Folder
                      className={cn(
                        "size-4 shrink-0",
                        isActive ? "text-foreground" : "text-muted-foreground/70",
                      )}
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                    {folder.visibility === "hidden" ? (
                      <Lock className="size-3 shrink-0 opacity-50" aria-hidden />
                    ) : (
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          folderStatusDotClass(folder.status),
                        )}
                        title={PROJECT_STATUS_LABELS[folder.status]}
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-2 md:hidden">
            <h2 className="text-base font-medium">{selected.name}</h2>
            <Badge variant="outline" className="text-[10px] capitalize">
              {selected.visibility}
            </Badge>
            <Badge
              variant={PROJECT_STATUS_VARIANT[selected.status]}
              className={cn(
                "text-[10px]",
                projectStatusBadgeClass(selected.status),
              )}
            >
              {PROJECT_STATUS_LABELS[selected.status]}
            </Badge>
          </div>

          <ProjectFolderMain
            projectId={projectId}
            folder={selected}
            siteUrl={siteUrl}
            projectReadOnly={projectReadOnly}
            hasClientFeedback={hasClientFeedback}
            projectCommentCount={projectCommentCount}
            feedbackMode={feedbackMode}
            onFeedbackModeChange={(next) => {
              setFeedbackMode(next);
              setPanelOpen(next);
            }}
            panelOpen={panelOpen}
            onPanelOpenChange={setPanelOpen}
          />
        </div>
      </div>
    </div>
  );
}
