import type { Locale } from "@/lib/screens";
import { AuthForm } from "@/components/auth-form";
import { isAuthenticationEnabled, publicEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return (
    <AuthForm
      locale={locale}
      mode="sign-up"
      authenticationEnabled={isAuthenticationEnabled}
      turnstileSiteKey={publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
    />
  );
}
