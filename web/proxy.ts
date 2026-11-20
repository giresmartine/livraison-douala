import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { createContentSecurityPolicy, isPublicStaticPath } from "./lib/security-headers";
import { routing } from "./i18n/routing";
import {
  isSupabaseConfigured,
  publicEnvironment,
} from "./lib/env";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const nonce = isPublicStaticPath(request.nextUrl.pathname)
    ? undefined
    : btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  let contentSecurityPolicy: string | undefined;

  if (nonce) {
    contentSecurityPolicy = createContentSecurityPolicy({
      nonce,
      supabaseUrl: publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    });
    requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  }

  const routedRequest = new NextRequest(request, { headers: requestHeaders });
  const response = handleI18nRouting(routedRequest);

  if (!isSupabaseConfigured) {
    if (contentSecurityPolicy) {
      response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    }
    return response;
  }

  const supabase = createServerClient(
    publicEnvironment.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => routedRequest.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            routedRequest.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.getUser();

  if (contentSecurityPolicy) {
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  }

  return response;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
