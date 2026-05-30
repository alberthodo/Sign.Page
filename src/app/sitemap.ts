import type { MetadataRoute } from "next";
import { isCloudEdition } from "@/lib/edition";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  if (!isCloudEdition()) {
    return [
      {
        url: `${siteUrl}/login`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.5,
      },
    ];
  }

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
