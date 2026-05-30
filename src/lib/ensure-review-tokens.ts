import { canShareFolder, folderReviewToken } from "@/lib/project-folders";
import { generateReviewToken } from "@/lib/tokens";
import type { ProjectFolderWithToken } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

async function insertFolderReviewToken(
  supabase: SupabaseClient,
  projectId: string,
  folderId: string,
): Promise<{ token?: string; error?: string }> {
  const token = generateReviewToken();
  const { error } = await supabase.from("review_tokens").insert({
    project_id: projectId,
    folder_id: folderId,
    scope: "folder",
    token,
  });

  if (error?.message?.includes("scope")) {
    const retry = await supabase.from("review_tokens").insert({
      project_id: projectId,
      folder_id: folderId,
      token,
    });
    if (retry.error) {
      return { error: retry.error.message };
    }
    return { token };
  }

  if (error) {
    return { error: error.message };
  }

  return { token };
}

/** Creates missing per-folder review tokens for published folders. */
export async function ensurePublishedFolderReviewTokens(
  supabase: SupabaseClient,
  projectId: string,
  folders: ProjectFolderWithToken[],
): Promise<Record<string, string>> {
  const tokens: Record<string, string> = {};

  for (const folder of folders) {
    if (!canShareFolder(folder)) {
      continue;
    }

    const existingToken = folderReviewToken(folder);
    if (existingToken) {
      tokens[folder.id] = existingToken;
      continue;
    }

    const { data: existing } = await supabase
      .from("review_tokens")
      .select("token")
      .eq("folder_id", folder.id)
      .maybeSingle();

    if (existing?.token) {
      tokens[folder.id] = existing.token;
      continue;
    }

    const result = await insertFolderReviewToken(supabase, projectId, folder.id);
    if (result.token) {
      tokens[folder.id] = result.token;
    } else if (result.error) {
      console.error(
        `ensurePublishedFolderReviewTokens(${folder.id}):`,
        result.error,
      );
    }
  }

  return tokens;
}

export { insertFolderReviewToken };
