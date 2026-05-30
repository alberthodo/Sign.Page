"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { approveReviewFolderWithSignature } from "@/app/actions/review";
import {
  FolderContentReview,
  type FolderContentReviewCommentsProps,
} from "@/components/folder-content-review";
import { ReviewApproveDialog } from "@/components/review-approve-dialog";
import { ReviewFoldersTabs } from "@/components/review-folders-tabs";
import { ReviewThreadPanel } from "@/components/review-thread-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useReviewComments } from "@/hooks/use-review-comments";
import { resolveFolderBlocks } from "@/lib/folder-content";
import {
  canClientCommentOnReviewFolder,
  isReviewFolderActive,
  isReviewFolderLocked,
  pickDefaultReviewFolderId,
  type ReviewContext,
} from "@/lib/review";
import { cn } from "@/lib/utils";

type ReviewWorkspaceProps = {
  token: string;
  review: ReviewContext;
  isProjectScope: boolean;
};

function ApprovalRecord({
  signerName,
  signature,
  approvedAt,
  folderName,
}: {
  signerName: string | null;
  signature: string | null;
  approvedAt: string | null;
  folderName?: string;
}) {
  if (!signerName && !signature) {
    return null;
  }

  return (
    <div className="mb-10 rounded-xl border bg-muted/30 px-6 py-6">
      <p className="font-medium">
        {folderName ? `${folderName} approved` : "Approved and locked"}
      </p>
      {signerName ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Signed by <span className="font-medium text-foreground">{signerName}</span>
          {approvedAt ? (
            <span> · {new Date(approvedAt).toLocaleString()}</span>
          ) : null}
        </p>
      ) : null}
      {signature ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={signature}
          alt={`Signature of ${signerName ?? "client"}`}
          className="mt-4 max-h-24 rounded-md border bg-white"
        />
      ) : null}
    </div>
  );
}

export function ReviewWorkspace({
  token,
  review,
  isProjectScope,
}: ReviewWorkspaceProps) {
  const router = useRouter();
  const { project, folders, scope, subject } = review;
  const defaultFolderId = useMemo(
    () => pickDefaultReviewFolderId(folders),
    [folders],
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    defaultFolderId,
  );
  const [approveOpen, setApproveOpen] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending] = useTransition();

  useEffect(() => {
    setSelectedFolderId((current) => {
      if (current && folders.some((f) => f.id === current)) {
        return current;
      }
      return pickDefaultReviewFolderId(folders);
    });
  }, [folders]);

  const selectedFolder =
    folders.find((f) => f.id === selectedFolderId) ?? folders[0] ?? null;

  const isLocked = selectedFolder
    ? isReviewFolderLocked(selectedFolder.status)
    : true;
  const canApprove = selectedFolder
    ? isReviewFolderActive(selectedFolder.status)
    : false;
  const canComment = selectedFolder
    ? canClientCommentOnReviewFolder(selectedFolder.status)
    : false;

  const comments = useReviewComments({
    token,
    folderId: selectedFolder?.id ?? null,
    canComment,
    commentMode: feedbackMode,
    onCommentModeChange: setFeedbackMode,
  });

  const contentBlocks = useMemo(
    () =>
      selectedFolder
        ? resolveFolderBlocks(selectedFolder.content_blocks, selectedFolder.assets)
        : [],
    [selectedFolder],
  );

  const commentsProps: FolderContentReviewCommentsProps | undefined =
    selectedFolder
      ? {
          threadsByBlock: comments.threadsByBlock,
          threadNumberById: comments.threadNumberById,
          commentMode: feedbackMode,
          canComment,
          activeThreadId: comments.activeThreadId,
          activeBlockId: comments.activeBlockId,
          pendingPin: comments.pendingPin,
          stickyOpen: comments.stickyOpen,
          stickyBody: comments.stickyBody,
          stickyClientName: comments.stickyClientName,
          showClientName: true,
          sending: comments.sending,
          stickyError: comments.stickyError,
          onStickyBodyChange: comments.setStickyBody,
          onStickyClientNameChange: comments.setStickyClientName,
          onBlockClick: comments.handleBlockClick,
          onPinClick: comments.handlePinClick,
          onStickySend: comments.handleStickySend,
          onStickyCancel: comments.handleStickyCancel,
        }
      : undefined;

  const approveLabel = selectedFolder
    ? `Approve ${selectedFolder.name}`
    : "Approve";

  useEffect(() => {
    setError(null);
  }, [selectedFolderId]);

  const folderScope = !isProjectScope ? folders[0] : null;
  const folderScopeName =
    scope === "folder" ? (subject.folderName ?? folders[0]?.name ?? null) : null;
  return (
    <>
      <header className="mb-10 border-b pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Client review
        </p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {project.title}
            </h1>
            {folderScopeName ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Deliverable:{" "}
                <span className="font-medium text-foreground">{folderScopeName}</span>
              </p>
            ) : isProjectScope && folders.length > 1 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {folders.length} deliverables — approve or request changes on each tab
              </p>
            ) : null}
          </div>

          {selectedFolder ? (
            <Button
              type="button"
              size="sm"
              disabled={!canApprove || isPending}
              onClick={() => {
                setError(null);
                setApproveOpen(true);
              }}
              variant="ghost"
              className={cn(
                "shrink-0 gap-1.5 px-0 text-emerald-700",
                "hover:bg-transparent hover:text-emerald-800",
                "dark:text-emerald-400 dark:hover:text-emerald-300",
                "disabled:opacity-60",
              )}
              aria-label={approveLabel}
              title={
                canApprove
                  ? approveLabel
                  : "This deliverable is not open for approval"
              }
            >
              <CheckCircle2 className="size-4" />
              Approve
            </Button>
          ) : null}
        </div>
      </header>

      <div className="space-y-6">
        {selectedFolder ? (
          <div className="flex min-h-9 flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant={comments.panelOpen ? "secondary" : "outline"}
              size="sm"
              onClick={() => comments.setPanelOpen((o) => !o)}
              className="gap-1.5"
            >
              <MessageSquare className="size-4" />
              Comments
              {comments.commentCount > 0 ? (
                <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs tabular-nums">
                  {comments.commentCount}
                </span>
              ) : null}
            </Button>

            <div className="flex items-center gap-2">
              <Label htmlFor="feedback-mode-toggle" className="text-[0.8rem] text-muted-foreground">
                Feedback mode
              </Label>
              <Switch
                id="feedback-mode-toggle"
                checked={feedbackMode}
                aria-label="Feedback mode"
                onCheckedChange={(next) => {
                  setFeedbackMode(next);
                  comments.setPanelOpen(next);
                  if (!next) {
                    comments.setActiveThreadId(null);
                    comments.setActiveBlockId(null);
                  }
                }}
              />
            </div>
            {comments.stickyError ? (
              <p className="w-full text-sm text-destructive" role="alert">
                {comments.stickyError}
              </p>
            ) : null}
          </div>
        ) : null}

        {isProjectScope ? (
          <ReviewFoldersTabs
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectedFolderChange={setSelectedFolderId}
            comments={commentsProps}
          />
        ) : folderScope ? (
          <>
            {folderScope.status === "approved" ? (
              <ApprovalRecord
                signerName={folderScope.client_approved_by_name}
                signature={folderScope.client_signature}
                approvedAt={folderScope.approved_at}
                folderName={folderScope.name}
              />
            ) : null}

            <FolderContentReview
              contentBlocks={folderScope.content_blocks}
              assets={folderScope.assets}
              folderName={folderScope.name}
              readOnly={isLocked}
              comments={commentsProps}
            />
          </>
        ) : null}
      </div>

      {selectedFolder ? (
        <ReviewThreadPanel
          key={selectedFolder.id}
          open={comments.panelOpen}
          onClose={() => comments.setPanelOpen(false)}
          folderName={selectedFolder.name}
          blocks={contentBlocks}
          threads={comments.threads}
          threadNumberById={comments.threadNumberById}
          activeThreadId={comments.activeThreadId}
          onSelectThread={comments.selectThread}
          onBack={() => {
            comments.setActiveThreadId(null);
            comments.setActiveBlockId(null);
          }}
          onSend={comments.handlePanelSend}
          canSend={canComment}
          sending={comments.sending}
          loading={comments.loadingThreads}
          error={comments.threadsError}
          showClientName
          freelancerDisplayName="Freelancer"
        />
      ) : null}

      {canApprove && selectedFolder ? (
        <ReviewApproveDialog
          open={approveOpen}
          onOpenChange={setApproveOpen}
          title={`Approve ${selectedFolder.name}`}
          description="Type your name and sign below. This locks approval for this deliverable only."
          confirmLabel={approveLabel}
          onConfirm={(signerName, signature) =>
            approveReviewFolderWithSignature(
              token,
              selectedFolder.id,
              signerName,
              signature,
            )
          }
          onSuccess={() => router.refresh()}
        />
      ) : null}

    </>
  );
}
