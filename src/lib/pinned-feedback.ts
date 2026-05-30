import {
  getBlockReview,
  isReviewableBlock,
  type FolderContentBlock,
} from "@/lib/folder-content";

export type PinnedFeedbackThread = {
  block_id: string;
  messages: { author: string }[];
};

/** Blocks with client pins and/or legacy per-block review flags. */
export function pinnedFeedbackBlockIds(
  blocks: FolderContentBlock[],
  threads: PinnedFeedbackThread[] = [],
): Set<string> {
  const ids = new Set<string>();

  for (const block of blocks) {
    if (
      isReviewableBlock(block) &&
      getBlockReview(block).status === "changes_requested"
    ) {
      ids.add(block.id);
    }
  }

  for (const thread of threads) {
    if (!thread.messages.some((m) => m.author === "client")) {
      continue;
    }

    ids.add(thread.block_id);

    for (const block of blocks) {
      if (block.type !== "file") {
        continue;
      }
      if (block.id === thread.block_id || block.url === thread.block_id) {
        ids.add(block.id);
      }
    }
  }

  return ids;
}

function noteCountLabel(count: number): string {
  return count === 1 ? "1 note" : `${count} notes`;
}

/** Amber badge label per block (edit view when feedback mode is off). */
export function pinnedFeedbackBadgeLabels(
  blocks: FolderContentBlock[],
  threads: PinnedFeedbackThread[] = [],
): Map<string, string> {
  const blockIds = pinnedFeedbackBlockIds(blocks, threads);
  const labels = new Map<string, string>();

  for (const blockId of blockIds) {
    const onBlock = threads.filter((thread) => {
      if (!thread.messages.some((m) => m.author === "client")) {
        return false;
      }
      if (thread.block_id === blockId) {
        return true;
      }
      const block = blocks.find((b) => b.id === blockId);
      return block?.type === "file" && block.url === thread.block_id;
    });

    let count = onBlock.length;
    if (count === 0) {
      const block = blocks.find((b) => b.id === blockId);
      if (
        block &&
        isReviewableBlock(block) &&
        getBlockReview(block).status === "changes_requested"
      ) {
        count = 1;
      }
    }

    if (count > 0) {
      labels.set(blockId, noteCountLabel(count));
    }
  }

  return labels;
}
