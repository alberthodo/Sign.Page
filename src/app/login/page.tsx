import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LoginOAuthStart } from "@/components/login-oauth-start";
import { LoginForm } from "@/components/login-form";
import { getAppName } from "@/lib/app-name";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to manage client approval rounds and projects.",
  alternates: {
    canonical: "/login",
  },
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; provider?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const appName = getAppName();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-10">
        <div className="space-y-2 text-center">
          <BrandLogo href="/" variant="display" tone="light" />
          <p className="text-sm text-muted-foreground">
            Sign in with Google or your {appName} account.
          </p>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Project owner access</CardTitle>
            <CardDescription>
              Manage proofs and client review links. Not for clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <LoginOAuthStart provider={params.provider} />
            {params.error === "auth" ? (
              <p className="mb-4 text-sm text-destructive" role="alert">
                Sign-in failed or was cancelled. Try again.
              </p>
            ) : null}
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
