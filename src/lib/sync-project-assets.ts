import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateProjectStatusFromFolders } from "@/lib/project-folders";
import type { ProjectFolder, ProjectStatus } from "@/types/database";

export async function syncProjectFromFolders(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  options?: { clientFeedback?: string | null },
): Promise<{ error?: string }> {
  const { data: folders, error: foldersError } = await supabase
    .from("project_folders")
    .select("assets, status, visibility, client_feedback")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (foldersError) {
    return { error: foldersError.message };
  }

  const list = (folders as ProjectFolder[]) ?? [];
  const assets = list.flatMap((f) => f.assets);
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("status, client_feedback")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (projectError || !project) {
    return { error: projectError?.message ?? "Project not found." };
  }

  const status = aggregateProjectStatusFromFolders(
    list,
    project.status as ProjectStatus,
  );

  let clientFeedback: string | null;
  if (options && "clientFeedback" in options) {
    clientFeedback = options.clientFeedback ?? null;
  } else if (status === "changes_requested") {
    const folderWithFeedback = list.find(
      (f) =>
        f.visibility === "public" &&
        f.status === "changes_requested" &&
        f.client_feedback,
    );
    clientFeedback =
      folderWithFeedback?.client_feedback ??
      (project.client_feedback as string | null);
  } else {
    clientFeedback = null;
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      assets,
      status,
      client_feedback: clientFeedback,
    })
    .eq("id", projectId)
    .eq("user_id", userId);

  if (updateError) {
    return { error: updateError.message };
  }

  return {};
}
