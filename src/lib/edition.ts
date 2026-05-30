/**
 * Deployment edition — read only on the server (process.env).
 * Do not expose edition to the client for billing or limits; gate in server actions and route handlers.
 */

export type Edition = "oss" | "cloud";

export type EditionFeatures = {
  billing: boolean;
  emailNotify: boolean;
  customBranding: boolean;
  usageCaps: boolean;
};

const EDITION_ENV = "SIGNOFF_EDITION";

export function getEdition(): Edition {
  const raw = process.env[EDITION_ENV]?.trim().toLowerCase();
  return raw === "cloud" ? "cloud" : "oss";
}

export function isCloudEdition(): boolean {
  return getEdition() === "cloud";
}

export function isOssEdition(): boolean {
  return !isCloudEdition();
}

export function getEditionFeatures(): EditionFeatures {
  const cloud = isCloudEdition();
  return {
    billing: cloud,
    emailNotify: cloud,
    customBranding: cloud,
    usageCaps: cloud,
  };
}

/** Max projects per user on cloud; `null` when caps are disabled (OSS). */
export function getCloudMaxProjects(): number | null {
  if (!getEditionFeatures().usageCaps) {
    return null;
  }
  const raw = process.env.SIGNOFF_CLOUD_MAX_PROJECTS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 10;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 10;
  }
  return parsed;
}
