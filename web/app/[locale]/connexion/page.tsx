import type { Locale } from "@/lib/screens";
import { AuthForm } from "@/components/auth-form";
import { isAuthenticationEnabled, publicEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  return (
    <AuthForm
      locale={locale}
      mode="sign-in"
      nextPath={query.next}
      authenticationEnabled={isAuthenticationEnabled}
      turnstileSiteKey={publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
    />
  );
}
