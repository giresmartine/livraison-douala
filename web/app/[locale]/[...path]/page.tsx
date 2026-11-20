import { renderScreenPreview } from "@/components/screen-preview-page";

export default async function ScreenPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale, path }, query] = await Promise.all([params, searchParams]);
  return renderScreenPreview({ locale, path, query });
}
