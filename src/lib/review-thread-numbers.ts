import type { ReviewThread } from "@/app/actions/review";

/** Chronological note numbers (1…n) across a project, keyed by thread id. */
export function buildThreadNumberByIdMap(
  threads: ReviewThread[],
): Map<string, number> {
  const sorted = [...threads].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const map = new Map<string, number>();
  sorted.forEach((thread, index) => {
    map.set(thread.id, index + 1);
  });
  return map;
}
