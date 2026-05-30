import { getCloudMaxProjects, getEditionFeatures } from "@/lib/edition";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getProjectLimitError(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  if (!getEditionFeatures().usageCaps) {
    return null;
  }

  const max = getCloudMaxProjects();
  if (max === null) {
    return null;
  }

  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    return error.message;
  }

  if ((count ?? 0) >= max) {
    return `Project limit reached (${max} projects). Upgrade your plan to add more.`;
  }

  return null;
}
