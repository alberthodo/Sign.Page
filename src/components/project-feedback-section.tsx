import { MessageSquareWarning } from "lucide-react";

type ProjectFeedbackSectionProps = {
  feedback: string;
  compact?: boolean;
};

export function ProjectFeedbackSection({
  feedback,
  compact = false,
}: ProjectFeedbackSectionProps) {
  return (
    <section
      id="project-feedback"
      className={
        compact
          ? "scroll-mt-6 space-y-2 rounded-lg border border-border bg-muted/40 px-4 py-3"
          : "scroll-mt-6 space-y-3 rounded-xl border border-border bg-muted/40 p-5"
      }
    >
      <div className="flex items-center gap-2">
        <MessageSquareWarning
          className={compact ? "size-4 text-foreground" : "size-5 text-foreground"}
          strokeWidth={1.75}
          aria-hidden
        />
        <p className={compact ? "text-sm font-medium" : "text-lg font-medium"}>
          Client feedback
        </p>
      </div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{feedback}</p>
    </section>
  );
}
