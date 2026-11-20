import { expect, test } from "@playwright/test";

test("a distant GPS position still offers manual address entry", async ({ page }) => {
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({
    latitude: 3.6062,
    longitude: 9.6670278,
  });

  await page.goto("/fr");
  await page.getByRole("button", { name: "Utiliser ma position" }).click();
  await expect(page).toHaveURL(/\/fr\/zone-indisponible$/);
  await page.getByRole("link", { name: "Saisir une adresse à Douala" }).click();

  await page.getByLabel("Quartier").fill("Quartier périphérique");
  await page.getByLabel("Rue / repère").fill("Repère connu");
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page).toHaveURL(/\/fr\/accueil$/);
  const savedAddress = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("delivery-address-draft") ?? "null"),
  );
  expect(savedAddress).toMatchObject({
    city: "Douala",
    neighborhood: "Quartier périphérique",
    landmark: "Repère connu",
  });
});
