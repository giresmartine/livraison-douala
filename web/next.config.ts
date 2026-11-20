import type { NextConfig } from "next";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import { createContentSecurityPolicy } from "./lib/security-headers";

const staticCspHashesPath = join(process.cwd(), ".static-csp-hashes.json");
const staticCspHashes =
  process.env.CSP_HASH_PREBUILD === "1" ? undefined : readStaticCspData();
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  async generateBuildId() {
    if (process.env.CSP_HASH_PREBUILD === "1") {
      const buildId = process.env.CSP_HASH_PREBUILD_ID;
      if (!buildId) throw new Error("Missing CSP hash pre-build ID.");
      return buildId;
    }

    return staticCspHashes?.buildId ?? randomUUID();
  },
  async headers() {
    const headers = [{ source: "/:path*", headers: securityHeaders }];

    if (staticCspHashes) {
      for (const [pathname, hashes] of Object.entries(staticCspHashes.hashes)) {
        headers.push({
          source: pathname,
          headers: [
            {
              key: "Content-Security-Policy",
              value: createContentSecurityPolicy({
                scriptHashes: hashes,
                supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
              }),
            },
          ],
        });
      }
    }

    return headers;
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);

function readStaticCspData():
  | { buildId: string; hashes: Record<string, string[]> }
  | undefined {
  try {
    return JSON.parse(readFileSync(staticCspHashesPath, "utf8")) as Record<
      "buildId",
      string
    > & { hashes: Record<string, string[]> };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}
