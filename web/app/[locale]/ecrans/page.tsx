import { notFound } from "next/navigation";
import { ScreenGallery } from "@/components/screen-gallery";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { isScreenGalleryEnabled } from "@/lib/config/features";

export default async function ScreenGalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isScreenGalleryEnabled || !hasLocale(routing.locales, locale)) notFound();

  return <ScreenGallery locale={locale} />;
}
