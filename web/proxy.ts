import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import {
  isAuthenticationEnabled,
  isSupabaseConfigured,
  publicEnvironment,
} from "./lib/env";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);

  if (!isSupabaseConfigured) {
    return response;
  }

  const supabase = createServerClient(
    publicEnvironment.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (user && isAuthenticationEnabled) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Could not verify authenticated user status.");
    } else if (!profile || profile.status !== "active") {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) console.error("Could not revoke an inactive account session.");
    }
  }

  return response;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
