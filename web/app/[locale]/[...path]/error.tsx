"use client";

export default function ScreenPreviewError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="page-shell state-page">
      <p className="eyebrow">500</p>
      <h1>Une erreur est survenue.</h1>
      <p>La page n’a pas pu être affichée. Réessaie ou retourne au catalogue des écrans.</p>
      <button className="continue-button state-link" onClick={retry} type="button">
        Réessayer
      </button>
    </main>
  );
}
