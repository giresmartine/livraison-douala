import { describe, expect, it } from "vitest";
import { getPartnerAvailability } from "../lib/storefront";
import { getScreenByPath } from "../lib/screens";

const partnerId = "6a08b43e-7400-4bfc-a0be-f19d646dd4e0";
const overnightThursday = [{
  partner_id: partnerId,
  weekday: 4,
  opens_at: "22:00:00",
  closes_at: "02:00:00",
  last_order_before_close: 20,
}];

describe("partner opening hours", () => {
  it("keeps an overnight opening active after midnight in Douala", () => {
    expect(
      getPartnerAvailability(partnerId, overnightThursday, new Date("2026-01-02T00:30:00Z")),
    ).toMatchObject({ isOpen: true, canOrder: true });
  });

  it("stops orders before closing while still showing the shop as open", () => {
    expect(
      getPartnerAvailability(partnerId, overnightThursday, new Date("2026-01-02T00:50:00Z")),
    ).toMatchObject({ isOpen: true, canOrder: false });
  });

  it("does not mistake the opening weekday morning for an overnight opening", () => {
    expect(
      getPartnerAvailability(partnerId, overnightThursday, new Date("2026-01-01T00:30:00Z")),
    ).toMatchObject({ isOpen: false, canOrder: false });
  });
});

describe("storefront routes", () => {
  it("resolves real shop, pharmacy, product and cart paths", () => {
    expect(getScreenByPath("e/restaurant-demo")?.id).toBe("S-08");
    expect(getScreenByPath("pharmacie/pharmacy-demo")?.id).toBe("S-09");
    expect(getScreenByPath("e/restaurant-demo/p/item-demo")?.id).toBe("S-12");
    expect(getScreenByPath("panier/restaurant-demo")?.id).toBe("S-14");
    expect(getScreenByPath("paniers")?.id).toBe("S-13");
    expect(getScreenByPath("commande/livraison")?.id).toBe("S-15");
    expect(getScreenByPath("commande/offres")?.id).toBe("S-16");
  });
});
