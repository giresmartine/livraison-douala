import { expect, test } from "@playwright/test";

test("CSP permits hydration on a static page and an already-dynamic auth page", async ({
  page,
}) => {
  const cspConsoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /content security policy/i.test(message.text())) {
      cspConsoleErrors.push(message.text());
    }
  });

  const staticResponse = await page.goto("/fr", { waitUntil: "load" });
  const staticPolicy = staticResponse?.headers()["content-security-policy"] ?? "";
  const staticScriptPolicy = staticPolicy.match(/script-src[^;]*/)?.[0] ?? "";

  expect(staticResponse?.status()).toBe(200);
  expect(staticScriptPolicy).toContain("'sha256-");
  expect(staticScriptPolicy).not.toContain("'unsafe-inline'");

  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(
    page.getByText("Saisis ton quartier et une rue ou un repère pour continuer.", {
      exact: true,
    }),
  ).toBeVisible();

  const authResponse = await page.goto("/fr/connexion", { waitUntil: "load" });
  const authPolicy = authResponse?.headers()["content-security-policy"] ?? "";
  const authScriptPolicy = authPolicy.match(/script-src[^;]*/)?.[0] ?? "";

  expect(authResponse?.status()).toBe(200);
  expect(authScriptPolicy).toMatch(/'nonce-[^']+'/);
  expect(authScriptPolicy).not.toContain("'unsafe-inline'");

  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    expect(authScriptPolicy).toContain("https://challenges.cloudflare.com");
    await expect(page.locator('input[name="captchaToken"]')).toHaveValue(/.+/, {
      timeout: 30_000,
    });
  }

  const signInButton = page.getByRole("button", { name: "Se connecter" });
  if (await signInButton.isEnabled()) {
    await signInButton.click();
    await expect(page.getByLabel("Adresse email")).toBeFocused();
  } else {
    await expect(signInButton).toBeDisabled();
  }

  await page.getByRole("link", { name: "Créer un compte" }).click();
  await expect(page).toHaveURL(/\/fr\/inscription$/);
  expect(cspConsoleErrors).toEqual([]);
});
