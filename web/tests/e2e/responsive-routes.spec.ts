import { expect, test } from "@playwright/test";
import { screens } from "../../lib/screens";

const testPassword = "Local-e2e-Password-123!";

const accounts = {
  client: { email: "e2e-client@example.test", password: testPassword },
  partner: { email: "e2e-partner@example.test", password: testPassword },
  courier: { email: "e2e-courier@example.test", password: testPassword },
  operations: { email: "e2e-admin@example.test", password: testPassword },
};

test("all registered routes fit the viewport at mobile and tablet widths when authorized", async ({ browser }) => {
  test.setTimeout(10 * 60 * 1000);

  const widths = [360, 390, 768];
  const baseURL = process.env.NEXT_PUBLIC_SITE_URL;
  expect(baseURL, "test:e2e must configure the local Supabase test URL").toBeTruthy();
  const pages = new Map<string, Awaited<ReturnType<typeof browser.newPage>>>();
  const contexts = [];

  for (const [group, account] of Object.entries(accounts)) {
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 900 } });
    contexts.push(context);
    const page = await context.newPage();
    pages.set(group, page);

    await page.goto("/fr/connexion", { waitUntil: "load" });
    await page.getByLabel("Adresse email").fill(account.email);
    await page.getByLabel("Mot de passe (12 caractères minimum)").fill(account.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).not.toHaveURL(/\/fr\/connexion/);
  }

  const pageForGroup = (group: string) => {
    const page = pages.get(group);
    expect(page, `missing authenticated test account for ${group}`).toBeDefined();
    return page!;
  };

  try {
    for (const width of widths) {
      for (const page of pages.values()) {
        await page.setViewportSize({ width, height: 900 });
      }

      for (const screen of screens) {
        const path = screen.href === "/" ? "" : screen.href;
        const page = pageForGroup(screen.group);
        const response = await page.goto(`/fr${path}`, { waitUntil: "load" });

        const dimensions = await page.evaluate(() => ({
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));

        expect(
          dimensions.scrollWidth,
          `${screen.id} (${screen.href}) at ${width}px`,
        ).toBeLessThanOrEqual(dimensions.innerWidth);

        if (screen.sensitive) {
          expect(response?.status(), `${screen.id} should load for its authorized role`).toBe(200);
          const expectedPath = screen.id === "S-16"
            ? "/fr/commande/recapitulatif"
            : `/fr${path}`;
          expect(new URL(page.url()).pathname).toBe(new URL(expectedPath, baseURL).pathname);
        }
      }
    }

    const partnerScreen = screens.find((screen) => screen.group === "partner" && screen.sensitive);
    expect(partnerScreen, "expected a protected partner screen").toBeDefined();
    const clientPage = pageForGroup("client");
    await clientPage.goto(`/fr${partnerScreen!.href}`, { waitUntil: "load" });
    expect(new URL(clientPage.url()).pathname).not.toBe(
      new URL(`/fr${partnerScreen!.href}`, baseURL).pathname,
    );

    await clientPage.goto("/fr/commande/livraison", { waitUntil: "load" });
    await expect(clientPage.getByLabel("Ville")).toHaveValue("Douala");
    await expect(clientPage.getByLabel("Ville")).toHaveAttribute("readonly", "");
    await clientPage.getByLabel("Quartier").fill("Quartier libre");
    await clientPage.getByLabel("Repère / indications").fill("Repère de test");
    await clientPage.getByRole("button", { name: "Enregistrer l’adresse et continuer" }).click();
    await expect(clientPage).toHaveURL(/\/fr\/commande\/recapitulatif$/);
    await expect(clientPage.getByText("Ton panier est vide. Aucune commande n’a été créée.")).toBeVisible();
    const addressDraft = await clientPage.evaluate(() =>
      JSON.parse(sessionStorage.getItem("delivery-address-draft") ?? "null"),
    );
    expect(addressDraft).toMatchObject({
      city: "Douala",
      neighborhood: "Quartier libre",
      landmark: "Repère de test",
    });

    await clientPage.goto("/en/commande/livraison", { waitUntil: "load" });
    await expect(clientPage.getByLabel("City")).toHaveValue("Douala");
    await expect(clientPage.getByLabel("City")).toHaveAttribute("readonly", "");
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test("unknown routes return an HTTP 404", async ({ page }) => {
  const response = await page.goto("/fr/nimporte-quoi", { waitUntil: "load" });

  expect(response?.status()).toBe(404);
});
