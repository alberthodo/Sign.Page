"use client";

import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ClientPreviewHeaderProps = {
  projectId: string;
  title: string;
  folderName?: string | null;
};

function PreviewBackLink({ projectId }: { projectId: string }) {
  function handleBack() {
    window.close();
    window.setTimeout(() => {
      if (!window.closed) {
        window.location.assign(`/dashboard/${projectId}`);
      }
    }, 200);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      Back to project
    </button>
  );
}

export function ClientPreviewHeader({
  projectId,
  title,
  folderName,
}: ClientPreviewHeaderProps) {
  return (
    <header className="border-b">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <PreviewBackLink projectId={projectId} />
          <Badge variant="outline" className="font-normal text-muted-foreground">
            Preview
          </Badge>
        </div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Client view
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {folderName ? (
          <p className="mt-2 text-sm text-muted-foreground">{folderName}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Published deliverables · read-only
          </p>
        )}
      </div>
    </header>
  );
}
