import type { Metadata } from "next";

/** Keep authenticated and client-review surfaces out of search indexes. */
export const privateAppRouteMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
