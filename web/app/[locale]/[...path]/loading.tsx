export default function ScreenPreviewLoading() {
  return (
    <main className="page-shell preview-shell" aria-busy="true">
      <div className="skeleton skeleton-header" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-copy" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card skeleton-card-short" />
    </main>
  );
}
