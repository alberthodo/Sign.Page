import Link from "next/link";
import { ArrowRight, MessageSquareWarning } from "lucide-react";
import type { ProjectWithToken } from "@/types/database";

type DashboardAttentionBannerProps = {
  projects: ProjectWithToken[];
};

export function DashboardAttentionBanner({
  projects,
}: DashboardAttentionBannerProps) {
  if (projects.length === 0) {
    return null;
  }

  const count = projects.length;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <MessageSquareWarning
          className="mt-0.5 size-5 shrink-0 text-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {count === 1
              ? "A client requested changes"
              : `${count} clients requested changes`}
          </p>
          <p className="text-sm text-muted-foreground">
            Open the project, address feedback, then send revisions for review.
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2 sm:justify-end">
        {projects.slice(0, 3).map((project) => (
          <li key={project.id}>
            <Link
              href={`/dashboard/${project.id}`}
              className="inline-flex items-center gap-1 rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              {project.title}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </li>
        ))}
        {count > 3 ? (
          <li className="self-center text-xs text-muted-foreground">
            +{count - 3} more
          </li>
        ) : null}
      </ul>
    </div>
  );
}
