import { renderScreenPreview } from "@/components/screen-preview-page";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  return renderScreenPreview({ locale, path: ["recherche"], query });
}
