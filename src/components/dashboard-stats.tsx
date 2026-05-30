import { CheckCircle2, Clock, FolderKanban, MessageSquareWarning } from "lucide-react";
import type { DashboardStats } from "@/lib/dashboard-projects";
import { cn } from "@/lib/utils";

type DashboardStatsProps = {
  stats: DashboardStats;
};

const STAT_ITEMS = [
  {
    key: "total" as const,
    label: "Projects",
    icon: FolderKanban,
    accent: "text-foreground",
    bg: "bg-muted/50",
  },
  {
    key: "pendingReview" as const,
    label: "Awaiting client",
    icon: Clock,
    accent: "text-primary",
    bg: "bg-primary/5",
  },
  {
    key: "changesRequested" as const,
    label: "Needs your attention",
    icon: MessageSquareWarning,
    accent: "text-amber-800 dark:text-amber-300",
    bg: "bg-amber-500/10",
  },
  {
    key: "approved" as const,
    label: "Approved",
    icon: CheckCircle2,
    accent: "text-emerald-600",
    bg: "bg-emerald-500/5",
  },
] as const;

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STAT_ITEMS.map(({ key, label, icon: Icon, accent, bg }) => {
        const value = stats[key];
        const highlight = key === "changesRequested" && value > 0;

        return (
          <div
            key={key}
            className={cn(
              "rounded-xl border bg-card px-4 py-4",
              highlight && "border-amber-500/25",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  bg,
                  accent,
                )}
                aria-hidden
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
