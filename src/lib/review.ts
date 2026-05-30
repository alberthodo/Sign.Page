import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import type { Project, ProjectFolder, ProjectStatus, ReviewToken } from "@/types/database";

export type ReviewFolder = Pick<
  ProjectFolder,
  | "id"
  | "name"
  | "assets"
  | "content_blocks"
  | "status"
  | "client_feedback"
  | "approved_at"
  | "client_approved_by_name"
  | "client_signature"
  | "sort_order"
>;

export type ReviewSubject = {
  scope: "project" | "folder" | "selection";
  status: Project["status"];
  client_feedback: string | null;
  approved_at: string | null;
  folderName?: string;
};

export type ReviewContext = {
  token: ReviewToken;
  project: Project;
  scope: "project" | "folder" | "selection";
  folders: ReviewFolder[];
  subject: ReviewSubject;
};

type ReviewRpcRow = {
  token_id: string;
  project_id: string;
  folder_id: string | null;
  scope: "project" | "folder" | "selection";
  allowed_folder_ids: string[] | null;
  token: string;
  expires_at: string | null;
  access_count: number;
  token_created_at: string;
  id: string;
  user_id: string;
  title: string;
  assets: string[];
  status: Project["status"];
  client_feedback: string | null;
  approved_at: string | null;
  client_approved_by_name: string | null;
  client_signature: string | null;
  created_at: string;
  updated_at: string;
};

type ReviewFolderRpcRow = {
  id: string;
  name: string;
  assets: string[];
  content_blocks: unknown;
  status: ProjectFolder["status"];
  client_feedback: string | null;
  approved_at: string | null;
  client_approved_by_name: string | null;
  client_signature: string | null;
  sort_order: number;
};

export function normalizeReviewToken(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export function reviewSubjectFromFolder(folder: ReviewFolder): ReviewSubject {
  return {
    scope: "folder",
    status: folder.status,
    client_feedback: folder.client_feedback,
    approved_at: folder.approved_at,
    folderName: folder.name,
  };
}

export function isReviewFolderLocked(status: ProjectFolder["status"]): boolean {
  return status === "approved";
}

export function isReviewFolderActive(status: ProjectFolder["status"]): boolean {
  return status === "active";
}

/** Client can leave pinned feedback while awaiting review or after requesting changes. */
export function canClientCommentOnReviewFolder(
  status: ProjectFolder["status"],
): boolean {
  return status === "active" || status === "changes_requested";
}

/** Prefer an open milestone tab; otherwise show feedback or first published folder. */
export function pickDefaultReviewFolderId(folders: ReviewFolder[]): string | null {
  if (folders.length === 0) {
    return null;
  }

  const sorted = [...folders].sort((a, b) => a.sort_order - b.sort_order);
  const awaitingReview = sorted.find((f) => f.status === "active");
  if (awaitingReview) {
    return awaitingReview.id;
  }

  const withFeedback = sorted.find(
    (f) => f.status === "changes_requested" && f.client_feedback,
  );
  if (withFeedback) {
    return withFeedback.id;
  }

  return sorted[0]?.id ?? null;
}

function deriveProjectReviewSubject(
  folders: ReviewFolder[],
  project: Pick<Project, "status" | "client_feedback" | "approved_at">,
): ReviewSubject {
  const published = folders.filter((f) => f.status !== "draft");

  if (published.some((f) => f.status === "active")) {
    return {
      scope: "project",
      status: "active",
      client_feedback: null,
      approved_at: null,
    };
  }

  if (
    published.some((f) => f.status === "approved") &&
    !published.every((f) => f.status === "approved")
  ) {
    return {
      scope: "project",
      status: "active",
      client_feedback: null,
      approved_at: null,
    };
  }

  if (
    published.length > 0 &&
    published.every((f) => f.status === "approved")
  ) {
    const latestApproved = published.find((f) => f.approved_at);
    return {
      scope: "project",
      status: "approved",
      client_feedback: null,
      approved_at: latestApproved?.approved_at ?? project.approved_at,
    };
  }

  return {
    scope: "project",
    status: project.status as ProjectStatus,
    client_feedback: project.client_feedback,
    approved_at: project.approved_at,
  };
}

/** True when the client can still approve or request changes on any folder. */
export function isReviewOpenForActions(review: ReviewContext): boolean {
  return review.folders.some((f) => canClientCommentOnReviewFolder(f.status));
}

/** Deliverable id for token RPCs (always pass the active folder/tab). */
export function reviewTargetFolderRpcParam(folderId: string): string {
  return folderId.trim();
}

export function canActOnReviewFolder(
  review: ReviewContext,
  folderId: string,
): boolean {
  const folder = review.folders.find((f) => f.id === folderId);
  if (!folder) {
    return false;
  }
  if (review.scope === "folder") {
    return (
      review.folders[0]?.id === folderId &&
      canClientCommentOnReviewFolder(folder.status)
    );
  }
  return canClientCommentOnReviewFolder(folder.status);
}

function mapRpcRow(row: ReviewRpcRow, folders: ReviewFolder[]): ReviewContext {
  const scope = row.scope ?? (row.folder_id ? "folder" : "project");
  const folder = row.folder_id
    ? folders.find((f) => f.id === row.folder_id)
    : undefined;

  const subject: ReviewSubject =
    scope === "folder" && folder
      ? {
          scope: "folder",
          status: folder.status,
          client_feedback: folder.client_feedback,
          approved_at: folder.approved_at,
          folderName: folder.name,
        }
      : deriveProjectReviewSubject(folders, {
          status: row.status,
          client_feedback: row.client_feedback,
          approved_at: row.approved_at,
        });

  return {
    token: {
      id: row.token_id,
      project_id: row.project_id,
      folder_id: row.folder_id,
      scope: row.scope,
      allowed_folder_ids: row.allowed_folder_ids,
      token: row.token,
      expires_at: row.expires_at,
      access_count: row.access_count,
      created_at: row.token_created_at,
    },
    project: {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      project_type: null,
      description: null,
      assets: row.assets ?? [],
      status: subject.status,
      client_feedback: subject.client_feedback,
      approved_at: subject.approved_at,
      client_approved_by_name: row.client_approved_by_name,
      client_signature: row.client_signature,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    scope,
    folders,
    subject,
  };
}

function mapReviewFolderRows(
  rows: ReviewFolderRpcRow[] | null | undefined,
): ReviewFolder[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    assets: row.assets ?? [],
    content_blocks: (row.content_blocks ?? []) as ProjectFolder["content_blocks"],
    status: row.status,
    client_feedback: row.client_feedback,
    approved_at: row.approved_at,
    client_approved_by_name: row.client_approved_by_name ?? null,
    client_signature: row.client_signature ?? null,
    sort_order: row.sort_order,
  }));
}

function filterPublishedReviewFolders(folders: ReviewFolder[]): ReviewFolder[] {
  return folders.filter((f) => f.status !== "draft");
}

async function fetchReviewFoldersViaRpc(
  normalizedToken: string,
): Promise<ReviewFolder[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("list_review_folders_by_token", {
    p_token: normalizedToken,
  });

  if (error) {
    console.error("[review] folder rpc failed:", error.message);
    return [];
  }

  return filterPublishedReviewFolders(
    mapReviewFolderRows(data as ReviewFolderRpcRow[] | null),
  );
}

async function fetchReviewFoldersViaAdmin(
  normalizedToken: string,
): Promise<ReviewFolder[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return [];
  }

  try {
    const supabase = createAdminClient();

    const { data: tokenRow, error: tokenError } = await supabase
      .from("review_tokens")
      .select("project_id, folder_id")
      .eq("token", normalizedToken)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return [];
    }

    let folderQuery = supabase
      .from("project_folders")
      .select(
        "id, name, assets, content_blocks, status, client_feedback, approved_at, client_approved_by_name, client_signature, sort_order, visibility",
      )
      .eq("project_id", tokenRow.project_id)
      .eq("visibility", "public")
      .neq("status", "draft")
      .order("sort_order", { ascending: true });

    if (tokenRow.folder_id) {
      folderQuery = folderQuery.eq("id", tokenRow.folder_id);
    }

    const { data: folderRows, error: folderError } = await folderQuery;
    if (folderError) {
      console.error("[review] admin folder lookup failed:", folderError.message);
      return [];
    }

    type AdminFolderRow = ReviewFolder & { visibility: string };
    return filterPublishedReviewFolders(
      ((folderRows as AdminFolderRow[] | null) ?? []).map(
        ({ visibility: _visibility, ...folder }) => folder,
      ),
    );
  } catch {
    return [];
  }
}

async function fetchReviewViaRpc(
  normalizedToken: string,
): Promise<ReviewContext | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase.rpc("get_review_by_token", {
    p_token: normalizedToken,
  });

  if (error) {
    console.error("[review] rpc lookup failed:", error.message);
    return null;
  }

  const row = (data as ReviewRpcRow[] | null)?.[0];
  if (!row) {
    return null;
  }

  let folders = await fetchReviewFoldersViaRpc(normalizedToken);
  if (folders.length === 0 && !row.folder_id) {
    folders = await fetchReviewFoldersViaAdmin(normalizedToken);
  }
  return mapRpcRow(row, folders);
}

async function fetchReviewViaAdmin(
  normalizedToken: string,
): Promise<ReviewContext | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return null;
  }

  try {
    const supabase = createAdminClient();

    const { data: tokenRow, error: tokenError } = await supabase
      .from("review_tokens")
      .select(
        "id, project_id, folder_id, token, expires_at, access_count, created_at",
      )
      .eq("token", normalizedToken)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return null;
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(
        "id, user_id, title, project_type, description, assets, status, client_feedback, approved_at, client_approved_by_name, client_signature, created_at, updated_at",
      )
      .eq("id", tokenRow.project_id)
      .maybeSingle();

    if (projectError || !project) {
      return null;
    }

    const folders = await fetchReviewFoldersViaAdmin(normalizedToken);

    const scope = tokenRow.folder_id ? "folder" : "project";
    const folder = tokenRow.folder_id
      ? folders.find((f) => f.id === tokenRow.folder_id)
      : undefined;

    const subject: ReviewSubject =
      scope === "folder" && folder
        ? {
            scope: "folder",
            status: folder.status,
            client_feedback: folder.client_feedback,
            approved_at: folder.approved_at,
            folderName: folder.name,
          }
        : deriveProjectReviewSubject(folders, project);

    return {
      token: tokenRow,
      project: {
        ...project,
        status: subject.status,
        client_feedback: subject.client_feedback,
        approved_at: subject.approved_at,
      },
      scope,
      folders,
      subject,
    };
  } catch {
    return null;
  }
}

async function fetchReviewRow(
  rawToken: string,
): Promise<ReviewContext | null> {
  const normalizedToken = normalizeReviewToken(rawToken);
  const viaRpc = await fetchReviewViaRpc(normalizedToken);

  if (viaRpc) {
    return viaRpc;
  }

  return fetchReviewViaAdmin(normalizedToken);
}

export async function getReviewByToken(
  rawToken: string,
  options?: { recordAccess?: boolean },
): Promise<ReviewContext | null> {
  const normalizedToken = normalizeReviewToken(rawToken);
  const review = await fetchReviewRow(normalizedToken);

  if (!review) {
    return null;
  }

  if (options?.recordAccess) {
    const supabase = createPublicClient();
    await supabase.rpc("bump_review_token_access", { p_token: normalizedToken });
    review.token.access_count += 1;
  }

  return review;
}

export async function getReviewForAction(
  rawToken: string,
): Promise<ReviewContext | null> {
  return getReviewByToken(rawToken, { recordAccess: false });
}
