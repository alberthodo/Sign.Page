"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 30_000;
const MIN_REFRESH_GAP_MS = 5_000;

type DashboardLiveRefreshProps = {
  enabled: boolean;
};

/** Refreshes the workspace list when projects may receive client review updates. */
export function DashboardLiveRefresh({ enabled }: DashboardLiveRefreshProps) {
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
