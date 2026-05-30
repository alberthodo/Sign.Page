import type { Metadata } from "next";
import { EditionHome } from "@/components/edition-home";
import { isCloudEdition } from "@/lib/edition";
import { buildHomepageMetadata } from "@/lib/seo/homepage";

/** Edition is server env — must not be baked at build time. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  if (!isCloudEdition()) {
    return {};
  }
  return buildHomepageMetadata();
}

export default function Home() {
  return <EditionHome />;
}
