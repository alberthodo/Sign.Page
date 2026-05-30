import { DashboardAttentionBanner } from "@/components/dashboard-attention-banner";
import { DashboardLiveRefresh } from "@/components/dashboard-live-refresh";
import { DashboardStats } from "@/components/dashboard-stats";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { ProjectsFolderGrid } from "@/components/projects-folder-grid";
import {
  computeDashboardStats,
  projectsNeedingAttention,
  sortProjectsForDashboard,
} from "@/lib/dashboard-projects";
import { PROJECT_WITH_TOKEN_SELECT } from "@/lib/projects-query";
import { createClient } from "@/lib/supabase/server";
import type { ProjectWithToken } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select(PROJECT_WITH_TOKEN_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load projects:", error.message);
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
        <p className="text-sm font-medium">Could not load projects</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const list = (projects as ProjectWithToken[] | null) ?? [];
  const stats = computeDashboardStats(list);
  const attention = projectsNeedingAttention(list);
  const sorted = sortProjectsForDashboard(list);
  const awaitingClientReview = list.some((p) => p.status === "active");

  return (
    <div className="space-y-8">
      <DashboardLiveRefresh enabled={awaitingClientReview} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
          <p className="text-sm text-muted-foreground">
            See what needs action, then open a project folder to work.
          </p>
        </div>
        <NewProjectDialog triggerClassName="shrink-0 self-start" />
      </header>

      <DashboardStats stats={stats} />

      <DashboardAttentionBanner projects={attention} />

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-medium text-foreground">
            Your projects
            <span className="ml-2 font-normal text-muted-foreground">
              {list.length}
            </span>
          </h2>
        </div>
        <ProjectsFolderGrid projects={sorted} />
      </section>
    </div>
  );
}
