import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { getDevelopmentEnvironment } from "./dev-env.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(scriptDirectory, "../supabase/dev-data/enseignes.json");
const forbiddenPharmacyText =
  /\b(médicament|medicament|medicine|medication|posologie|dosage|antibiotique|antibiotic|paracétamol|paracetamol|ibuprofène|ibuprofen|traitement|treatment|guérir|cure)\b/i;

function validateData(data) {
  const slugs = new Set();
  const byType = { restaurant: 0, pharmacy: 0 };
  for (const partner of data.partners ?? []) {
    if (!["restaurant", "pharmacy"].includes(partner.type)) {
      throw new Error(`Type d’enseigne invalide pour ${partner.slug}.`);
    }
    if (!partner.slug || slugs.has(partner.slug) || !partner.name?.startsWith("TEST - ")) {
      throw new Error(`Slug dupliqué ou nom non fictif pour ${partner.slug || "une enseigne"}.`);
    }
    slugs.add(partner.slug);
    byType[partner.type] += 1;
    if (!data.catalogues[partner.catalogue] || data.catalogues[partner.catalogue].length < 8 ||
        data.catalogues[partner.catalogue].length > 12) {
      throw new Error(`Le catalogue de ${partner.slug} doit contenir 8 à 12 produits.`);
    }
    if (!Object.hasOwn(data.hours, partner.hours)) {
      throw new Error(`Horaires inconnus pour ${partner.slug}.`);
    }
    for (const product of data.catalogues[partner.catalogue]) {
      if (!Number.isSafeInteger(product.price) || product.price < 0 ||
          !product.name?.fr || !product.name?.en || !product.slug ||
          typeof product.available !== "boolean") {
        throw new Error(`Produit incomplet ou prix invalide dans ${partner.catalogue}.`);
      }
      if (partner.type === "pharmacy" &&
          forbiddenPharmacyText.test(`${product.name.fr} ${product.name.en} ${product.description.fr} ${product.description.en}`)) {
        throw new Error(`Texte médical interdit dans le produit ${product.slug}.`);
      }
      for (const option of product.options ?? []) {
        if (!option.name?.fr || !option.name?.en || !Number.isSafeInteger(option.price_delta)) {
          throw new Error(`Option invalide pour ${product.slug}.`);
        }
      }
    }
  }
  if (byType.restaurant === 0 || byType.pharmacy === 0) {
    throw new Error("La source doit contenir au moins un restaurant et une pharmacie.");
  }
  if (data.partners.some((partner) => partner.hours !== "closed") &&
      !data.partners.some((partner) => partner.hours === "closed")) {
    throw new Error("La source doit conserver une enseigne fermée pour les essais.");
  }
  return byType;
}

async function checked(result, operation) {
  if (result.error) {
    throw new Error(`${operation} a échoué (${result.error.code ?? "erreur Supabase"}): ${result.error.message}`);
  }
  return result.data;
}

async function main() {
  const environment = getDevelopmentEnvironment();
  const data = JSON.parse(readFileSync(dataPath, "utf8"));
  const counts = validateData(data);
  const client = createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const previousPartners = await checked(
    await client.from("partners").select("id, slug, is_demo, source").eq("source", "development-demo"),
    "Lecture des enseignes de démonstration",
  );
  const existingTargets = await checked(
    await client.from("partners").select("slug, is_demo, source")
      .in("slug", data.partners.map((partner) => partner.slug)),
    "Vérification des slugs du catalogue",
  );
  for (const existing of existingTargets) {
    if (!existing.is_demo || existing.source !== "development-demo") {
      throw new Error(`Le slug ${existing.slug} appartient à une enseigne qui n’est pas gérée par la démo.`);
    }
  }
  const previousBySlug = new Map(previousPartners.map((partner) => [partner.slug, partner]));
  for (const partner of data.partners) {
    const existing = previousBySlug.get(partner.slug);
    if (existing && !existing.is_demo) {
      throw new Error(`Le slug ${partner.slug} appartient à une enseigne non démo; aucune donnée ne sera écrasée.`);
    }
  }
  const targetSlugs = new Set(data.partners.map((partner) => partner.slug));
  const stalePartnerIds = previousPartners
    .filter((partner) => !targetSlugs.has(partner.slug))
    .map((partner) => partner.id);
  const partners = await checked(
    await client.from("partners").upsert(
      data.partners.map((partner) => ({
        slug: partner.slug,
        type: partner.type,
        name: partner.name,
        description: partner.description,
        cuisine_tags: [],
        address_text: null,
        neighborhood_id: null,
        geo: null,
        min_order: partner.minimum_order || null,
        status: "active",
        rating_avg: null,
        rating_count: 0,
        is_placeholder: false,
        is_demo: true,
        source: "development-demo",
      })),
      { onConflict: "slug" },
    ).select("id, slug"),
    "Création ou mise à jour des enseignes",
  );
  const partnerIdBySlug = new Map(partners.map((partner) => [partner.slug, partner.id]));
  const partnerIds = partners.map((partner) => partner.id);

  const desiredProducts = data.partners.flatMap((partner) =>
    data.catalogues[partner.catalogue].map((product, index) => ({
      ...product,
      partner_id: partnerIdBySlug.get(partner.slug),
      is_available: product.available,
      is_popular: false,
      requires_age_check: false,
      is_medicine: false,
      is_placeholder: false,
      is_demo: true,
      sort: index,
      image_path: null,
      prep_minutes: null,
      compare_at_price: null,
    })),
  );
  const currentProducts = partnerIds.length
    ? await checked(
        await client.from("products").select("id, partner_id, slug, is_demo").in("partner_id", partnerIds),
        "Vérification des produits existants",
      )
    : [];
  const desiredProductKeys = new Set(desiredProducts.map((product) => `${product.partner_id}:${product.slug}`));
  for (const product of currentProducts) {
    if (desiredProductKeys.has(`${product.partner_id}:${product.slug}`) && !product.is_demo) {
      throw new Error(`Le produit ${product.slug} n’est pas marqué démo; aucune donnée ne sera écrasée.`);
    }
  }
  const products = await checked(
    await client.from("products").upsert(
      desiredProducts.map((product) => ({
        ...product,
        name: {
          fr: `TEST - ${product.name.fr}`,
          en: `TEST - ${product.name.en}`,
        },
      })),
      { onConflict: "partner_id,slug" },
    ).select("id, partner_id, slug"),
    "Création ou mise à jour des produits",
  );
  const staleProductIds = currentProducts
    .filter((product) =>
      product.is_demo && !desiredProductKeys.has(`${product.partner_id}:${product.slug}`),
    )
    .map((product) => product.id);
  let retainedProductIds = [];
  if (staleProductIds.length) {
    const referencedItems = await checked(
      await client.from("order_items").select("product_id").in("product_id", staleProductIds),
      "Vérification des références historiques des produits",
    );
    const referencedProductIds = new Set(referencedItems.map((item) => item.product_id));
    retainedProductIds = staleProductIds.filter((id) => referencedProductIds.has(id));
    const removableProductIds = staleProductIds.filter((id) => !referencedProductIds.has(id));
    if (retainedProductIds.length) {
      await checked(
        await client.from("products").update({ is_available: false }).in("id", retainedProductIds),
        "Archivage des produits démo liés à une commande",
      );
      console.log("Les produits retirés de la source mais présents dans des commandes restent archivés.");
    }
    if (removableProductIds.length) {
      await checked(
        await client.from("products").delete().in("id", removableProductIds),
        "Suppression des anciens produits démo",
      );
    }
  }
  const productIds = products.map((product) => product.id);
  const oldGroups = productIds.length
    ? await checked(
        await client.from("option_groups").select("id").in("product_id", productIds),
        "Lecture des options existantes",
      )
    : [];
  if (oldGroups.length) {
    await checked(
      await client.from("option_groups").delete().in("id", oldGroups.map((group) => group.id)),
      "Remplacement des options démo",
    );
  }
  const productSourceByKey = new Map(
    desiredProducts.map((product) => [`${product.partner_id}:${product.slug}`, product]),
  );
  const optionGroupsToCreate = products.flatMap((product) => {
    const source = productSourceByKey.get(`${product.partner_id}:${product.slug}`);
    return source.options?.length
      ? [{
          product_id: product.id,
          name: { fr: "Options", en: "Options" },
          min_select: 0,
          max_select: 1,
          sort: 0,
        }]
      : [];
  });
  const groups = optionGroupsToCreate.length
    ? await checked(
        await client.from("option_groups").insert(optionGroupsToCreate).select("id, product_id"),
        "Création des groupes d’options",
      )
    : [];
  const groupByProductId = new Map(groups.map((group) => [group.product_id, group.id]));
  const optionsToCreate = products.flatMap((product) => {
    const groupId = groupByProductId.get(product.id);
    const source = productSourceByKey.get(`${product.partner_id}:${product.slug}`);
    return groupId
      ? source.options.map((option, index) => ({
          group_id: groupId,
          name: option.name,
          price_delta: option.price_delta,
          is_available: true,
          sort: index,
        }))
      : [];
  });
  if (optionsToCreate.length) {
    await checked(
      await client.from("options").insert(optionsToCreate),
      "Création des options de produits",
    );
  }

  await checked(
    await client.from("partner_hours").delete().in("partner_id", partnerIds),
    "Remplacement des horaires démo",
  );
  const hoursToCreate = data.partners.flatMap((partner) =>
    data.hours[partner.hours].map((hours) => ({
      ...hours,
      partner_id: partnerIdBySlug.get(partner.slug),
      last_order_before_close: 0,
    })),
  );
  if (hoursToCreate.length) {
    await checked(await client.from("partner_hours").insert(hoursToCreate), "Création des horaires démo");
  }

  await checked(
    await client.from("partner_closures").delete().in("partner_id", partnerIds),
    "Remplacement des congés démo",
  );
  const closure = data.exceptional_closure;
  if (closure) {
    const partnerId = partnerIdBySlug.get(closure.partner_slug);
    if (!partnerId || !Number.isSafeInteger(closure.days) || closure.days < 1) {
      throw new Error("La période de fermeture exceptionnelle est invalide.");
    }
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + closure.days * 24 * 60 * 60 * 1000);
    await checked(
      await client.from("partner_closures").insert({
        partner_id: partnerId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        reason: "TEST - Fermeture exceptionnelle de démonstration",
      }),
      "Création du congé exceptionnel démo",
    );
  }

  if (stalePartnerIds.length) {
    const referencedOrders = await checked(
      await client.from("orders").select("partner_id").in("partner_id", stalePartnerIds),
      "Vérification des commandes historiques des enseignes",
    );
    const referencedPartnerIds = new Set(referencedOrders.map((order) => order.partner_id));
    const archivedPartnerIds = stalePartnerIds.filter((id) => referencedPartnerIds.has(id));
    const removablePartnerIds = stalePartnerIds.filter((id) => !referencedPartnerIds.has(id));
    if (archivedPartnerIds.length) {
      await checked(
        await client.from("partners").update({ status: "closed" }).in("id", archivedPartnerIds),
        "Archivage des enseignes démo liées à une commande",
      );
      await checked(
        await client.from("products").update({ is_available: false }).in("partner_id", archivedPartnerIds),
        "Désactivation des produits des enseignes archivées",
      );
      console.log("Les enseignes retirées de la source mais présentes dans des commandes restent archivées.");
    }
    if (removablePartnerIds.length) {
      await checked(
        await client.from("partners").delete().in("id", removablePartnerIds),
        "Suppression des anciennes enseignes démo",
      );
    }
  }

  console.log(`Données de démonstration chargées : ${counts.restaurant} restaurants, ${counts.pharmacy} pharmacies, ${products.length} produits.`);
  for (const partner of data.partners) console.log(`- ${partner.name}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Le chargement des données démo a échoué.");
  process.exitCode = 1;
});
