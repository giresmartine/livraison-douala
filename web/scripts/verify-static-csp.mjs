import { createHash } from "node:crypto";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";

const generatedHashesPath = resolve(".static-csp-hashes.json");
const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const staticPages = ["fr", "en"].flatMap((locale) =>
  ["", "ecrans", ...(supabaseConfigured ? [] : ["restaurants", "pharmacies"])].map((page) => ({
    pathname: `/${locale}${page ? `/${page}` : ""}`,
    htmlPath: page
      ? join(".next", "server", "app", locale, `${page}.html`)
      : join(".next", "server", "app", `${locale}.html`),
  })),
);

if (!existsSync(generatedHashesPath)) {
  throw new Error("Static CSP hashes are missing; run the build through npm.");
}

const hashesByPath = JSON.parse(readFileSync(generatedHashesPath, "utf8"));
const routeHashes = hashesByPath.hashes;

for (const page of staticPages) {
  if (!existsSync(page.htmlPath)) {
    throw new Error(`Expected prerendered static page is missing: ${page.htmlPath}`);
  }

  const html = readFileSync(page.htmlPath, "utf8");
  const actualHashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes, content]) => !/\bsrc\s*=/.test(attributes) && content.length > 0)
    .map(([, , content]) =>
      createHash("sha256").update(content, "utf8").digest("base64"),
    );
  const allowedHashes = new Set(routeHashes[page.pathname] ?? []);
  const missingHashes = actualHashes.filter((hash) => !allowedHashes.has(hash));

  if (missingHashes.length > 0) {
    throw new Error(
      `CSP hash prepass did not match ${page.pathname}; ${missingHashes.length} hash(es) are missing.`,
    );
  }
}

unlinkSync(generatedHashesPath);
console.log(`Verified CSP hashes and static output for ${staticPages.length} routes.`);
