import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ProjectShareButton } from "@/components/project-share-button";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_VARIANT,
  projectStatusBadgeClass,
} from "@/lib/project-status";
import { formatDateTime, getProjectStatusContext } from "@/lib/project-page";
import { projectTypeLabel } from "@/lib/project-types";
import type { ProjectWithToken } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProjectHeaderProps = {
  project: ProjectWithToken;
  reviewUrl: string | null;
  previewPath: string;
  shareable: boolean;
  publishedFolderCount?: number;
  folderLinks?: {
    id: string;
    name: string;
    reviewUrl: string | null;
    shareable: boolean;
    hasToken: boolean;
    visibility: "public" | "hidden";
    status: "draft" | "active" | "approved" | "changes_requested";
  }[];
  clientCommentCount?: number;
};

export function ProjectHeader({
  project,
  reviewUrl,
  previewPath,
  shareable,
  publishedFolderCount,
  folderLinks = [],
  clientCommentCount = 0,
}: ProjectHeaderProps) {
  const status = getProjectStatusContext(project, Boolean(reviewUrl));

  return (
    <header className="space-y-4 border-b pb-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Workspace
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-foreground">{project.title}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.title}
            </h1>
            <Badge
              variant={PROJECT_STATUS_VARIANT[project.status]}
              className={projectStatusBadgeClass(project.status)}
            >
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            {clientCommentCount > 0 ? (
              <Badge variant="secondary" className="tabular-nums">
                {clientCommentCount} client comment
                {clientCommentCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
          <p
            className={cn(
              "text-sm leading-relaxed",
              status.tone === "attention"
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            {status.message}
            {status.detail ? (
              <>
                <span aria-hidden> · </span>
                {status.detail}
              </>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {projectTypeLabel(project.project_type) ?? "Project"}
            <span aria-hidden> · </span>
            Created {formatDateTime(project.created_at)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ProjectShareButton
            projectId={project.id}
            reviewUrl={reviewUrl}
            previewPath={previewPath}
            shareable={shareable}
            publishedFolderCount={publishedFolderCount}
            hasToken={Boolean(project.review_tokens?.some((t) => t.scope === "project" || (!t.scope && t.folder_id === null)))}
            folderLinks={folderLinks}
          />
          {shareable ? (
            <Button
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="border-0 bg-transparent shadow-none hover:bg-transparent hover:text-foreground"
              render={
                <Link href={previewPath} target="_blank" rel="noreferrer" />
              }
            >
              <ExternalLink className="size-4" />
              Preview
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
