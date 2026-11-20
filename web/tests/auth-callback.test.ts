import { describe, expect, it } from "vitest";
import { getAuthCallbackUrl } from "../lib/auth-callback";

describe("localized authentication callback URLs", () => {
  it.each(["fr", "en"] as const)(
    "uses the %s callback route for emailRedirectTo and redirectTo",
    (locale) => {
      const emailRedirectTo = getAuthCallbackUrl(
        "https://livraison.example",
        locale,
        `/${locale}/accueil`,
      );
      const redirectTo = getAuthCallbackUrl(
        "https://livraison.example",
        locale,
        `/${locale}/mot-de-passe/reinitialiser`,
      );

      expect(emailRedirectTo).toContain(`/${locale}/auth/callback`);
      expect(redirectTo).toContain(`/${locale}/auth/callback`);
      expect(new URL(emailRedirectTo).searchParams.get("next")).toBe(`/${locale}/accueil`);
      expect(new URL(redirectTo).searchParams.get("next")).toBe(`/${locale}/mot-de-passe/reinitialiser`);
    },
  );
});
