import { revalidatePath } from "next/cache";
import { isOnboardingDevForceNewUser } from "@/lib/onboarding/dev";
import { createClient } from "@/lib/supabase/server";

/** In dev, reopen onboarding when visiting the first step after completing. */
export async function resetOnboardingForDevIteration(userId: string): Promise<void> {
  if (!isOnboardingDevForceNewUser()) {
    return;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("completed_onboarding")
    .eq("id", userId)
    .maybeSingle();

  if (!data?.completed_onboarding) {
    return;
  }

  await supabase
    .from("profiles")
    .update({ completed_onboarding: false })
    .eq("id", userId);

  revalidatePath("/onboarding", "layout");
  revalidatePath("/dashboard");
}
