import type { Metadata } from "next";
import { getAppName } from "@/lib/app-name";
import { getSiteUrl } from "@/lib/site-url";
import { SEO_OG_IMAGE_PATH, SEO_OG_IMAGE_SIZE } from "./constants";

const HOMEPAGE_TITLE = "Client Approval Software for Freelancers";
const HOMEPAGE_DESCRIPTION =
  "Send one link per round. Clients approve or request changes with no account. Structured sign-off for freelancers and small studios—not another comment thread.";

/** Rich SEO metadata for the cloud marketing homepage (`/`). */
export function buildHomepageMetadata(): Metadata {
  const appName = getAppName();
  const siteUrl = getSiteUrl();
  const title = `${HOMEPAGE_TITLE} | ${appName}`;

  return {
    title: {
      absolute: title,
    },
    description: HOMEPAGE_DESCRIPTION,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: siteUrl,
      siteName: appName,
      title,
      description: HOMEPAGE_DESCRIPTION,
      locale: "en_US",
      images: [
        {
          url: SEO_OG_IMAGE_PATH,
          width: SEO_OG_IMAGE_SIZE.width,
          height: SEO_OG_IMAGE_SIZE.height,
          alt: `${appName} — client approval for freelancers`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: HOMEPAGE_DESCRIPTION,
      images: [SEO_OG_IMAGE_PATH],
    },
  };
}
