import { renderScreenPreview } from "@/components/screen-preview-page";

export default async function RestaurantsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return renderScreenPreview({ locale, path: ["restaurants"], query: {} });
}
