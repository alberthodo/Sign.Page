import Link from "next/link";
import { Link2 } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { RegenerateLinkButton } from "@/components/regenerate-link-button";
import { Button } from "@/components/ui/button";

type ProjectClientLinkSectionProps = {
  projectId: string;
  reviewUrl: string | null;
  previewPath: string;
  hasToken: boolean;
  /** When false, show a placeholder until deliverables are published. */
  shareable: boolean;
  readOnly?: boolean;
};

export function ProjectClientLinkSection({
  projectId,
  reviewUrl,
  previewPath,
  hasToken,
  shareable,
  readOnly = false,
}: ProjectClientLinkSectionProps) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex gap-3">
        <Link2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <h2 className="text-lg font-medium">Client review link</h2>
          <p className="text-sm text-muted-foreground">
            Send this to your client. They can review and approve without an account.
          </p>
        </div>
      </div>

      {!shareable ? (
        <p className="text-sm text-muted-foreground">
          Upload and publish deliverables to generate a shareable link.
        </p>
      ) : reviewUrl ? (
        <div className="space-y-3">
          <code className="block w-full truncate rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
            {reviewUrl}
          </code>
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly ? (
              <CopyLinkButton url={reviewUrl} label="Copy client link" />
            ) : null}
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              render={
                <Link href={previewPath} target="_blank" rel="noreferrer" />
              }
            >
              Preview client view
            </Button>
            {!readOnly ? (
              <RegenerateLinkButton
                projectId={projectId}
                hasToken={hasToken}
                compact
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            No client link yet for this project.
          </p>
          {!readOnly ? (
            <RegenerateLinkButton projectId={projectId} hasToken={false} />
          ) : null}
        </div>
      )}
    </section>
  );
}
