export const PROJECT_TYPES = [
  { value: "branding", label: "Branding & identity" },
  { value: "web", label: "Web & UI design" },
  { value: "photo", label: "Photography" },
  { value: "video", label: "Video & motion" },
  { value: "print", label: "Print & packaging" },
  { value: "other", label: "Other" },
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number]["value"];

export function projectTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return PROJECT_TYPES.find((t) => t.value === value)?.label ?? value;
}
