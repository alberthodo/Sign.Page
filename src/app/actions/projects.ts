"use server";

import { revalidatePath } from "next/cache";
import { saveFolderAssets } from "@/app/actions/folders";
import { insertProjectFolderRow } from "@/lib/folder-db";
import { PROJECT_TYPES } from "@/lib/project-types";
import { getProjectLimitError } from "@/lib/edition-limits";
import { generateReviewToken } from "@/lib/tokens";
import { createClient } from "@/lib/supabase/server";

export type ProjectActionState = {
  error?: string;
  projectId?: string;
  token?: string;
};

const VALID_PROJECT_TYPES = new Set<string>(
  PROJECT_TYPES.map((t) => t.value),
);

export async function createProject(input: {
  title: string;
  projectType: string;
  description?: string;
}): Promise<ProjectActionState> {
  const title = input.title.trim();
  const projectType = input.projectType.trim();
  const description = input.description?.trim() || null;

  if (!title) {
    return { error: "Project name is required." };
  }

  if (!projectType || !VALID_PROJECT_TYPES.has(projectType)) {
    return { error: "Please select a project type." };
  }

  return insertProjectWithToken({
    title,
    project_type: projectType,
    description,
  });
}

export async function createProjectDraft(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    return { error: "Project name is required." };
  }

  return insertProjectWithToken({
    title,
    project_type: null,
    description: null,
  });
}

async function insertProjectWithToken(fields: {
  title: string;
  project_type: string | null;
  description: string | null;
}): Promise<ProjectActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const limitError = await getProjectLimitError(supabase, user.id);
  if (limitError) {
    return { error: limitError };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: fields.title,
      project_type: fields.project_type,
      description: fields.description,
      status: "draft",
      assets: [],
    })
    .select("id")
    .single();

  if (projectError || !project) {
    return { error: projectError?.message ?? "Could not create project." };
  }

  const { error: folderError } = await insertProjectFolderRow(supabase, {
    project_id: project.id,
    displayName: "Deliverables",
    visibility: "public",
    sort_order: 0,
  });

  if (folderError) {
    await supabase.from("projects").delete().eq("id", project.id);
    return { error: folderError };
  }

  const token = generateReviewToken();

  const { error: tokenError } = await supabase.from("review_tokens").insert({
    project_id: project.id,
    folder_id: null,
    scope: "project",
    token,
  });

  if (tokenError) {
    await supabase.from("projects").delete().eq("id", project.id);
    return { error: tokenError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${project.id}`);

  return { projectId: project.id, token };
}

export async function activateProject(
  projectId: string,
  assetUrls: string[],
): Promise<{ error?: string }> {
  return publishProjectAssets(projectId, assetUrls, { mode: "initial" });
}

/** Upload deliverables and open (or reopen) the proof for client review. */
export async function publishProjectAssets(
  projectId: string,
  assetUrls: string[],
  options: { mode: "initial" | "revision" } = { mode: "initial" },
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: folder, error: folderError } = await supabase
    .from("project_folders")
    .select("id")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (folderError || !folder) {
    return { error: "No folder found for this project." };
  }

  return saveFolderAssets(folder.id, assetUrls);
}

/** Creates review tokens for any of your projects that don't have one yet. */
export async function backfillMissingReviewTokens(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, review_tokens ( id, folder_id )")
    .eq("user_id", user.id);

  if (error || !projects) {
    console.error("backfillMissingReviewTokens:", error?.message);
    return 0;
  }

  let created = 0;

  for (const project of projects) {
    const tokens = project.review_tokens;
    const projectTokens = Array.isArray(tokens)
      ? tokens.filter((t: { folder_id?: string | null; scope?: string }) => t.scope === "project" || (!t.scope && t.folder_id == null))
      : [];
    if (projectTokens.length > 0) {
      continue;
    }

    const token = generateReviewToken();
    const { error: insertError } = await supabase.from("review_tokens").insert({
      project_id: project.id,
      folder_id: null,
      scope: "project",
      token,
    });

    if (!insertError) {
      created += 1;
    }
  }

  return created;
}

/** Ensures this project has a project-wide review link (no rotation). */
export async function ensureProjectReviewLink(
  projectId: string,
): Promise<{ error?: string; reviewUrl?: string; token?: string }> {
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

  const { data: existing, error: existingError } = await supabase
    .from("review_tokens")
    .select("token, scope, folder_id")
    .eq("project_id", projectId);

  if (existingError) {
    return { error: existingError.message };
  }

  const token =
    existing?.find((t) => t.scope === "project" || (!t.scope && t.folder_id == null))
      ?.token ?? null;

  if (token) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    return { token, reviewUrl: `${siteUrl}/review/${token}` };
  }

  const newToken = generateReviewToken();
  const { error: insertError } = await supabase.from("review_tokens").insert({
    project_id: projectId,
    folder_id: null,
    scope: "project",
    token: newToken,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${projectId}`);
  return { token: newToken, reviewUrl: `${siteUrl}/review/${newToken}` };
}

/** Issues a new client link; previous URLs for this project stop working. */
export async function regenerateReviewToken(
  projectId: string,
): Promise<{ error?: string; reviewUrl?: string }> {
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

  const { error: deleteError } = await supabase
    .from("review_tokens")
    .delete()
    .eq("project_id", projectId)
    .eq("scope", "project");

  if (deleteError) {
    return { error: deleteError.message };
  }

  const token = generateReviewToken();
  const { error: insertError } = await supabase.from("review_tokens").insert({
    project_id: projectId,
    folder_id: null,
    scope: "project",
    token,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${projectId}`);

  return { reviewUrl: `${siteUrl}/review/${token}` };
}

/** Creates a single share link limited to a subset of folders. */
export async function createSelectionReviewToken(input: {
  projectId: string;
  folderIds: string[];
}): Promise<{ error?: string; reviewUrl?: string }> {
  const unique = Array.from(new Set(input.folderIds.filter(Boolean)));
  if (unique.length < 2) {
    return { error: "Select at least two folders." };
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
    .eq("id", input.projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError || !project) {
    return { error: "Project not found." };
  }

  const { data: folders, error: foldersError } = await supabase
    .from("project_folders")
    .select("id")
    .eq("project_id", input.projectId);

  if (foldersError) {
    return { error: foldersError.message };
  }

  const existing = new Set((folders ?? []).map((f) => f.id));
  for (const id of unique) {
    if (!existing.has(id)) {
      return { error: "Folder list mismatch." };
    }
  }

  const token = generateReviewToken();
  const { error: insertError } = await supabase.from("review_tokens").insert({
    project_id: input.projectId,
    folder_id: null,
    scope: "selection",
    allowed_folder_ids: unique,
    token,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  revalidatePath(`/dashboard/${input.projectId}`);
  return { reviewUrl: `${siteUrl}/review/${token}` };
}

export async function updateProject(input: {
  projectId: string;
  title: string;
  projectType: string;
  description?: string;
}): Promise<{ error?: string }> {
  const title = input.title.trim();
  const projectType = input.projectType.trim();
  const description = input.description?.trim() || null;

  if (!title) {
    return { error: "Project name is required." };
  }

  if (!projectType || !VALID_PROJECT_TYPES.has(projectType)) {
    return { error: "Please select a project type." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      title,
      project_type: projectType,
      description,
    })
    .eq("id", input.projectId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${input.projectId}`);
  return {};
}

export async function deleteProject(
  projectId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !project) {
    return { error: "Project not found." };
  }

  const folderPrefix = `${user.id}/${projectId}`;
  const { data: files } = await supabase.storage
    .from("project-assets")
    .list(folderPrefix);

  if (files?.length) {
    const paths = files.map((file) => `${folderPrefix}/${file.name}`);
    await supabase.storage.from("project-assets").remove(paths);
  }

  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath("/dashboard");
  return {};
}
