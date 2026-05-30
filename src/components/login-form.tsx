"use client";

import { useActionState, useState } from "react";
import {
  signInWithEmail,
  signUpWithEmail,
  type AuthActionState,
} from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

type AuthMode = "signin" | "signup";

/** Match Google sign-in button (40px). */
const controlHeightClass = "h-10 rounded-md";

/** Inputs: white fill, subtle border on focus (no grey ring). */
const inputClass = `${controlHeightClass} border-input bg-white shadow-none focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:outline-none autofill:shadow-[inset_0_0_0_1000px_#ffffff] autofill:[-webkit-text-fill-color:inherit]`;

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const [signInState, signInAction, signInPending] = useActionState(
    signInWithEmail,
    initialState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithEmail,
    initialState,
  );

  const state = mode === "signin" ? signInState : signUpState;
  const formAction = mode === "signin" ? signInAction : signUpAction;
  const isPending = mode === "signin" ? signInPending : signUpPending;

  async function signInWithGoogle() {
    setOauthError(null);
    setOauthLoading("google");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setOauthError(error.message);
      setOauthLoading(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <GoogleSignInButton
        onClick={signInWithGoogle}
        disabled={isPending}
        loading={oauthLoading === "google"}
      />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <div className="flex rounded-lg border p-1">
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "signin"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
      </div>

      <form key={mode} action={formAction} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@studio.com"
            required
            disabled={isPending || Boolean(oauthLoading)}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            placeholder={mode === "signup" ? "At least 8 characters" : ""}
            minLength={mode === "signup" ? 8 : undefined}
            required
            disabled={isPending || Boolean(oauthLoading)}
            className={inputClass}
          />
        </div>

        {(oauthError || state.error) && (
          <p className="text-sm text-destructive" role="alert">
            {oauthError ?? state.error}
          </p>
        )}

        {state.success ? (
          <p className="text-sm text-muted-foreground" role="status">
            {state.success}
          </p>
        ) : null}

        <Button
          type="submit"
          className={`w-full ${controlHeightClass} focus-visible:ring-0`}
          disabled={isPending || Boolean(oauthLoading)}
        >
          {isPending
            ? mode === "signin"
              ? "Signing in…"
              : "Creating account…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        For freelancers and studio owners only. Clients use the review link—no
        account needed.
      </p>
    </div>
  );
}
