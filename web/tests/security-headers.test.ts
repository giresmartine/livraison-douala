import { describe, expect, it } from "vitest";
import {
  createContentSecurityPolicy,
  isPublicStaticPath,
} from "../lib/security-headers";

describe("content security policy", () => {
  it("uses a nonce without allowing inline scripts on dynamic pages", () => {
    const policy = createContentSecurityPolicy({
      nonce: "test-nonce",
      supabaseUrl: "https://project.supabase.co",
    });

    expect(policy).toContain("'nonce-test-nonce'");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).toContain("connect-src 'self' https://project.supabase.co wss://project.supabase.co");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it("only identifies the public prerendered route set as static", () => {
    expect(isPublicStaticPath("/fr")).toBe(true);
    expect(isPublicStaticPath("/en/restaurants")).toBe(true);
    expect(isPublicStaticPath("/fr/pharmacies/")).toBe(true);
    expect(isPublicStaticPath("/fr/connexion")).toBe(false);
    expect(isPublicStaticPath("/fr/accueil")).toBe(false);
    expect(isPublicStaticPath("/fr/ecrans/partenaire")).toBe(false);
  });
});
