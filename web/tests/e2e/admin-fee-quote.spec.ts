import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const testPassword = "Local-e2e-Password-123!";

test("admin can issue, cancel, and reissue a fee quote accessibly", async ({ page }) => {
  test.setTimeout(90_000);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(supabaseUrl).toBeTruthy();
  expect(serviceRoleKey).toBeTruthy();
  expect(["localhost", "127.0.0.1", "::1"]).toContain(new URL(supabaseUrl!).hostname);

  const service = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: users, error: usersError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  expect(usersError).toBeNull();
  const customer = users.users.find((user) => user.email === "e2e-client@example.test");
  expect(customer).toBeDefined();

  const idempotencyKey = `e2e-admin-quote-${crypto.randomUUID()}`;
  const itemName = `TEST - E2E quote item ${idempotencyKey}`;
  const { data: order, error: orderError } = await service
    .from("orders")
    .insert({
      customer_id: customer!.id,
      status: "pending_fee_quote",
      subtotal: 10000,
      discount_total: 0,
      delivery_fee: null,
      service_fee: 0,
      surcharges: 0,
      tip: 0,
      total: 10000,
      quote_requested_at: new Date().toISOString(),
      quote_version: 0,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();
  expect(orderError).toBeNull();
  expect(order).toBeDefined();

  try {
    const { error: itemError } = await service.from("order_items").insert({
      order_id: order!.id,
      product_id: null,
      partner_id: null,
      name_snapshot: itemName,
      unit_price: 10000,
      qty: 1,
      options: [],
      line_total: 10000,
    });
    expect(itemError).toBeNull();

    await page.goto("/fr/connexion");
    await page.getByLabel("Adresse email").fill("e2e-admin@example.test");
    await page.getByLabel("Mot de passe (12 caractères minimum)").fill(testPassword);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).not.toHaveURL(/\/fr\/connexion/);

    await page.goto("/fr/ops/commandes");
    await expect(page.getByRole("heading", { name: "File des devis de livraison" })).toBeVisible();
    await expect(page.getByText(itemName)).toBeVisible();

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);

    await page.getByLabel("Frais de livraison en XAF").fill("1200");
    await page.getByRole("button", { name: "Envoyer le devis" }).click();
    await expect(page.getByText("Devis envoyé · version 1")).toBeVisible();
    await expect(page.getByText(/Frais de livraison actuels/)).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Annuler et préparer une réémission" }).click();
    await expect(page.getByText("Nouveau devis demandé · prochaine version 2")).toBeVisible();

    await page.getByLabel("Frais de livraison en XAF").fill("1500");
    await page.getByRole("button", { name: "Réémettre le devis" }).click();
    await expect(page.getByText("Devis envoyé · version 2")).toBeVisible();
  } finally {
    const { count: quoteCount, error: quoteReadError } = await service
      .from("order_fee_quotes")
      .select("id", { count: "exact", head: true })
      .eq("order_id", order!.id);
    if (quoteReadError) {
      throw new Error(`Could not check for immutable E2E fee quotes: ${quoteReadError.message}`);
    }
    if (quoteCount === null) throw new Error("Could not determine whether the E2E order has immutable fee quotes.");

    if (quoteCount > 0) {
      console.info("Preserving the E2E order because its fee quote history is immutable.");
    } else {
      const { error: cleanupError } = await service.from("orders").delete().eq("id", order!.id);
      if (cleanupError) {
        throw new Error(`Could not remove the isolated E2E fee-quote order: ${cleanupError.message}`);
      }
    }
  }
});
