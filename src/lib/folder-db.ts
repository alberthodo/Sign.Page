import type { SupabaseClient } from "@supabase/supabase-js";
import type { FolderVisibility } from "@/types/database";

type FolderInsertFields = {
  project_id: string;
  displayName: string;
  visibility: FolderVisibility;
  sort_order: number;
};

export async function insertProjectFolderRow(
  supabase: SupabaseClient,
  fields: FolderInsertFields,
): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase
    .from("project_folders")
    .insert({
      project_id: fields.project_id,
      name: fields.displayName,
      visibility: fields.visibility,
      sort_order: fields.sort_order,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { id: data?.id };
}

export async function updateProjectFolderName(
  supabase: SupabaseClient,
  folderId: string,
  displayName: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("project_folders")
    .update({ name: displayName })
    .eq("id", folderId);

  if (error) {
    return { error: error.message };
  }

  return {};
}
