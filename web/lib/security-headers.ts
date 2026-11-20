type ContentSecurityPolicyOptions = {
  nonce?: string;
  scriptHashes?: string[];
  allowInlineScripts?: boolean;
  supabaseUrl?: string;
};

export function createContentSecurityPolicy({
  nonce,
  scriptHashes = [],
  allowInlineScripts = false,
  supabaseUrl,
}: ContentSecurityPolicyOptions = {}) {
  const scriptSources = [
    "'self'",
    ...(nonce ? [`'nonce-${nonce}'`] : []),
    ...scriptHashes.map((hash) => `'sha256-${hash}'`),
    ...(allowInlineScripts ? ["'unsafe-inline'"] : []),
  ];
  const connectionSources = ["'self'"];
  const imageSources = ["'self'", "data:", "blob:"];

  if (supabaseUrl) {
    const supabase = new URL(supabaseUrl);
    const websocket = new URL(supabaseUrl);
    websocket.protocol = supabase.protocol === "https:" ? "wss:" : "ws:";
    connectionSources.push(supabase.origin, websocket.origin);
    imageSources.push(supabase.origin);
  }

  return [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self'",
    `img-src ${imageSources.join(" ")}`,
    "font-src 'self'",
    `connect-src ${connectionSources.join(" ")}`,
    "frame-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ].join("; ");
}

export function isPublicStaticPath(pathname: string) {
  return /^\/(fr|en)(?:\/(?:ecrans|restaurants|pharmacies))?\/?$/.test(pathname);
}
