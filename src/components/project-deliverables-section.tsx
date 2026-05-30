import { ExternalLink, FileText } from "lucide-react";
import { fileNameFromAssetUrl } from "@/lib/project-page";
import { isPdfUrl } from "@/lib/uploads";
import { cn } from "@/lib/utils";

type ProjectDeliverablesSectionProps = {
  assets: string[];
  readOnly?: boolean;
  compact?: boolean;
};

export function ProjectDeliverablesSection({
  assets,
  readOnly = false,
  compact = false,
}: ProjectDeliverablesSectionProps) {
  if (assets.length === 0) {
    return null;
  }

  return (
    <section id="project-deliverables" className="scroll-mt-6 space-y-3">
      {!compact ? (
        <div className="space-y-1">
          <h2 className="text-lg font-medium">Deliverables</h2>
          <p className="text-sm text-muted-foreground">
            {assets.length} file{assets.length === 1 ? "" : "s"}
            {readOnly ? " · Approved and locked" : ""}
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-3",
          compact ? "sm:grid-cols-2" : "gap-4 sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {assets.map((url) => {
          const fileName = fileNameFromAssetUrl(url);
          const pdf = isPdfUrl(url);

          return (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "group overflow-hidden rounded-xl border bg-card transition-colors",
                "hover:border-foreground/15 hover:shadow-sm",
              )}
            >
              {pdf ? (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-muted/30 p-4">
                  <FileText className="size-10 text-muted-foreground" strokeWidth={1.25} />
                  <span className="text-xs font-medium text-muted-foreground">
                    PDF document
                  </span>
                </div>
              ) : (
                <div className="relative aspect-video overflow-hidden bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={fileName}
                    className="size-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                </div>
              )}
              <div className="flex items-center justify-between gap-2 border-t px-3 py-2.5">
                <span className="min-w-0 truncate text-sm font-medium">{fileName}</span>
                <ExternalLink
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
