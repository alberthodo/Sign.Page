import type { CSSProperties, MouseEvent } from "react";

/** Normalized pin position within a block (0–1). */
export type ReviewCommentAnchor = {
  x: number;
  y: number;
};

const DEFAULT_ANCHOR: ReviewCommentAnchor = { x: 0.5, y: 0.5 };

export function clampAnchor(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

export function normalizeAnchor(
  anchor: { x: number | null | undefined; y: number | null | undefined } | null | undefined,
): ReviewCommentAnchor {
  if (!anchor || anchor.x == null || anchor.y == null) {
    return DEFAULT_ANCHOR;
  }
  return {
    x: clampAnchor(anchor.x),
    y: clampAnchor(anchor.y),
  };
}

/** Click position relative to block content box, ignoring chrome marked with data-no-comment. */
export function anchorFromPointerEvent(
  event: MouseEvent,
  blockElement: HTMLElement,
): ReviewCommentAnchor {
  const target = event.target;
  if (target instanceof Element && target.closest("[data-no-comment]")) {
    return DEFAULT_ANCHOR;
  }

  const rect = blockElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return DEFAULT_ANCHOR;
  }

  return {
    x: clampAnchor((event.clientX - rect.left) / rect.width),
    y: clampAnchor((event.clientY - rect.top) / rect.height),
  };
}

export function pinStyleFromAnchor(anchor: ReviewCommentAnchor): CSSProperties {
  return {
    left: `${anchor.x * 100}%`,
    top: `${anchor.y * 100}%`,
  };
}
