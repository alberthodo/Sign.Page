import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getOnboardingResumePath } from "@/lib/onboarding/profile";
import type { Profile } from "@/types/database";

/** Prefetch/RSC requests cannot follow middleware redirects cleanly. */
function isRscOrPrefetch(request: NextRequest) {
  return (
    request.headers.get("rsc") === "1" ||
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.has("next-router-state-tree")
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isLogin = pathname === "/login";

  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && !isRscOrPrefetch(request)) {
    const needsOnboarding = await userNeedsOnboarding(supabase, user.id);

    if (needsOnboarding && isDashboard) {
      const url = request.nextUrl.clone();
      url.pathname = await getOnboardingRedirectForUser(supabase, user.id);
      return NextResponse.redirect(url);
    }

    if (needsOnboarding && isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = await getOnboardingRedirectForUser(supabase, user.id);
      return NextResponse.redirect(url);
    }

    if (!needsOnboarding && isOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (
    isLogin &&
    user &&
    !isRscOrPrefetch(request) &&
    !isOnboarding &&
    !(await userNeedsOnboarding(supabase, user.id))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

async function userNeedsOnboarding(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("completed_onboarding")
    .eq("id", userId)
    .maybeSingle();

  return !data?.completed_onboarding;
}

async function getOnboardingRedirectForUser(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "onboarding_plan, onboarding_status, display_name, team_size, job_title, industry, completed_onboarding",
    )
    .eq("id", userId)
    .maybeSingle();

  if (!data) {
    return "/onboarding/getting-started";
  }

  return getOnboardingResumePath(data as Profile);
}
