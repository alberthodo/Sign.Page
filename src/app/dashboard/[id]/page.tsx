import { notFound } from "next/navigation";
import { ProjectHeader } from "@/components/project-header";
import { ProjectLiveRefresh } from "@/components/project-live-refresh";
import { ProjectWorkspace } from "@/components/project-workspace";
import { clientPreviewPath } from "@/lib/client-preview";
import {
  aggregateProjectStatusFromFolders,
  canShareFolder,
  folderReviewToken,
  hasShareablePublicFolder,
  projectReviewToken,
  publishedPublicFolders,
  sortProjectFolders,
} from "@/lib/project-folders";
import { ensurePublishedFolderReviewTokens } from "@/lib/ensure-review-tokens";
import { canShareWithClient } from "@/lib/project-page";
import { PROJECT_WITH_FOLDERS_SELECT } from "@/lib/projects-query";
import { createClient } from "@/lib/supabase/server";
import type { ProjectWithFolders } from "@/types/database";
import { countProjectReviewThreads } from "@/app/actions/review";
import { ensureProjectReviewLink } from "@/app/actions/projects";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select(PROJECT_WITH_FOLDERS_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !project) {
    notFound();
  }

  const typed = project as ProjectWithFolders;
  const folders = sortProjectFolders(typed.project_folders ?? []);
  const backfilledFolderTokens = await ensurePublishedFolderReviewTokens(
    supabase,
    typed.id,
    folders,
  );
  const foldersWithTokens = folders.map((folder) => {
    if (folderReviewToken(folder)) {
      return folder;
    }
    const token = backfilledFolderTokens[folder.id];
    if (!token) {
      return folder;
    }
    return { ...folder, review_tokens: [{ token }] };
  });
  const token =
    projectReviewToken(typed) ??
    (await ensureProjectReviewLink(typed.id)).token ??
    undefined;
  const reviewPath = token ? `/review/${token}` : null;
  const reviewUrl = reviewPath ? `${siteUrl}${reviewPath}` : null;
  const previewPath = clientPreviewPath(typed.id);
  const folderLinks = foldersWithTokens.map((folder) => {
    const folderToken = folderReviewToken(folder);
    const folderReviewPath = folderToken ? `/review/${folderToken}` : null;
    return {
      id: folder.id,
      name: folder.name,
      visibility: folder.visibility,
      status: folder.status,
      shareable: canShareFolder(folder),
      hasToken: Boolean(folderToken),
      reviewUrl: folderReviewPath ? `${siteUrl}${folderReviewPath}` : null,
    };
  });

  const effectiveStatus = aggregateProjectStatusFromFolders(
    foldersWithTokens,
    typed.status,
  );
  const readOnly = effectiveStatus === "approved";
  const shareable =
    canShareWithClient(typed) ||
    hasShareablePublicFolder({ ...typed, project_folders: foldersWithTokens });
  const publishedFolderCount = publishedPublicFolders(foldersWithTokens).length;
  const awaitingClientReview =
    typed.status === "active" ||
    typed.status === "changes_requested" ||
    foldersWithTokens.some(
      (f) =>
        f.visibility === "public" &&
        (f.status === "active" || f.status === "changes_requested"),
    );
  const clientCommentCount = await countProjectReviewThreads(typed.id);

  return (
    <div className="space-y-6">
      <ProjectLiveRefresh
        projectId={typed.id}
        enabled={awaitingClientReview}
      />
      <ProjectHeader
        project={typed}
        reviewUrl={reviewUrl}
        previewPath={previewPath}
        shareable={shareable}
        publishedFolderCount={publishedFolderCount}
        folderLinks={folderLinks}
        clientCommentCount={clientCommentCount}
      />

      <ProjectWorkspace
        projectId={typed.id}
        folders={foldersWithTokens}
        siteUrl={siteUrl}
        projectReadOnly={readOnly}
        initialClientCommentCount={clientCommentCount}
      />
    </div>
  );
}
