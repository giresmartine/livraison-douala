export function StorefrontLoading() {
  return (
    <main className="storefront-page page-shell" aria-busy="true" aria-label="Chargement">
      <div className="skeleton skeleton-header" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-copy" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card skeleton-card-short" />
    </main>
  );
}
