import type { ReviewFolder } from "@/lib/review";
import { publishedPublicFolders } from "@/lib/project-folders";
import type { ProjectFolder } from "@/types/database";

export function clientPreviewPath(
  projectId: string,
  folderId?: string | null,
): string {
  const path = `/preview/project/${projectId}`;
  if (folderId) {
    return `${path}?folder=${encodeURIComponent(folderId)}`;
  }
  return path;
}

export function foldersForClientPreview(
  folders: ProjectFolder[],
): ReviewFolder[] {
  return publishedPublicFolders(folders).map((folder) => ({
    id: folder.id,
    name: folder.name,
    assets: folder.assets,
    content_blocks: folder.content_blocks,
    status: folder.status,
    client_feedback: folder.client_feedback,
    approved_at: folder.approved_at,
    client_approved_by_name: folder.client_approved_by_name ?? null,
    client_signature: folder.client_signature ?? null,
    sort_order: folder.sort_order,
  }));
}
