"use server";

import { revalidatePath } from "next/cache";
import {
  canActOnReviewFolder,
  getReviewForAction,
  isReviewOpenForActions,
  normalizeReviewToken,
  reviewTargetFolderRpcParam,
} from "@/lib/review";
import { clampAnchor } from "@/lib/review-comment-anchor";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

export type ReviewActionState = {
  error?: string;
  success?: boolean;
};

function revalidateReviewPaths(token: string, projectId: string) {
  const normalized = normalizeReviewToken(token);
  revalidatePath(`/review/${normalized}`, "page");
  revalidatePath("/dashboard", "page");
  revalidatePath(`/dashboard/${projectId}`, "page");
}

export async function approveReviewFolderWithSignature(
  token: string,
  folderId: string,
  signerName: string,
  signature: string,
): Promise<ReviewActionState> {
  const name = signerName.trim();
  const targetFolderId = folderId.trim();

  if (!targetFolderId) {
    return { error: "Missing deliverable to approve." };
  }
  if (!name) {
    return { error: "Enter your full name." };
  }
  if (!signature.trim()) {
    return { error: "Draw your signature to approve." };
  }

  const normalized = normalizeReviewToken(token);
  const review = await getReviewForAction(normalized);

  if (!review) {
    return { error: "This review link is invalid or has expired." };
  }

  if (!isReviewOpenForActions(review)) {
    return { error: "This proof is no longer open for review." };
  }

  if (!canActOnReviewFolder(review, targetFolderId)) {
    return { error: "This deliverable is not open for approval." };
  }

  const supabase = createPublicClient();
  const { data: approved, error } = await supabase.rpc("approve_review_by_token", {
    p_token: normalized,
    p_signer_name: name,
    p_signature: signature,
    p_target_folder_id: reviewTargetFolderRpcParam(targetFolderId),
  });

  if (error) {
    return { error: error.message };
  }

  if (!approved) {
    return { error: "Could not approve this deliverable." };
  }

  revalidateReviewPaths(normalized, review.project.id);
  return { success: true };
}

export async function submitReviewItemNotes(
  token: string,
  folderId: string,
  notes: { blockId: string; comment: string }[],
): Promise<ReviewActionState> {
  const targetFolderId = folderId.trim();

  if (!targetFolderId) {
    return { error: "Missing deliverable for feedback." };
  }

  const normalized = normalizeReviewToken(token);
  const review = await getReviewForAction(normalized);

  if (!review) {
    return { error: "This review link is invalid or has expired." };
  }

  if (!isReviewOpenForActions(review)) {
    return { error: "This proof is no longer open for review." };
  }

  if (!canActOnReviewFolder(review, targetFolderId)) {
    return { error: "This deliverable is not open for feedback." };
  }

  const payload = notes
    .filter((n) => n.blockId && n.comment.trim())
    .map((n) => ({ block_id: n.blockId, comment: n.comment.trim() }));

  if (payload.length === 0) {
    return { error: "Add at least one note on an item before submitting." };
  }

  const supabase = createPublicClient();
  const { data: saved, error } = await supabase.rpc("submit_item_notes_by_token", {
    p_token: normalized,
    p_notes: payload,
    p_summary: null,
    p_target_folder_id: reviewTargetFolderRpcParam(targetFolderId),
  });

  if (error) {
    return { error: error.message };
  }

  if (!saved) {
    return { error: "Could not submit your notes." };
  }

  revalidateReviewPaths(normalized, review.project.id);
  return { success: true };
}

export type ReviewThreadMessage = {
  id: string;
  author: "client" | "freelancer";
  author_name: string | null;
  body: string;
  created_at: string;
};

export type ReviewThread = {
  id: string;
  folder_id: string;
  block_id: string;
  anchor_x: number | null;
  anchor_y: number | null;
  created_at: string;
  last_activity: string;
  messages: ReviewThreadMessage[];
};

type ReviewThreadRow = {
  id: string;
  folder_id: string;
  block_id: string;
  anchor_x: number | null;
  anchor_y: number | null;
  created_at: string;
  review_messages: ReviewThreadMessage[];
};

function mapThreadRows(rows: ReviewThreadRow[]): ReviewThread[] {
  return rows.map((row) => {
    const messages = [...(row.review_messages ?? [])].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const last_activity =
      messages.length > 0
        ? messages[messages.length - 1]!.created_at
        : row.created_at;
    return {
      id: row.id,
      folder_id: row.folder_id,
      block_id: row.block_id,
      anchor_x: row.anchor_x,
      anchor_y: row.anchor_y,
      created_at: row.created_at,
      last_activity,
      messages,
    };
  }).sort(
    (a, b) =>
      new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime(),
  );
}

async function assertProjectOwner(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sign in to continue." as const, supabase: null };
  }
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) {
    return { error: "Project not found." as const, supabase: null };
  }
  return { error: null, supabase };
}

export async function listReviewThreads(
  token: string,
  folderId: string,
): Promise<{ error?: string; threads?: ReviewThread[] }> {
  const normalized = normalizeReviewToken(token);
  const review = await getReviewForAction(normalized);
  if (!review) {
    return { error: "This review link is invalid or has expired." };
  }

  const targetFolderId = folderId.trim();
  if (!targetFolderId) {
    return { error: "Missing deliverable." };
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("list_review_threads_by_token", {
    p_token: normalized,
    p_target_folder_id: reviewTargetFolderRpcParam(targetFolderId),
  });

  if (error) {
    return { error: error.message };
  }

  return { threads: (data as ReviewThread[] | null) ?? [] };
}

export async function listProjectReviewThreadsByToken(
  token: string,
): Promise<{ error?: string; threads?: ReviewThread[] }> {
  const normalized = normalizeReviewToken(token);
  const review = await getReviewForAction(normalized);
  if (!review) {
    return { error: "This review link is invalid or has expired." };
  }

  const byId = new Map<string, ReviewThread>();
  for (const folder of review.folders) {
    const result = await listReviewThreads(normalized, folder.id);
    if (result.error) {
      return { error: result.error };
    }
    for (const thread of result.threads ?? []) {
      byId.set(thread.id, thread);
    }
  }

  return { threads: [...byId.values()] };
}

export async function addReviewMessage(
  token: string,
  folderId: string,
  blockId: string,
  body: string,
  clientName?: string | null,
  anchor?: { x: number; y: number } | null,
  threadId?: string | null,
): Promise<{ error?: string; threadId?: string; messageId?: string }> {
  const normalized = normalizeReviewToken(token);
  const review = await getReviewForAction(normalized);
  if (!review) {
    return { error: "This review link is invalid or has expired." };
  }

  if (!isReviewOpenForActions(review)) {
    return { error: "This proof is no longer open for review." };
  }

  const targetFolderId = folderId.trim();
  if (!targetFolderId) {
    return { error: "Missing deliverable for feedback." };
  }
  if (!canActOnReviewFolder(review, targetFolderId)) {
    return { error: "This deliverable is not open for feedback." };
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("add_review_message_by_token", {
    p_token: normalized,
    p_block_id: blockId,
    p_body: body,
    p_client_name: clientName ?? null,
    p_target_folder_id: reviewTargetFolderRpcParam(targetFolderId),
    p_anchor_x: anchor ? clampAnchor(anchor.x) : null,
    p_anchor_y: anchor ? clampAnchor(anchor.y) : null,
    p_thread_id: threadId?.trim() || null,
  });

  if (error) {
    return { error: error.message };
  }

  const payload = data as { error?: string; thread_id?: string; message_id?: string } | null;
  if (!payload) {
    return { error: "Could not send your comment." };
  }
  if (payload.error) {
    return { error: payload.error };
  }

  revalidateReviewPaths(normalized, review.project.id);
  return { threadId: payload.thread_id, messageId: payload.message_id };
}

export async function listFolderReviewThreadsForOwner(
  projectId: string,
  folderId: string,
): Promise<{ error?: string; threads?: ReviewThread[] }> {
  const auth = await assertProjectOwner(projectId);
  if (auth.error || !auth.supabase) {
    return { error: auth.error ?? "Unauthorized." };
  }

  const { data, error } = await auth.supabase
    .from("review_threads")
    .select(
      "id, folder_id, block_id, anchor_x, anchor_y, created_at, review_messages (id, author, author_name, body, created_at)",
    )
    .eq("project_id", projectId)
    .eq("folder_id", folderId);

  if (error) {
    return { error: error.message };
  }

  return { threads: mapThreadRows((data as ReviewThreadRow[] | null) ?? []) };
}

export async function listProjectReviewThreadsForOwner(
  projectId: string,
): Promise<{ error?: string; threads?: ReviewThread[] }> {
  const auth = await assertProjectOwner(projectId);
  if (auth.error || !auth.supabase) {
    return { error: auth.error ?? "Unauthorized." };
  }

  const { data, error } = await auth.supabase
    .from("review_threads")
    .select(
      "id, folder_id, block_id, anchor_x, anchor_y, created_at, review_messages (id, author, author_name, body, created_at)",
    )
    .eq("project_id", projectId);

  if (error) {
    return { error: error.message };
  }

  return { threads: mapThreadRows((data as ReviewThreadRow[] | null) ?? []) };
}

export async function addFreelancerReviewMessage(
  projectId: string,
  folderId: string,
  blockId: string,
  body: string,
  threadId?: string | null,
): Promise<{ error?: string; threadId?: string; messageId?: string }> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { error: "Write a reply before sending." };
  }

  const auth = await assertProjectOwner(projectId);
  if (auth.error || !auth.supabase) {
    return { error: auth.error ?? "Unauthorized." };
  }

  let resolvedThreadId: string | null = threadId?.trim() || null;

  if (resolvedThreadId) {
    const { data: thread } = await auth.supabase
      .from("review_threads")
      .select("id")
      .eq("id", resolvedThreadId)
      .eq("project_id", projectId)
      .eq("folder_id", folderId)
      .eq("block_id", blockId)
      .maybeSingle();
    if (!thread?.id) {
      return { error: "This note could not be found." };
    }
    resolvedThreadId = thread.id;
  } else {
    const { data: existing } = await auth.supabase
      .from("review_threads")
      .select("id")
      .eq("folder_id", folderId)
      .eq("block_id", blockId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      resolvedThreadId = existing.id;
    } else {
      const { data: created, error: createError } = await auth.supabase
        .from("review_threads")
        .insert({
          project_id: projectId,
          folder_id: folderId,
          block_id: blockId,
        })
        .select("id")
        .single();
      if (createError || !created) {
        return { error: createError?.message ?? "Could not start thread." };
      }
      resolvedThreadId = created.id;
    }
  }

  const { data: message, error: insertError } = await auth.supabase
    .from("review_messages")
    .insert({
      thread_id: resolvedThreadId,
      author: "freelancer",
      body: trimmed,
    })
    .select("id")
    .single();

  if (insertError || !message) {
    return { error: insertError?.message ?? "Could not send reply." };
  }

  revalidatePath(`/dashboard/${projectId}`, "page");
  return { threadId: resolvedThreadId ?? undefined, messageId: message.id };
}

export async function countProjectReviewThreads(
  projectId: string,
): Promise<number> {
  const auth = await assertProjectOwner(projectId);
  if (auth.error || !auth.supabase) {
    return 0;
  }

  const { count, error } = await auth.supabase
    .from("review_threads")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (error) {
    return 0;
  }
  return count ?? 0;
}
