import type { Metadata } from "next";
import type { ReactNode } from "react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeSchedule } from "@/components/theme-schedule";
import { routing } from "@/i18n/routing";
import { publicEnvironment } from "@/lib/env";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: publicEnvironment.NEXT_PUBLIC_BRAND_NAME ?? "Livraison à Douala",
  description: "Trouve une livraison près de toi, à Douala.",
  applicationName: publicEnvironment.NEXT_PUBLIC_BRAND_NAME ?? "Livraison à Douala",
  manifest: "/manifest.json",
};

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

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
      <body>
        <ThemeSchedule />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
