import type { Locale } from "@/lib/screens";
import { AuthForm } from "@/components/auth-form";
import { isAuthenticationEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return <AuthForm locale={locale} mode="reset" authenticationEnabled={isAuthenticationEnabled} />;
}
