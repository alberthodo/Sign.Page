"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type LoginOAuthStartProps = {
  provider?: string;
};

/** Starts OAuth when login is opened with ?provider=google (e.g. from marketing). */
export function LoginOAuthStart({ provider }: LoginOAuthStartProps) {
  const started = useRef(false);

  useEffect(() => {
    if (provider !== "google" || started.current) return;
    started.current = true;

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    void supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }, [provider]);

  return null;
}
