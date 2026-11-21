import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const demoData = JSON.parse(
  readFileSync(new URL("../supabase/dev-data/enseignes.json", import.meta.url), "utf8"),
) as {
  hours: Record<string, Array<{ opens_at: string; closes_at: string }>>;
  catalogues: Record<string, Array<{
    name: { fr: string; en: string };
    description: { fr: string; en: string };
    price: number;
    available: boolean;
    options: Array<{ price_delta: number }>;
  }>>;
  partners: Array<{
    slug: string;
    name: string;
    type: "restaurant" | "pharmacy";
    catalogue: string;
    hours: string;
    minimum_order: number;
  }>;
  exceptional_closure: { partner_slug: string; days: number };
};

describe("development demo catalogue", () => {
  it("contains 20 fictional restaurants and 20 fictional pharmacies", () => {
    expect(demoData.partners.filter((partner) => partner.type === "restaurant")).toHaveLength(20);
    expect(demoData.partners.filter((partner) => partner.type === "pharmacy")).toHaveLength(20);
    expect(new Set(demoData.partners.map((partner) => partner.slug)).size).toBe(40);
    expect(demoData.partners.every((partner) => partner.name.startsWith("TEST - "))).toBe(true);
  });

  it("gives every establishment 8-12 bilingual products with nonnegative final prices", () => {
    for (const partner of demoData.partners) {
      const products = demoData.catalogues[partner.catalogue];
      expect(products.length).toBeGreaterThanOrEqual(8);
      expect(products.length).toBeLessThanOrEqual(12);
      for (const product of products) {
        expect(Number.isSafeInteger(product.price)).toBe(true);
        expect(product.price).toBeGreaterThan(0);
        expect(typeof product.available).toBe("boolean");
        expect(product.name.fr).toBeTruthy();
        expect(product.name.en).toBeTruthy();
        expect(product.options.every((option) => product.price + option.price_delta >= 0)).toBe(true);
      }
    }
  });

  it("keeps pharmacies limited to non-medicinal hygiene and personal-care items", () => {
    const forbiddenText = /\b(médicament|medicament|medicine|medication|posologie|dosage|antibiotique|antibiotic|paracétamol|paracetamol|ibuprofène|ibuprofen|traitement|treatment|guérir|cure)\b/i;
    for (const partner of demoData.partners.filter((entry) => entry.type === "pharmacy")) {
      for (const product of demoData.catalogues[partner.catalogue]) {
        expect(`${product.name.fr} ${product.name.en} ${product.description.fr} ${product.description.en}`).not.toMatch(forbiddenText);
      }
    }
  });

  it("includes varied hours, a minimum basket, a closed shop, and an exceptional closure", () => {
    expect(demoData.partners.some((partner) => partner.minimum_order > 0)).toBe(true);
    expect(demoData.partners.some((partner) => partner.hours === "closed")).toBe(true);
    expect(demoData.partners.some((partner) => partner.hours === "all_day")).toBe(true);
    expect(demoData.exceptional_closure.days).toBeGreaterThan(0);
    expect(demoData.partners.some((partner) => partner.slug === demoData.exceptional_closure.partner_slug)).toBe(true);
    expect(new Set(demoData.partners.map((partner) => partner.hours)).size).toBeGreaterThan(3);
  });
});
