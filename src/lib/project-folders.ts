import {
  hasFolderContent,
  resolveFolderBlocks,
} from "@/lib/folder-content";
import type {
  ProjectFolder,
  ProjectFolderWithToken,
  ProjectStatus,
  ProjectWithFolders,
  ProjectWithToken,
} from "@/types/database";

/** Public folders that have been published for client review (not draft). */
export function isPublishedForClientReview(folder: ProjectFolder): boolean {
  return folder.visibility === "public" && folder.status !== "draft";
}

export function publishedPublicFolders(
  folders: ProjectFolder[],
): ProjectFolder[] {
  return folders.filter(
    (f) =>
      isPublishedForClientReview(f) &&
      hasFolderContent(resolveFolderBlocks(f.content_blocks, f.assets)),
  );
}

export function projectLevelTokens(project: ProjectWithToken) {
  const tokens = project.review_tokens ?? [];
  return tokens.filter((t) => t.scope === "project" || (!t.scope && t.folder_id == null));
}

export function projectReviewToken(project: ProjectWithToken): string | undefined {
  return projectLevelTokens(project)[0]?.token;
}

export function folderReviewToken(folder: ProjectFolderWithToken): string | undefined {
  return folder.review_tokens?.[0]?.token;
}

/** Prefer folder with client feedback, then first with files, else first folder. */
export function pickDefaultFolderId(
  folders: ProjectFolderWithToken[],
): string | null {
  if (folders.length === 0) {
    return null;
  }

  const sorted = sortProjectFolders(folders);
  const withFeedback = sorted.find(
    (f) => f.status === "changes_requested" && f.client_feedback,
  );
  if (withFeedback) {
    return withFeedback.id;
  }

  const withAssets = sorted.find((f) => f.assets.length > 0);
  if (withAssets) {
    return withAssets.id;
  }

  return sorted[0].id;
}

export function sortProjectFolders(
  folders: ProjectFolderWithToken[],
): ProjectFolderWithToken[] {
  return [...folders].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });
}

export function totalFolderFileCount(project: ProjectWithFolders): number {
  return project.project_folders.reduce(
    (sum, folder) => sum + folder.assets.length,
    0,
  );
}

export function hasShareablePublicFolder(project: ProjectWithFolders): boolean {
  return publishedPublicFolders(project.project_folders).length > 0;
}

export function canShareFolder(folder: ProjectFolder): boolean {
  return (
    isPublishedForClientReview(folder) &&
    hasFolderContent(resolveFolderBlocks(folder.content_blocks, folder.assets))
  );
}

export function canUploadToFolder(
  folder: ProjectFolder,
  projectReadOnly: boolean,
): boolean {
  if (projectReadOnly || folder.status === "approved") {
    return false;
  }
  return (
    folder.status === "draft" ||
    folder.status === "active" ||
    folder.status === "changes_requested"
  );
}

export function folderNeedsRevisionUpload(folder: ProjectFolder): boolean {
  return (
    folder.assets.length > 0 &&
    (folder.status === "active" || folder.status === "changes_requested")
  );
}

/** Mirror folder activity on the project row for dashboard stats / attention. */
export function aggregateProjectStatusFromFolders(
  folders: ProjectFolder[],
  projectStatus: ProjectStatus,
): ProjectStatus {
  const publicFolders = folders.filter((f) => f.visibility === "public");
  if (publicFolders.some((f) => f.status === "changes_requested")) {
    return "changes_requested";
  }
  if (publicFolders.some((f) => f.status === "active")) {
    return "active";
  }
  if (
    publicFolders.length > 0 &&
    publicFolders.every((f) => f.status === "approved")
  ) {
    return "approved";
  }
  if (publicFolders.some((f) => f.status === "approved")) {
    return "active";
  }
  if (publicFolders.some((f) => f.assets.length > 0 && f.status !== "draft")) {
    return projectStatus === "draft" ? "active" : projectStatus;
  }
  return projectStatus;
}
