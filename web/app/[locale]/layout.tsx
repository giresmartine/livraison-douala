import type { Metadata } from "next";
import type { ReactNode } from "react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";
import { ThemeSchedule } from "@/components/theme-schedule";
import { PwaServiceWorker } from "@/components/pwa-service-worker";
import { brand } from "@/lib/config/brand";
import { routing } from "@/i18n/routing";
import "@/app/globals.css";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const language = locale === "en" ? "en" : "fr";
  return {
    title: brand.name,
    description: brand.tagline[language],
    applicationName: brand.name,
    manifest: "/manifest.webmanifest",
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <head>
        <Script
          src="/theme-bootstrap.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <ThemeSchedule />
        <PwaServiceWorker />
        {process.env.APP_ENV === "development" && process.env.NODE_ENV !== "production" && (
          <div className="demo-banner" role="note">
            {locale === "en" ? "Demonstration data" : "Données de démonstration"}
          </div>
        )}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
