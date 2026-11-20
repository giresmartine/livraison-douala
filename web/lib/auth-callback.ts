export function getAuthCallbackUrl(
  siteUrl: string,
  locale: "fr" | "en",
  nextPath: string,
) {
  return `${siteUrl}/${locale}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
