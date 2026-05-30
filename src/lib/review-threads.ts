import type { ReviewThread } from "@/app/actions/review";

/** Max pinned notes a client can leave on one deliverable item (file, text block, etc.). */
export const MAX_REVIEW_THREADS_PER_BLOCK = 10;

export function groupReviewThreadsByBlockId(
  threads: ReviewThread[],
): Map<string, ReviewThread[]> {
  const map = new Map<string, ReviewThread[]>();
  for (const thread of threads) {
    const list = map.get(thread.block_id) ?? [];
    list.push(thread);
    map.set(thread.block_id, list);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }
  return map;
}

export function countReviewThreadsOnBlock(
  threadsByBlock: Map<string, ReviewThread[]>,
  blockId: string,
): number {
  return threadsByBlock.get(blockId)?.length ?? 0;
}
