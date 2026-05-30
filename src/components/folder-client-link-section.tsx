import Link from "next/link";
import { CopyLinkButton } from "@/components/copy-link-button";
import { RegenerateFolderLinkButton } from "@/components/regenerate-folder-link-button";
import { Button } from "@/components/ui/button";

type FolderClientLinkSectionProps = {
  folderId: string;
  reviewUrl: string | null;
  previewPath: string | null;
  hasToken: boolean;
  shareable: boolean;
  readOnly?: boolean;
};

export function FolderClientLinkSection({
  folderId,
  reviewUrl,
  previewPath,
  hasToken,
  shareable,
  readOnly = false,
}: FolderClientLinkSectionProps) {
  if (!shareable) {
    return (
      <p className="text-sm text-muted-foreground">
        Publish files in this folder to get a shareable link.
      </p>
    );
  }

  if (!reviewUrl) {
    return !readOnly ? (
      <RegenerateFolderLinkButton folderId={folderId} hasToken={false} />
    ) : (
      <p className="text-sm text-muted-foreground">No client link yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      <code className="block w-full truncate rounded-md border bg-muted/30 px-3 py-2 text-xs">
        {reviewUrl}
      </code>
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly ? (
          <CopyLinkButton url={reviewUrl} label="Copy folder link" />
        ) : null}
        {previewPath ? (
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
        ) : null}
        {!readOnly ? (
          <RegenerateFolderLinkButton
            folderId={folderId}
            hasToken={hasToken}
          />
        ) : null}
      </div>
    </div>
  );
}
