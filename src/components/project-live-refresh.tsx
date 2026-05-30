"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Poll only — realtime was refreshing the page on every autosave / own edit. */
const POLL_MS = 20_000;
const MIN_REFRESH_GAP_MS = 5_000;

type ProjectLiveRefreshProps = {
  projectId: string;
  /** Poll while waiting on the client (separate tab). */
  enabled: boolean;
};

/**
 * Keeps the project workspace in sync when the client approves or requests changes
 * on the review link. Uses visibility + slow polling only (no Supabase realtime here)
 * so freelancer edits on this page do not trigger constant router.refresh().
 */
export function ProjectLiveRefresh({ projectId: _projectId, enabled }: ProjectLiveRefreshProps) {
  const router = useRouter();
  const routerRef = useRef(router);
  const lastRefreshRef = useRef(0);
  routerRef.current = router;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function refresh() {
      const now = Date.now();
      if (now - lastRefreshRef.current < MIN_REFRESH_GAP_MS) {
        return;
      }
      lastRefreshRef.current = now;
      routerRef.current.refresh();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(refresh, POLL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [enabled]);

  return null;
}
