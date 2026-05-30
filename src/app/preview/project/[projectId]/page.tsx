import { notFound } from "next/navigation";
import { ClientPreviewHeader } from "@/components/client-preview-banner";
import { ReviewFoldersTabs } from "@/components/review-folders-tabs";
import { PreviewReviewContent } from "@/components/preview-review-content";
import { FolderContentReview } from "@/components/folder-content-review";
import { foldersForClientPreview } from "@/lib/client-preview";
import { PROJECT_WITH_FOLDERS_SELECT } from "@/lib/projects-query";
import { createClient } from "@/lib/supabase/server";
import type { ProjectWithFolders } from "@/types/database";

export const dynamic = "force-dynamic";

type ClientPreviewPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ folder?: string; all?: string }>;
};

export default async function ClientPreviewPage({
  params,
  searchParams,
}: ClientPreviewPageProps) {
  const { projectId } = await params;
  const { folder: folderId, all } = await searchParams;
  const showAll = all === "1" || all === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select(PROJECT_WITH_FOLDERS_SELECT)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !project) {
    notFound();
  }

  const typed = project as ProjectWithFolders;
  const allFolders = typed.project_folders ?? [];
  const published = foldersForClientPreview(allFolders);
  const isFolderScope = Boolean(folderId);

  let previewFolders = showAll
    ? allFolders.filter((f) => f.visibility === "public")
    : published;
  if (isFolderScope && folderId) {
    previewFolders = published.filter((f) => f.id === folderId);
    if (previewFolders.length === 0) {
      const target = allFolders.find((f) => f.id === folderId);
      return (
        <div className="min-h-screen bg-background">
          <ClientPreviewHeader
            projectId={projectId}
            title={typed.title}
            folderName={target?.name ?? null}
          />
          <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <p className="text-center text-sm text-muted-foreground">
              {target?.status === "draft"
                ? "This folder is not published yet. Use Publish changes before it appears on the client link."
                : target?.visibility === "hidden"
                  ? "Hidden folders are not shown on the client review link."
                  : "This folder is not available for client preview."}
            </p>
          </main>
        </div>
      );
    }
  }

  const folderScopeName =
    isFolderScope && previewFolders[0] ? previewFolders[0].name : null;

  return (
    <div className="min-h-screen bg-background">
      <ClientPreviewHeader
        projectId={projectId}
        title={typed.title}
        folderName={folderScopeName}
      />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {isFolderScope && previewFolders[0] ? (
          <PreviewReviewContent
            projectId={projectId}
            folderId={previewFolders[0].id}
            folderName={previewFolders[0].name}
            contentBlocks={previewFolders[0].content_blocks}
            assets={previewFolders[0].assets}
          />
        ) : previewFolders.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Nothing published yet. Publish at least one public folder to preview
            what your client will see.
          </p>
        ) : (
          <ReviewFoldersTabs
            folders={previewFolders}
            initialFolderId={folderId ?? null}
          />
        )}
      </main>
    </div>
  );
}
