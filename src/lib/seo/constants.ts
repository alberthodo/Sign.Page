/** Paths that should not be indexed (app, auth flows, client review). */
export const SEO_DISALLOW_PATHS = [
  "/dashboard/",
  "/onboarding/",
  "/preview/",
  "/review/",
  "/api/",
] as const;

/** Open Graph / Twitter / social preview image (`public/branding/`). */
export const SEO_OG_IMAGE_PATH = "/branding/sign.page_meta.png";

export const SEO_OG_IMAGE_SIZE = {
  width: 1920,
  height: 1080,
} as const;
