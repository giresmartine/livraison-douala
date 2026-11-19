import Link from "next/link";

export default async function LocalizedNotFound({
  params,
}: {
  params?: Promise<{ locale?: string }>;
}) {
  const locale = (await params)?.locale === "en" ? "en" : "fr";
  const english = locale === "en";

  return (
    <main className="page-shell state-page">
      <p className="eyebrow">404</p>
      <h1>{english ? "This screen is not available" : "Cet écran n’existe pas"}</h1>
      <p>
        {english
          ? "The link may be incorrect or this page is not part of the current preview."
          : "Le lien est peut-être incorrect ou cette page ne fait pas partie de l’aperçu."}
      </p>
      <Link className="continue-button state-link" href={`/${locale}/ecrans`}>
        {english ? "Browse all screens" : "Voir tous les écrans"}
      </Link>
    </main>
  );
}
