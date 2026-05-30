"use client";

import Link from "next/link";
import { Folder } from "lucide-react";
import { ProjectActionsMenu } from "@/components/project-actions-menu";
import { Badge } from "@/components/ui/badge";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_VARIANT,
  projectStatusBadgeClass,
} from "@/lib/project-status";
import { PROJECT_TYPE_ICONS } from "@/lib/project-type-icons";
import { projectTypeLabel } from "@/lib/project-types";
import type { ProjectStatus, ProjectWithToken } from "@/types/database";
import { cn } from "@/lib/utils";

const FOLDER_TINT: Record<ProjectStatus, string> = {
  draft: "text-muted-foreground",
  active: "text-primary",
  approved: "text-emerald-600",
  changes_requested: "text-amber-700 dark:text-amber-400",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

type ProjectFolderCardProps = {
  project: ProjectWithToken;
};

export function ProjectFolderCard({ project }: ProjectFolderCardProps) {
  const type = project.project_type as keyof typeof PROJECT_TYPE_ICONS | null;
  const TypeIcon =
    type && type in PROJECT_TYPE_ICONS ? PROJECT_TYPE_ICONS[type] : null;
  const fileCount = project.assets.length;

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card shadow-sm transition-all",
        "hover:border-foreground/15 hover:shadow-md",
      )}
    >
      <div className="absolute top-2 right-2 z-10">
        <ProjectActionsMenu project={project} />
      </div>

      <Link
        href={`/dashboard/${project.id}`}
        className="flex flex-col rounded-xl p-4 pt-8 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="relative mb-4 flex h-20 items-end justify-center">
          <Folder
            className={cn(
              "size-16 fill-current stroke-[1.25]",
              FOLDER_TINT[project.status],
              "opacity-90 transition-transform group-hover:scale-105",
            )}
            aria-hidden
          />
          {TypeIcon ? (
            <span
              className="absolute bottom-1 right-[calc(50%-2.25rem)] flex size-7 items-center justify-center rounded-md border bg-background shadow-sm"
              aria-hidden
            >
              <TypeIcon className="size-3.5 text-muted-foreground" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <p className="truncate pr-6 text-sm font-semibold leading-tight">
            {project.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {projectTypeLabel(project.project_type) ?? "Project"}
            {fileCount > 0
              ? ` · ${fileCount} file${fileCount === 1 ? "" : "s"}`
              : " · No files yet"}
          </p>
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant={PROJECT_STATUS_VARIANT[project.status]}
              className={cn(
                "text-[10px]",
                projectStatusBadgeClass(project.status),
              )}
            >
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDate(project.created_at)}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
