import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { privateAppRouteMetadata } from "@/lib/seo/app-routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = privateAppRouteMetadata;

export default async function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <div className="min-h-dvh bg-background">{children}</div>;
}
