import type { ProjectStatus, ProjectWithToken } from "@/types/database";

export type DashboardStats = {
  total: number;
  pendingReview: number;
  changesRequested: number;
  approved: number;
  drafts: number;
};

const STATUS_SORT_ORDER: Record<ProjectStatus, number> = {
  changes_requested: 0,
  active: 1,
  draft: 2,
  approved: 3,
};

export function computeDashboardStats(
  projects: ProjectWithToken[],
): DashboardStats {
  return {
    total: projects.length,
    pendingReview: projects.filter((p) => p.status === "active").length,
    changesRequested: projects.filter((p) => p.status === "changes_requested")
      .length,
    approved: projects.filter((p) => p.status === "approved").length,
    drafts: projects.filter((p) => p.status === "draft").length,
  };
}

/** Surfaces projects that need freelancer action first. */
export function sortProjectsForDashboard(
  projects: ProjectWithToken[],
): ProjectWithToken[] {
  return [...projects].sort((a, b) => {
    const statusDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
}

export function projectsNeedingAttention(
  projects: ProjectWithToken[],
): ProjectWithToken[] {
  return projects.filter((p) => p.status === "changes_requested");
}
