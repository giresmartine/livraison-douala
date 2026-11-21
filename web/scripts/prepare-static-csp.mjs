import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const isWebpack = process.argv.includes("--webpack");
const nextCli = resolve("node_modules/next/dist/bin/next");
const generatedHashesPath = resolve(".static-csp-hashes.json");
const buildId = randomUUID();
const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const staticPages = ["fr", "en"].flatMap((locale) =>
  ["", "ecrans", "mentions-et-credits", ...(supabaseConfigured ? [] : ["restaurants", "pharmacies"])].map((page) => ({
    pathname: `/${locale}${page ? `/${page}` : ""}`,
    htmlPath: page
      ? join(".next", "server", "app", locale, `${page}.html`)
      : join(".next", "server", "app", `${locale}.html`),
  })),
);

if (!existsSync(nextCli)) {
  throw new Error("Next.js CLI was not found. Install the web dependencies first.");
}

const build = spawnSync(
  process.execPath,
  [nextCli, "build", ...(isWebpack ? ["--webpack"] : [])],
  {
    env: {
      ...process.env,
      CSP_HASH_PREBUILD: "1",
      CSP_HASH_PREBUILD_ID: buildId,
    },
    stdio: "inherit",
  },
);

if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const hashesByPath = {};

for (const page of staticPages) {
  if (!existsSync(page.htmlPath)) {
    throw new Error(`Expected prerendered static page is missing: ${page.htmlPath}`);
  }

  const html = readFileSync(page.htmlPath, "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes, content]) => !/\bsrc\s*=/.test(attributes) && content.length > 0)
    .map(([, , content]) =>
      createHash("sha256").update(content, "utf8").digest("base64"),
    );

  if (scripts.length === 0) {
    throw new Error(`No inline script hashes were generated for ${page.pathname}.`);
  }

  hashesByPath[page.pathname] = [...new Set(scripts)];
}

writeFileSync(
  generatedHashesPath,
  `${JSON.stringify({ buildId, hashes: hashesByPath }, null, 2)}\n`,
);
console.log(`Prepared CSP hashes for ${staticPages.length} static routes.`);
