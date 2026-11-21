import { describe, expect, it } from "vitest";
import { validateDevelopmentEnvironment } from "../scripts/dev-env.mjs";

const validEnvironment = {
  APP_ENV: "development",
  NODE_ENV: "development",
  SUPABASE_DEV_PROJECT_NAME: "livraison-douala-dev",
  SUPABASE_DEV_PROJECT_REF: "abcdefghijklmnopqrst",
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  AUTHENTICATION_ENABLED: "true",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_TERMS_VERSION: "test-terms",
  NEXT_PUBLIC_PRIVACY_VERSION: "test-privacy",
};

describe("development environment guard", () => {
  it("accepts only the explicitly marked development project", () => {
    expect(validateDevelopmentEnvironment(validEnvironment).SUPABASE_DEV_PROJECT_REF)
      .toBe("abcdefghijklmnopqrst");
  });

  it("refuses production mode and a mismatched project URL", () => {
    expect(() => validateDevelopmentEnvironment({ ...validEnvironment, APP_ENV: "production" }))
      .toThrow("APP_ENV doit être development");
    expect(() => validateDevelopmentEnvironment({
      ...validEnvironment,
      NEXT_PUBLIC_SUPABASE_URL: "https://zyxwvutsrqponmlkjihg.supabase.co",
    })).toThrow("ne correspond pas");
  });

  it("refuses an unmarked project or a non-test CAPTCHA key", () => {
    expect(() => validateDevelopmentEnvironment({
      ...validEnvironment,
      SUPABASE_DEV_PROJECT_NAME: "livraison-douala",
    })).toThrow("explicitement nommé");
    expect(() => validateDevelopmentEnvironment({
      ...validEnvironment,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "production-site-key",
    })).toThrow("clé publique officielle de test");
  });
});
