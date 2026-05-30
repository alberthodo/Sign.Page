"use client";

import { useMemo } from "react";
import { FolderActionsMenu } from "@/components/folder-actions-menu";
import { FolderContentEditor } from "@/components/folder-content-editor";
import { FolderContentReview } from "@/components/folder-content-review";
import { FolderPublishButton } from "@/components/folder-publish-button";
import { ProjectFeedbackToolbar } from "@/components/project-feedback-toolbar";
import { ReviewThreadPanel } from "@/components/review-thread-panel";
import { useProjectFolderFeedback } from "@/hooks/use-project-folder-feedback";
import { hasFolderContent, resolveFolderBlocks } from "@/lib/folder-content";
import {
  pinnedFeedbackBadgeLabels,
  pinnedFeedbackBlockIds,
} from "@/lib/pinned-feedback";
import {
  canShareFolder,
  canUploadToFolder,
  folderReviewToken,
} from "@/lib/project-folders";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_VARIANT,
  projectStatusBadgeClass,
} from "@/lib/project-status";
import type { ProjectFolderWithToken } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProjectFolderMainProps = {
  projectId: string;
  folder: ProjectFolderWithToken;
  siteUrl: string;
  projectReadOnly: boolean;
  hasClientFeedback: boolean;
  projectCommentCount: number;
  feedbackMode: boolean;
  onFeedbackModeChange: (enabled: boolean) => void;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
};

export function ProjectFolderMain({
  projectId,
  folder,
  siteUrl,
  projectReadOnly,
  hasClientFeedback,
  projectCommentCount,
  feedbackMode,
  onFeedbackModeChange,
  panelOpen,
  onPanelOpenChange,
}: ProjectFolderMainProps) {
  const folderToken = folderReviewToken(folder);
  const folderReviewUrl = folderToken ? `${siteUrl}/review/${folderToken}` : null;
  const folderShareable =
    folder.visibility === "public" && canShareFolder(folder) && !projectReadOnly;

  const resolvedBlocks = resolveFolderBlocks(
    folder.content_blocks,
    folder.assets,
  );
  const hasContent = hasFolderContent(resolvedBlocks);
  const fileCount = folder.assets.length;
  const readOnly = projectReadOnly || folder.status === "approved";
  const canEdit = !readOnly && canUploadToFolder(folder, projectReadOnly);

  const feedback = useProjectFolderFeedback({
    projectId,
    folderId: folder.id,
    contentBlocks: folder.content_blocks,
    assets: folder.assets,
    feedbackMode: feedbackMode && hasClientFeedback,
  });

  const replaceOnUpload = folder.status === "changes_requested" && fileCount > 0;
  const isRevisionRound = folder.status === "changes_requested";
  const isFirstPublish = folder.status === "draft";
  const showPublish =
    canEdit &&
    hasContent &&
    folder.visibility === "public" &&
    (isFirstPublish || isRevisionRound);
  const pinnedBlockIds = pinnedFeedbackBlockIds(
    resolvedBlocks,
    feedback.threads,
  );
  const feedbackBadgeByBlockId = useMemo(
    () => pinnedFeedbackBadgeLabels(resolvedBlocks, feedback.threads),
    [resolvedBlocks, feedback.threads],
  );

  const showFeedbackToolbar =
    hasClientFeedback && folder.visibility === "public";
  const showFeedbackView = showFeedbackToolbar && feedbackMode;

  const visibilityHint =
    folder.visibility === "hidden"
      ? "Internal only — not on the client review link"
      : isRevisionRound
        ? showFeedbackView
          ? "Client left feedback — turn off feedback mode to edit and send a revision"
          : "Changes requested — update below, then send a revision to reopen client review"
        : folder.status === "draft" && hasContent
          ? "Not on the client link yet — publish when ready"
          : folder.status === "draft"
            ? "Edits save automatically until you publish"
            : folder.status === "active"
              ? "Awaiting client review on the shared link"
              : "Published — visible on the client review link";

  return (
    <div className="space-y-6">
      <div className="hidden items-start justify-between gap-3 md:flex">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{folder.name}</h2>
            {folder.visibility === "hidden" ? (
              <Badge variant="outline" className="text-[10px]">
                Internal
              </Badge>
            ) : null}
            <Badge
              variant={PROJECT_STATUS_VARIANT[folder.status]}
              className={cn(
                "text-[10px]",
                projectStatusBadgeClass(folder.status),
              )}
            >
              {PROJECT_STATUS_LABELS[folder.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {hasContent
              ? fileCount > 0
                ? `${fileCount} file${fileCount === 1 ? "" : "s"}`
                : "Notes added"
              : "Add a title, text, or files"}
            <span aria-hidden> · </span>
            {visibilityHint}
          </p>
        </div>
        <FolderActionsMenu
          folder={folder}
          folderReviewUrl={folderShareable ? folderReviewUrl : null}
        />
      </div>

      <div className="flex justify-end md:hidden">
        <FolderActionsMenu
          folder={folder}
          folderReviewUrl={folderShareable ? folderReviewUrl : null}
        />
      </div>

      {showFeedbackToolbar ? (
        <ProjectFeedbackToolbar
          feedbackMode={feedbackMode}
          onFeedbackModeChange={onFeedbackModeChange}
          panelOpen={panelOpen}
          onPanelOpenChange={onPanelOpenChange}
          commentCount={projectCommentCount}
        />
      ) : null}

      {showPublish && isFirstPublish && !showFeedbackView ? (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <FolderPublishButton folderId={folder.id} intent="initial" />
        </div>
      ) : null}

      {isRevisionRound && !showFeedbackView ? (
        <p className="text-sm text-muted-foreground">
          {pinnedBlockIds.size > 0
            ? `Pinned feedback on ${pinnedBlockIds.size} item${
                pinnedBlockIds.size === 1 ? "" : "s"
              } — update below, then send your revision when ready.`
            : "Update the deliverables below, then send your revision when ready."}
        </p>
      ) : null}

      {showFeedbackView ? (
        hasContent ? (
          <FolderContentReview
            contentBlocks={folder.content_blocks}
            assets={folder.assets}
            folderName={folder.name}
            readOnly
            comments={feedback.commentsProps}
          />
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No deliverables in this folder yet.
          </p>
        )
      ) : canEdit || hasContent ? (
        <FolderContentEditor
          projectId={projectId}
          folderId={folder.id}
          contentBlocks={folder.content_blocks ?? []}
          assets={folder.assets}
          readOnly={readOnly}
          replaceOnUpload={replaceOnUpload}
          hideBlockReviewNotices={hasClientFeedback}
          feedbackBadgeByBlockId={
            isRevisionRound && !showFeedbackView
              ? feedbackBadgeByBlockId
              : undefined
          }
        />
      ) : readOnly ? (
        <p className="text-sm text-muted-foreground">
          This folder is approved and locked.
        </p>
      ) : null}

      {showPublish && isRevisionRound && !showFeedbackView ? (
        <section
          aria-labelledby={`revision-cta-${folder.id}`}
          className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-4"
        >
          <div className="space-y-1">
            <h3
              id={`revision-cta-${folder.id}`}
              className="text-sm font-semibold tracking-tight"
            >
              Send a revision for review
            </h3>
            <p className="text-sm text-muted-foreground">
              Reopens this folder on your client link. They can approve or request
              changes again.
            </p>
          </div>
          <FolderPublishButton folderId={folder.id} intent="revision" />
        </section>
      ) : null}

      {showFeedbackToolbar ? (
        <ReviewThreadPanel
          key={folder.id}
          open={panelOpen}
          onClose={() => onPanelOpenChange(false)}
          folderName={folder.name}
          blocks={feedback.blocks}
          threads={feedback.threads}
          threadNumberById={feedback.threadNumberById}
          activeThreadId={feedback.activeThreadId}
          onSelectThread={(threadId) => {
            feedback.selectThread(threadId);
            onPanelOpenChange(true);
          }}
          onBack={() => {
            feedback.setActiveThreadId(null);
            feedback.setActiveBlockId(null);
          }}
          onSend={feedback.handlePanelSend}
          canSend
          sending={feedback.sending}
          loading={feedback.loading}
          error={feedback.error}
          showClientName={false}
          freelancerDisplayName="You"
        />
      ) : null}
    </div>
  );
}
