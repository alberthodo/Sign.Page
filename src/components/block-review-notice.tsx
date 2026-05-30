import {
  getBlockReview,
  type FolderContentBlock,
} from "@/lib/folder-content";
import { cn } from "@/lib/utils";

export function BlockReviewNotice({
  block,
  className,
}: {
  block: FolderContentBlock;
  className?: string;
}) {
  const review = getBlockReview(block);

  if (review.status === "pending") {
    return null;
  }

  if (review.status === "approved") {
    return (
      <div
        className={cn(
          "rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm",
          className,
        )}
      >
        <p className="font-medium text-emerald-800 dark:text-emerald-300">
          Client approved this item
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm",
        className,
      )}
    >
      <p className="font-medium text-amber-950 dark:text-amber-100">
        Client requested changes
      </p>
      {review.comment ? (
        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
          {review.comment}
        </p>
      ) : null}
    </div>
  );
}
