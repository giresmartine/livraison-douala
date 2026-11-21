import { AdminMfaSetup } from "@/components/admin-mfa-setup";
import { requireRole } from "@/lib/auth";
import type { Locale } from "@/lib/screens";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export default async function AdminSecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const { supabase } = await requireRole(locale, ["admin"], `/${locale}/ops/securite`);
  const [{ data: factors, error: factorError }, { data: assurance, error: assuranceError }] =
    await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
  if (factorError || assuranceError) {
    console.error("Could not load admin MFA status.");
    throw new Error("Unable to load admin security settings.");
  }
  const mfaEnabled = factors.totp.some((factor: { status: string }) => factor.status === "verified") ||
    factors.phone.some((factor: { status: string }) => factor.status === "verified");
  return (
    <AdminMfaSetup
      locale={locale as Locale}
      initiallyMfaEnabled={mfaEnabled}
      initialAssurance={assurance.currentLevel ?? "aal1"}
    />
  );
}
