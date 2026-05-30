import { FolderClientLinkSection } from "@/components/folder-client-link-section";
import { FolderActionsMenu } from "@/components/folder-actions-menu";
import { FolderUploadSection } from "@/components/folder-upload-section";
import { ProjectDeliverablesSection } from "@/components/project-deliverables-section";
import { ProjectFeedbackSection } from "@/components/project-feedback-section";
import { clientPreviewPath } from "@/lib/client-preview";
import {
  canShareFolder,
  canUploadToFolder,
  folderNeedsRevisionUpload,
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

type ProjectFolderPanelProps = {
  projectId: string;
  folder: ProjectFolderWithToken;
  siteUrl: string;
  projectReadOnly: boolean;
};

export function ProjectFolderPanel({
  projectId,
  folder,
  siteUrl,
  projectReadOnly,
}: ProjectFolderPanelProps) {
  const token = folderReviewToken(folder);
  const reviewPath = token ? `/review/${token}` : null;
  const reviewUrl = reviewPath ? `${siteUrl}${reviewPath}` : null;
  const previewPath = clientPreviewPath(projectId, folder.id);
  const hasAssets = folder.assets.length > 0;
  const shareable =
    folder.visibility === "public" && canShareFolder(folder) && !projectReadOnly;
  const readOnly = projectReadOnly || folder.status === "approved";
  const showFeedback =
    folder.status === "changes_requested" && Boolean(folder.client_feedback);
  const showUpload =
    !readOnly &&
    canUploadToFolder(folder, projectReadOnly) &&
    (!hasAssets || folderNeedsRevisionUpload(folder));

  const replaceOnUpload = hasAssets && folder.status === "changes_requested";

  return (
    <section
      className={cn(
        "space-y-5 rounded-xl border bg-card p-5",
        folder.visibility === "hidden" && "border-dashed bg-muted/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-medium">{folder.name}</h2>
            <Badge variant="outline" className="text-[10px] capitalize">
              {folder.visibility}
            </Badge>
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
            {folder.visibility === "hidden"
              ? "Internal only — not shown on the project client link."
              : "Included on the project review link when published."}
          </p>
        </div>
        <FolderActionsMenu folder={folder} />
      </div>

      {showFeedback && folder.client_feedback ? (
        <ProjectFeedbackSection feedback={folder.client_feedback} />
      ) : null}

      {hasAssets ? (
        <ProjectDeliverablesSection assets={folder.assets} readOnly={readOnly} />
      ) : null}

      {showUpload ? (
        <div className="rounded-lg border border-dashed p-4">
          <p className="mb-3 text-sm font-medium">
            {replaceOnUpload ? "Upload a new version" : "Upload deliverables"}
          </p>
          <FolderUploadSection
            projectId={projectId}
            folderId={folder.id}
            replace={replaceOnUpload}
          />
        </div>
      ) : null}

      {folder.visibility === "public" ? (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Folder client link</p>
          <FolderClientLinkSection
            folderId={folder.id}
            reviewUrl={reviewUrl}
            previewPath={shareable ? previewPath : null}
            hasToken={Boolean(token)}
            shareable={shareable}
            readOnly={readOnly}
          />
        </div>
      ) : null}
    </section>
  );
}
