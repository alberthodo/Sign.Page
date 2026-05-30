export const ONBOARDING_TEAM_SIZE_OPTIONS = [
  { value: "1", label: "Just me" },
  { value: "2-5", label: "2–5 people" },
  { value: "6-10", label: "6–10 people" },
  { value: "11-25", label: "11–25 people" },
  { value: "26+", label: "26+ people" },
] as const;

export const ONBOARDING_INDUSTRY_OPTIONS = [
  { value: "design", label: "Design & creative" },
  { value: "development", label: "Development & engineering" },
  { value: "marketing", label: "Marketing & content" },
  { value: "video", label: "Video & motion" },
  { value: "photography", label: "Photography" },
  { value: "agency", label: "Agency / studio" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
] as const;

export const ONBOARDING_REFERRAL_OPTIONS = [
  { value: "search", label: "Search engine" },
  { value: "social", label: "Social media" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "gemini", label: "Gemini" },
  { value: "other_ai", label: "Other AI" },
  { value: "friend", label: "Friend or colleague" },
  { value: "github", label: "GitHub / open source" },
  { value: "blog", label: "Blog or newsletter" },
  { value: "other", label: "Other" },
] as const;

export const MAX_ONBOARDING_TEAM_INVITES = 5;

export const ONBOARDING_PATHS = {
  gettingStarted: "/onboarding/getting-started",
  profile: "/onboarding/profile",
  invites: "/onboarding/invites",
  checkout: "/onboarding/checkout",
  complete: "/onboarding/complete",
} as const;
