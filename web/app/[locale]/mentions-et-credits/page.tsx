import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { brand } from "@/lib/config/brand";
import { routing } from "@/i18n/routing";

export default async function CreditsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "credits" });

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href={`/${locale}`}>
          <span className="wordmark-mark" aria-hidden="true">{brand.logoText}</span>
          <span className="wordmark-title">{brand.name}</span>
        </Link>
      </header>
      <section className="welcome-copy">
        <h1>{t("title")}</h1>
        <h2>OpenStreetMap</h2>
        <p>{t("openStreetMap")}</p>
        <p>
          <a href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">
            © OpenStreetMap
          </a>
        </p>
        <p>{t("boundary")}</p>
        <Link className="text-link" href={`/${locale}`}>
          {t("back")}
        </Link>
      </section>
    </main>
  );
}
