"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Trash2 } from "lucide-react";
import { removeFolderAsset } from "@/app/actions/folders";
import { fileNameFromAssetUrl } from "@/lib/project-page";
import { isImageUrl, isPdfUrl } from "@/lib/uploads";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FolderDeliverablesGridProps = {
  folderId: string;
  assets: string[];
  readOnly?: boolean;
};

export function FolderDeliverablesGrid({
  folderId,
  assets,
  readOnly = false,
}: FolderDeliverablesGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(assetUrl: string) {
    const fileName = fileNameFromAssetUrl(assetUrl);
    if (!window.confirm(`Remove "${fileName}" from this folder?`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await removeFolderAsset(folderId, assetUrl);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (assets.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {assets.length} file{assets.length === 1 ? "" : "s"}
        {readOnly ? " · Approved and locked" : ""}
      </p>

      <div className="grid grid-cols-1 gap-3">
        {assets.map((url) => {
          const fileName = fileNameFromAssetUrl(url);
          const pdf = isPdfUrl(url);
          const image = isImageUrl(url);

          return (
            <article
              key={url}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-card",
                isPending && "opacity-60",
              )}
            >
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block"
                aria-label={`Open ${fileName}`}
              >
                <div className="relative flex aspect-[4/3] items-center justify-center bg-muted/20">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={fileName}
                      className="size-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : pdf ? (
                    <iframe
                      src={url}
                      title={fileName}
                      className="size-full border-0"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <FileText
                        className="size-10 text-muted-foreground"
                        strokeWidth={1.25}
                      />
                      <span className="text-xs text-muted-foreground">View file</span>
                    </div>
                  )}
                </div>
              </a>

              <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
                <span className="min-w-0 truncate text-xs font-medium">{fileName}</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Open ${fileName} in new tab`}
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>

              {!readOnly ? (
                <div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    disabled={isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(url);
                    }}
                    aria-label={`Delete ${fileName}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
