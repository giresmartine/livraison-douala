import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AddressEntry } from "@/components/address-entry";
import { Icon } from "@/components/ui/icon";
import { brand } from "@/lib/config/brand";
import { isScreenGalleryEnabled } from "@/lib/config/features";
import { routing } from "@/i18n/routing";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return {
    title: {
      default: `${t("title")} · ${brand.name}`,
      template: `%s · ${brand.name}`,
    },
    description: t("metaDescription"),
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="wordmark" href={`/${locale}`} aria-label={brand.name}>
          <span className="wordmark-mark" aria-hidden="true">
            {brand.logoText}
          </span>
          <span>
            <span className="wordmark-title">{brand.name}</span>
            <span className="wordmark-subtitle">{t("city")}</span>
          </span>
        </a>

        <div className="header-actions">
          <span className="service-status">
            <span className="status-dot" aria-hidden="true" />
            {t("serviceArea")}
          </span>
          <nav className="language-switch" aria-label={t("languageLabel")}>
            <Link
              href="/fr"
              aria-current={locale === "fr" ? "page" : undefined}
              lang="fr"
            >
              FR
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/en"
              aria-current={locale === "en" ? "page" : undefined}
              lang="en"
            >
              EN
            </Link>
          </nav>
        </div>
      </header>

      <section className="welcome-section" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <p className="eyebrow">
            <Icon name="spark" />
            {brand.tagline[locale === "en" ? "en" : "fr"]}
          </p>
          <h1 id="welcome-title">{t("title")}</h1>
          <p className="welcome-description">{t("description")}</p>
          <div className="reassurance">
            <span className="reassurance-icon" aria-hidden="true">
              <Icon name="clock" />
            </span>
            <span>{t("availabilityNote")}</span>
          </div>
        </div>

        <div className="address-panel">
          <div className="panel-heading">
            <span className="panel-icon" aria-hidden="true">
              <Icon name="pin" />
            </span>
            <div>
              <h2>{t("addressHeading")}</h2>
              <p>{t("addressHint")}</p>
            </div>
          </div>
          <AddressEntry />
          <p className="privacy-note">
            <Icon name="lock" />
            {t("privacyNote")}
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <p>{t("footer")}</p>
        <span>{t("footerLocation")}</span>
        <Link href={`/${locale}/mentions-et-credits`}>
          {locale === "fr" ? "Mentions et crédits" : "Credits and notices"}
        </Link>
        {isScreenGalleryEnabled && (
          <Link href={`/${locale}/ecrans`}>
            {locale === "fr" ? "Catalogue des écrans" : "Screen catalogue"}
          </Link>
        )}
      </footer>
    </main>
  );
}
