import { renderScreenPreview } from "@/components/screen-preview-page";

export default async function PharmaciesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return renderScreenPreview({ locale, path: ["pharmacies"], query: {} });
}
