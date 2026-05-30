"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  FileUp,
  MessageSquareWarning,
  Pencil,
} from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { Button } from "@/components/ui/button";
import {
  getProjectStatusContext,
  type ProjectPrimaryAction,
} from "@/lib/project-page";
import type { ProjectWithToken } from "@/types/database";
import { cn } from "@/lib/utils";

type ProjectStatusBannerProps = {
  project: ProjectWithToken;
  reviewUrl: string | null;
  previewPath: string;
};

const TONE_STYLES = {
  default: "border-border bg-muted/30",
  primary: "border-primary/20 bg-primary/5",
  success: "border-emerald-500/25 bg-emerald-500/5",
  warning: "border-amber-500/25 bg-amber-500/5",
  destructive: "border-destructive/25 bg-destructive/5",
  attention: "border-border bg-muted/40",
} as const;

const TONE_ICONS = {
  default: Pencil,
  primary: Clock,
  success: CheckCircle2,
  warning: Clock,
  destructive: MessageSquareWarning,
  attention: MessageSquareWarning,
} as const;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function PrimaryAction({
  action,
  reviewUrl,
  previewPath,
}: {
  action: ProjectPrimaryAction;
  reviewUrl: string | null;
  previewPath: string;
}) {
  if (!action) {
    return null;
  }

  if (action === "upload") {
    return (
      <Button type="button" size="sm" onClick={() => scrollToId("project-folders")}>
        <FileUp className="size-4" />
        Upload deliverables
      </Button>
    );
  }

  if (action === "view-feedback") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => scrollToId("project-feedback")}
      >
        View feedback
      </Button>
    );
  }

  if (action === "copy-link" && reviewUrl) {
    return <CopyLinkButton url={reviewUrl} label="Copy client link" />;
  }

  if (action === "preview") {
    return (
      <Button
        nativeButton={false}
        size="sm"
        variant="outline"
        render={<Link href={previewPath} target="_blank" rel="noreferrer" />}
      >
        Preview client view
      </Button>
    );
  }

  return null;
}

export function ProjectStatusBanner({
  project,
  reviewUrl,
  previewPath,
}: ProjectStatusBannerProps) {
  const ctx = getProjectStatusContext(project, Boolean(reviewUrl));
  const Icon = TONE_ICONS[ctx.tone];

  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
        TONE_STYLES[ctx.tone],
      )}
    >
      <div className="flex gap-3">
        <Icon
          className={cn(
            "mt-0.5 size-5 shrink-0",
            ctx.tone === "destructive" && "text-destructive",
            ctx.tone === "attention" && "text-foreground",
            ctx.tone === "success" && "text-emerald-600",
            ctx.tone === "primary" && "text-primary",
          )}
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="space-y-1">
          <p className="text-sm font-medium">{ctx.message}</p>
          {ctx.detail ? (
            <p className="text-sm text-muted-foreground">{ctx.detail}</p>
          ) : null}
        </div>
      </div>
      <PrimaryAction
        action={ctx.primaryAction}
        reviewUrl={reviewUrl}
        previewPath={previewPath}
      />
    </section>
  );
}
