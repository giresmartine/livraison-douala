type ContentSecurityPolicyOptions = {
  nonce?: string;
  scriptHashes?: string[];
  allowInlineScripts?: boolean;
  supabaseUrl?: string;
  turnstileEnabled?: boolean;
};

export function createContentSecurityPolicy({
  nonce,
  scriptHashes = [],
  allowInlineScripts = false,
  supabaseUrl,
  turnstileEnabled = false,
}: ContentSecurityPolicyOptions = {}) {
  const scriptSources = [
    "'self'",
    ...(nonce ? [`'nonce-${nonce}'`] : []),
    ...scriptHashes.map((hash) => `'sha256-${hash}'`),
    ...(turnstileEnabled ? ["https://challenges.cloudflare.com"] : []),
    ...(allowInlineScripts ? ["'unsafe-inline'"] : []),
  ];
  const connectionSources = ["'self'"];
  const imageSources = ["'self'", "data:", "blob:"];
  const frameSources = ["'none'"];

  if (supabaseUrl) {
    const supabase = new URL(supabaseUrl);
    const websocket = new URL(supabaseUrl);
    websocket.protocol = supabase.protocol === "https:" ? "wss:" : "ws:";
    connectionSources.push(supabase.origin, websocket.origin);
    imageSources.push(supabase.origin);
  }

  if (turnstileEnabled) {
    connectionSources.push("https://challenges.cloudflare.com");
    frameSources.splice(0, 1, "https://challenges.cloudflare.com");
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
    `frame-src ${frameSources.join(" ")}`,
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ].join("; ");
}

export function isPublicStaticPath(
  pathname: string,
  supabaseConfigured = false,
) {
  if (/^\/(fr|en)(?:\/ecrans|\/mentions-et-credits)?\/?$/.test(pathname)) return true;
  return (
    !supabaseConfigured &&
    /^\/(fr|en)\/(?:restaurants|pharmacies)\/?$/.test(pathname)
  );
}
