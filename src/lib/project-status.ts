import type { ProjectStatus } from "@/types/database";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  active: "Pending review",
  approved: "Approved",
  changes_requested: "Changes requested",
};

export const PROJECT_STATUS_VARIANT: Record<
  ProjectStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  active: "default",
  approved: "outline",
  changes_requested: "secondary",
};

/** Client feedback accent — warm amber, not error red. */
export const CHANGES_REQUESTED_DOT_CLASS = "bg-amber-500";
export const CHANGES_REQUESTED_BLOCK_RING_CLASS = "ring-1 ring-amber-500/30";
export const CHANGES_REQUESTED_BADGE_CLASS =
  "border-amber-500/25 bg-amber-500/10 text-amber-950 dark:text-amber-100";

export function folderStatusDotClass(status: ProjectStatus): string {
  const tones: Record<ProjectStatus, string> = {
    draft: "bg-muted-foreground/40",
    active: "bg-primary",
    approved: "bg-emerald-500",
    changes_requested: CHANGES_REQUESTED_DOT_CLASS,
  };
  return tones[status];
}

export function projectStatusBadgeClass(status: ProjectStatus): string | undefined {
  return status === "changes_requested" ? CHANGES_REQUESTED_BADGE_CLASS : undefined;
}
