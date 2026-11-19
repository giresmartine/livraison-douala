import { NextResponse } from "next/server";
import { isAuthenticationEnabled } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null, locale: string, origin: string) {
  if (!value || !value.startsWith(`/${locale}/`) || value.startsWith("//") || value.includes("\\")) {
    return new URL(`/${locale}/connexion`, origin);
  }

  const destination = new URL(value, origin);
  return destination.origin === origin
    ? destination
    : new URL(`/${locale}/connexion`, origin);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const fallback = new URL(`/${locale}/connexion?error=callback`, url.origin);

  if (!code || !isAuthenticationEnabled) {
    return NextResponse.redirect(fallback);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(fallback);
  }

  return NextResponse.redirect(safeNextPath(url.searchParams.get("next"), locale, url.origin));
}
