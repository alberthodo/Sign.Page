export type BlockReviewStatus = "pending" | "approved" | "changes_requested";

export type BlockReview = {
  status: BlockReviewStatus;
  comment: string | null;
  reviewed_at: string | null;
};

export type FolderContentBlock =
  | { id: string; type: "heading"; text: string; review?: BlockReview }
  | { id: string; type: "text"; text: string; review?: BlockReview }
  | { id: string; type: "file"; url: string; review?: BlockReview };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseBlockReview(raw: unknown): BlockReview | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const status = raw.status;
  if (
    status !== "pending" &&
    status !== "approved" &&
    status !== "changes_requested"
  ) {
    return undefined;
  }
  return {
    status,
    comment: typeof raw.comment === "string" ? raw.comment : null,
    reviewed_at: typeof raw.reviewed_at === "string" ? raw.reviewed_at : null,
  };
}

function parseBlock(raw: unknown): FolderContentBlock | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.type !== "string") {
    return null;
  }

  const review = parseBlockReview(raw.review);

  if (raw.type === "file" && typeof raw.url === "string" && raw.url.length > 0) {
    return { id: raw.id, type: "file", url: raw.url, review };
  }

  if (
    (raw.type === "heading" || raw.type === "text") &&
    typeof raw.text === "string"
  ) {
    return { id: raw.id, type: raw.type, text: raw.text, review };
  }

  return null;
}

export function parseContentBlocks(raw: unknown): FolderContentBlock[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(parseBlock).filter((b): b is FolderContentBlock => b !== null);
}

/** Use stored blocks, or build file blocks from legacy `assets` URLs. */
export function resolveFolderBlocks(
  contentBlocks: unknown,
  assets: string[] = [],
): FolderContentBlock[] {
  const blocks = parseContentBlocks(contentBlocks);
  if (blocks.length > 0) {
    return blocks;
  }
  return assets.map((url) => ({
    id: url,
    type: "file" as const,
    url,
  }));
}

export function assetsFromContentBlocks(blocks: FolderContentBlock[]): string[] {
  const urls: string[] = [];
  for (const block of blocks) {
    if (block.type === "file" && !urls.includes(block.url)) {
      urls.push(block.url);
    }
  }
  return urls;
}

export function isReviewableBlock(block: FolderContentBlock): boolean {
  if (block.type === "file") {
    return true;
  }
  return block.text.trim().length > 0;
}

export function getBlockReview(block: FolderContentBlock): BlockReview {
  return (
    block.review ?? {
      status: "pending",
      comment: null,
      reviewed_at: null,
    }
  );
}

export function hasFolderContent(blocks: FolderContentBlock[]): boolean {
  return blocks.some(isReviewableBlock);
}

export function reviewableBlocks(blocks: FolderContentBlock[]): FolderContentBlock[] {
  return blocks.filter(isReviewableBlock);
}

/** Reset item-level review when freelancer publishes a new revision. */
export function blocksWithPendingReview(
  blocks: FolderContentBlock[],
): FolderContentBlock[] {
  return blocks.map((block) => {
    if (!isReviewableBlock(block)) {
      return block;
    }
    return {
      ...block,
      review: { status: "pending", comment: null, reviewed_at: null },
    };
  });
}

export function countBlockReviews(blocks: FolderContentBlock[]) {
  const reviewable = reviewableBlocks(blocks);
  let approved = 0;
  let changesRequested = 0;
  let pending = 0;
  for (const block of reviewable) {
    const status = getBlockReview(block).status;
    if (status === "approved") {
      approved += 1;
    } else if (status === "changes_requested") {
      changesRequested += 1;
    } else {
      pending += 1;
    }
  }
  return {
    total: reviewable.length,
    approved,
    changesRequested,
    pending,
  };
}

export function newContentBlock(
  type: FolderContentBlock["type"],
  url?: string,
): FolderContentBlock {
  const id = crypto.randomUUID();
  if (type === "file" && url) {
    return { id, type: "file", url };
  }
  if (type === "heading") {
    return { id, type: "heading", text: "" };
  }
  return { id, type: "text", text: "" };
}
