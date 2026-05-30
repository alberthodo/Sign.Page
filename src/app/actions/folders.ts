"use server";

import { revalidatePath } from "next/cache";
import {
  insertProjectFolderRow,
  updateProjectFolderName,
} from "@/lib/folder-db";
import {
  assetsFromContentBlocks,
  blocksWithPendingReview,
  hasFolderContent,
  parseContentBlocks,
  type FolderContentBlock,
} from "@/lib/folder-content";
import { syncProjectFromFolders } from "@/lib/sync-project-assets";
import type { ProjectFolderWithToken, ProjectStatus } from "@/types/database";
import { ensurePublishedFolderReviewTokens, insertFolderReviewToken } from "@/lib/ensure-review-tokens";
import { sortProjectFolders } from "@/lib/project-folders";
import { PROJECT_FOLDER_SELECT } from "@/lib/projects-query";
import { generateReviewToken } from "@/lib/tokens";
import { storagePathFromPublicUrl } from "@/lib/uploads";
import { createClient } from "@/lib/supabase/server";

export type FolderActionState = {
  error?: string;
  folderId?: string;
};

export type FolderMutateResult = {
  error?: string;
  content_blocks?: FolderContentBlock[];
  assets?: string[];
};

export async function reorderProjectFolders(input: {
  projectId: string;
  orderedFolderIds: string[];
}): Promise<FolderActionState> {
  const orderedFolderIds = input.orderedFolderIds.filter(Boolean);
  if (orderedFolderIds.length < 1) {
    return { error: "No folders provided." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", input.projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return { error: "Project not found." };
  }

  const { data: folders, error: foldersError } = await supabase
    .from("project_folders")
    .select("id")
    .eq("project_id", input.projectId);

  if (foldersError) {
    return { error: foldersError.message };
  }

  const existingIds = new Set((folders ?? []).map((f) => f.id));
  const incomingIds = new Set(orderedFolderIds);

  if (existingIds.size !== incomingIds.size) {
    return { error: "Folder list mismatch." };
  }
  for (const id of incomingIds) {
    if (!existingIds.has(id)) {
      return { error: "Folder list mismatch." };
    }
  }

  for (let i = 0; i < orderedFolderIds.length; i++) {
    const folderId = orderedFolderIds[i];
    const { error } = await supabase
      .from("project_folders")
      .update({ sort_order: i })
      .eq("id", folderId)
      .eq("project_id", input.projectId);

    if (error) {
      return { error: error.message };
    }
  }

  await syncProjectFromFolders(supabase, input.projectId, user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${input.projectId}`);
  return {};
}

export async function createProjectFolder(
  projectId: string,
  name: string,
  visibility: "public" | "hidden" = "public",
): Promise<FolderActionState> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Folder name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError || !project) {
    return { error: "Project not found." };
  }

  const { count } = await supabase
    .from("project_folders")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { id: folderId, error: insertError } = await insertProjectFolderRow(
    supabase,
    {
      project_id: projectId,
      displayName: trimmed,
      visibility,
      sort_order: count ?? 0,
    },
  );

  if (insertError || !folderId) {
    return { error: insertError ?? "Could not create folder." };
  }

  await syncProjectFromFolders(supabase, projectId, user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${projectId}`);
  return { folderId };
}

export async function updateProjectFolder(input: {
  folderId: string;
  name: string;
  visibility: "public" | "hidden";
}): Promise<FolderActionState> {
  const name = input.name.trim();
  if (!name) {
    return { error: "Folder name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: folder, error: fetchError } = await supabase
    .from("project_folders")
    .select("id, project_id, visibility")
    .eq("id", input.folderId)
    .maybeSingle();

  if (fetchError || !folder) {
    return { error: "Folder not found." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", folder.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return { error: "Project not found." };
  }

  const { error: nameError } = await updateProjectFolderName(
    supabase,
    input.folderId,
    name,
  );

  if (nameError) {
    return { error: nameError };
  }

  const { error } = await supabase
    .from("project_folders")
    .update({ visibility: input.visibility })
    .eq("id", input.folderId);

  if (error) {
    return { error: error.message };
  }

  if (input.visibility === "hidden") {
    await supabase
      .from("review_tokens")
      .delete()
      .eq("folder_id", input.folderId);
  }

  await syncProjectFromFolders(supabase, folder.project_id, user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${folder.project_id}`);
  return { folderId: input.folderId };
}

export async function deleteProjectFolder(
  folderId: string,
): Promise<FolderActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: folder, error: fetchError } = await supabase
    .from("project_folders")
    .select("id, project_id")
    .eq("id", folderId)
    .maybeSingle();

  if (fetchError || !folder) {
    return { error: "Folder not found." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", folder.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return { error: "Project not found." };
  }

  const { count } = await supabase
    .from("project_folders")
    .select("id", { count: "exact", head: true })
    .eq("project_id", folder.project_id);

  if ((count ?? 0) <= 1) {
    return { error: "Each project needs at least one folder." };
  }

  const prefix = `${user.id}/${folder.project_id}/${folderId}`;
  const { data: files } = await supabase.storage
    .from("project-assets")
    .list(prefix);

  if (files?.length) {
    const paths = files.map((file) => `${prefix}/${file.name}`);
    await supabase.storage.from("project-assets").remove(paths);
  }

  const { error: deleteError } = await supabase
    .from("project_folders")
    .delete()
    .eq("id", folderId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  await syncProjectFromFolders(supabase, folder.project_id, user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${folder.project_id}`);
  return {};
}

async function getOwnedFolder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  folderId: string,
  userId: string,
) {
  const { data: folder, error: fetchError } = await supabase
    .from("project_folders")
    .select("id, project_id, status, visibility, assets, content_blocks")
    .eq("id", folderId)
    .maybeSingle();

  if (fetchError || !folder) {
    return { error: "Folder not found." as const };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, status")
    .eq("id", folder.project_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (projectError || !project) {
    return { error: "Project not found." as const };
  }

  if (folder.status === "approved") {
    return { error: "This folder is approved and locked." as const };
  }

  return { folder, project };
}

async function persistFolderContent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  folderId: string,
  folder: {
    project_id: string;
    status: string;
  },
  userId: string,
  blocks: FolderContentBlock[],
  options?: { clearFeedback?: boolean; revalidate?: boolean },
): Promise<FolderMutateResult> {
  const assets = assetsFromContentBlocks(blocks);
  const publishedStatuses: ProjectStatus[] = [
    "active",
    "changes_requested",
    "approved",
  ];
  const isPublished = publishedStatuses.includes(folder.status as ProjectStatus);

  const update: {
    content_blocks: FolderContentBlock[];
    assets: string[];
    status?: ProjectStatus;
    client_feedback?: null;
  } = {
    content_blocks: blocks,
    assets,
  };

  // Only unpublished folders stay in draft on autosave; never demote active/review states.
  if (!isPublished) {
    update.status = "draft";
  }

  if (
    options?.clearFeedback &&
    folder.status === "changes_requested"
  ) {
    update.client_feedback = null;
  }

  const { error } = await supabase
    .from("project_folders")
    .update(update)
    .eq("id", folderId);

  if (error) {
    return { error: error.message };
  }

  await syncProjectFromFolders(supabase, folder.project_id, userId);

  if (options?.revalidate !== false) {
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/${folder.project_id}`);
  }

  return { content_blocks: blocks, assets };
}

/** Replace ordered content blocks (title, text, files). */
export async function updateFolderContentBlocks(
  folderId: string,
  blocks: FolderContentBlock[],
): Promise<FolderMutateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const owned = await getOwnedFolder(supabase, folderId, user.id);
  if ("error" in owned && owned.error) {
    return { error: owned.error };
  }

  return persistFolderContent(
    supabase,
    folderId,
    owned.folder,
    user.id,
    blocks,
    { revalidate: false },
  );
}

/** Save uploads to storage + folder assets (draft until published). */
export async function saveFolderAssets(
  folderId: string,
  assetUrls: string[],
  options?: { replace?: boolean; insertAt?: number },
): Promise<FolderMutateResult> {
  if (assetUrls.length === 0) {
    return { error: "No files to save." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const owned = await getOwnedFolder(supabase, folderId, user.id);
  if ("error" in owned && owned.error) {
    return { error: owned.error };
  }

  const { folder } = owned;
  const currentBlocks = parseContentBlocks(folder.content_blocks);
  let nextBlocks: FolderContentBlock[];

  const newFileBlocks: FolderContentBlock[] = assetUrls.map((url) => ({
    id: globalThis.crypto.randomUUID(),
    type: "file",
    url,
  }));

  if (options?.replace) {
    const nonFile = currentBlocks.filter((b) => b.type !== "file");
    nextBlocks = [...nonFile, ...newFileBlocks];
  } else if (options?.insertAt !== undefined) {
    const at = Math.max(0, Math.min(options.insertAt, currentBlocks.length));
    nextBlocks = [
      ...currentBlocks.slice(0, at),
      ...newFileBlocks,
      ...currentBlocks.slice(at),
    ];
  } else {
    nextBlocks = [...currentBlocks, ...newFileBlocks];
  }

  return persistFolderContent(
    supabase,
    folderId,
    folder,
    user.id,
    nextBlocks,
    { clearFeedback: options?.replace },
  );
}

/** Move a draft folder to client-visible review (status active). */
export async function publishFolderForReview(
  folderId: string,
): Promise<{ error?: string; reviewUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const owned = await getOwnedFolder(supabase, folderId, user.id);
  if ("error" in owned && owned.error) {
    return { error: owned.error };
  }

  const { folder } = owned;
  const blocks = parseContentBlocks(folder.content_blocks);

  if (!hasFolderContent(blocks)) {
    return { error: "Add at least a title, note, or file before publishing changes." };
  }

  if (folder.visibility === "hidden") {
    return {
      error: "Hidden folders stay internal. Set visibility to public to share with clients.",
    };
  }

  const { error } = await supabase
    .from("project_folders")
    .update({
      status: "active",
      content_blocks: blocksWithPendingReview(blocks),
      client_feedback: null,
    })
    .eq("id", folderId);

  if (error) {
    return { error: error.message };
  }

  const { data: existing } = await supabase
    .from("review_tokens")
    .select("token")
    .eq("folder_id", folderId)
    .maybeSingle();

  let folderToken = existing?.token;
  if (!folderToken) {
    const inserted = await insertFolderReviewToken(
      supabase,
      folder.project_id,
      folderId,
    );
    if (inserted.error) {
      return { error: inserted.error };
    }
    folderToken = inserted.token;
  }

  const { data: projectTokens, error: projectTokensError } = await supabase
    .from("review_tokens")
    .select("id, scope, folder_id")
    .eq("project_id", folder.project_id);

  if (projectTokensError) {
    return { error: projectTokensError.message };
  }

  const hasProjectToken = (projectTokens ?? []).some(
    (t) => t.scope === "project" || (!t.scope && t.folder_id == null),
  );

  if (!hasProjectToken) {
    const { error: projectInsertError } = await supabase
      .from("review_tokens")
      .insert({
        project_id: folder.project_id,
        folder_id: null,
        scope: "project",
        token: generateReviewToken(),
      });

    if (projectInsertError) {
      return { error: projectInsertError.message };
    }
  }

  await syncProjectFromFolders(supabase, folder.project_id, user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${folder.project_id}`);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { reviewUrl: `${siteUrl}/review/${folderToken}` };
}

/** Publish multiple folders for review (best-effort, stops on first error). */
export async function publishFoldersForReview(
  folderIds: string[],
): Promise<{ error?: string; folderReviewUrls?: Record<string, string> }> {
  const unique = Array.from(new Set(folderIds.filter(Boolean)));
  if (unique.length === 0) {
    return { error: "No folders selected." };
  }

  const folderReviewUrls: Record<string, string> = {};

  for (const folderId of unique) {
    const result = await publishFolderForReview(folderId);
    if (result.error) {
      return result;
    }
    if (result.reviewUrl) {
      folderReviewUrls[folderId] = result.reviewUrl;
    }
  }

  return { folderReviewUrls };
}

/** Ensures published folders have client links (for share dialog). */
export async function ensureShareFolderLinks(
  projectId: string,
): Promise<{ error?: string; folderReviewUrls?: Record<string, string> }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(`id, project_folders ( ${PROJECT_FOLDER_SELECT} )`)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError || !project) {
    return { error: "Project not found." };
  }

  const folders = sortProjectFolders(
    (project.project_folders ?? []) as ProjectFolderWithToken[],
  );
  const tokens = await ensurePublishedFolderReviewTokens(
    supabase,
    projectId,
    folders,
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const folderReviewUrls: Record<string, string> = {};
  for (const [folderId, token] of Object.entries(tokens)) {
    folderReviewUrls[folderId] = `${siteUrl}/review/${token}`;
  }

  return { folderReviewUrls };
}

export async function removeFolderAsset(
  folderId: string,
  assetUrl: string,
): Promise<FolderMutateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const owned = await getOwnedFolder(supabase, folderId, user.id);
  if ("error" in owned && owned.error) {
    return { error: owned.error };
  }

  const { folder } = owned;
  const currentBlocks = parseContentBlocks(folder.content_blocks);
  const hasFile = currentBlocks.some(
    (b) => b.type === "file" && b.url === assetUrl,
  );

  if (!hasFile) {
    return { error: "File not found in this folder." };
  }

  const nextBlocks = currentBlocks.filter(
    (b) => !(b.type === "file" && b.url === assetUrl),
  );
  const nextAssets = assetsFromContentBlocks(nextBlocks);
  const nextStatus =
    !hasFolderContent(nextBlocks) && folder.status !== "approved"
      ? "draft"
      : folder.status;

  const { error } = await supabase
    .from("project_folders")
    .update({
      content_blocks: nextBlocks,
      assets: nextAssets,
      status: nextStatus,
    })
    .eq("id", folderId);

  if (error) {
    return { error: error.message };
  }

  const storagePath = storagePathFromPublicUrl(assetUrl);
  if (storagePath) {
    await supabase.storage.from("project-assets").remove([storagePath]);
  }

  await syncProjectFromFolders(supabase, folder.project_id, user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${folder.project_id}`);
  return { content_blocks: nextBlocks, assets: nextAssets };
}

export async function regenerateFolderReviewToken(
  folderId: string,
): Promise<{ error?: string; reviewUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: folder, error: folderError } = await supabase
    .from("project_folders")
    .select("id, project_id, visibility, assets, status")
    .eq("id", folderId)
    .maybeSingle();

  if (folderError || !folder) {
    return { error: "Folder not found." };
  }

  if (folder.visibility !== "public") {
    return { error: "Hidden folders cannot be shared with clients." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", folder.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return { error: "Project not found." };
  }

  await supabase.from("review_tokens").delete().eq("folder_id", folderId);

  const token = generateReviewToken();
  const { error: insertError } = await supabase.from("review_tokens").insert({
    project_id: folder.project_id,
    folder_id: folderId,
    scope: "folder",
    token,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  revalidatePath(`/dashboard/${folder.project_id}`);

  return { reviewUrl: `${siteUrl}/review/${token}` };
}
