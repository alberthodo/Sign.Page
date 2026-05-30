import type { ProjectStatus, ProjectWithToken } from "@/types/database";

export type ProjectPrimaryAction =
  | "upload"
  | "copy-link"
  | "preview"
  | "view-feedback"
  | null;

export type ProjectStatusContext = {
  label: string;
  message: string;
  detail?: string;
  primaryAction: ProjectPrimaryAction;
  tone: "default" | "primary" | "success" | "warning" | "destructive" | "attention";
};

export function getProjectStatusContext(
  project: ProjectWithToken,
  hasReviewLink: boolean,
): ProjectStatusContext {
  const fileCount = project.assets.length;

  switch (project.status) {
    case "draft":
      return {
        label: "Draft",
        message:
          fileCount === 0
            ? "Upload deliverables to get a client review link."
            : "Publish when you're ready to share with your client.",
        primaryAction: fileCount === 0 ? "upload" : "upload",
        tone: "default",
      };
    case "active":
      return {
        label: "Pending review",
        message: "Waiting for your client to review and respond.",
        detail: hasReviewLink
          ? "Copy the link below and send it to your client."
          : undefined,
        primaryAction: hasReviewLink ? "copy-link" : null,
        tone: "primary",
      };
    case "changes_requested":
      return {
        label: "Changes requested",
        message: "Your client left feedback. Upload a new version when ready.",
        primaryAction: "view-feedback",
        tone: "attention",
      };
    case "approved":
      return {
        label: "Approved",
        message: "Your client approved this proof.",
        detail: project.approved_at
          ? `Approved ${formatShortDate(project.approved_at)}`
          : undefined,
        primaryAction: hasReviewLink ? "preview" : null,
        tone: "success",
      };
    default:
      return {
        label: "Project",
        message: "",
        primaryAction: null,
        tone: "default",
      };
  }
}

export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function fileNameFromAssetUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").pop() ?? "file";
    return decodeURIComponent(name);
  } catch {
    return "file";
  }
}

export function canUploadRevision(status: ProjectStatus): boolean {
  return status === "draft" || status === "active" || status === "changes_requested";
}

export function canShareWithClient(project: ProjectWithToken): boolean {
  return project.assets.length > 0 && project.status !== "draft";
}
