import Link from "next/link";
import { isScreenGalleryEnabled } from "@/lib/config/features";

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
      <h1>{english ? "Page not found" : "Page introuvable"}</h1>
      <p>
        {english
          ? "The link may be incorrect or the page no longer exists."
          : "Le lien est peut-être incorrect ou la page n’existe plus."}
      </p>
      <Link className="continue-button state-link" href={`/${locale}`}>
        {english ? "Back to home" : "Retour à l’accueil"}
      </Link>
      {isScreenGalleryEnabled && (
        <Link className="state-link" href={`/${locale}/ecrans`}>
          {english ? "Browse all screens (development)" : "Voir tous les écrans (développement)"}
        </Link>
      )}
    </main>
  );
}
