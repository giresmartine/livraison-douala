import { describe, expect, it } from "vitest";
import {
  getNeighborhoodDeliveryFee,
  normalizeNeighborhoodName,
  type AddressSuggestions,
} from "../lib/address-suggestions";
import {
  isWithinDoualaCoverage,
  validateDeliveryAddress,
} from "../lib/config/coverage";

const suggestions: AddressSuggestions = {
  neighborhoods: [{
    id: "4a7771e7-f7a7-4ef1-8437-f5a4b2ef7b2a",
    name: "Akwa",
    deliveryFee: 750,
  }],
  frequentNeighborhoods: [],
  recentAddresses: [],
};

describe("Douala delivery address", () => {
  it("accepts a free-form neighbourhood without matching a suggestion", () => {
    expect(validateDeliveryAddress({
      city: "Douala",
      neighborhood: "Quartier inconnu",
      landmark: "Marché, portail bleu",
    })).toEqual({ accepted: true });
  });

  it("requires a neighbourhood and landmark for manual entry", () => {
    expect(validateDeliveryAddress({
      city: "Douala",
      neighborhood: "Akwa",
      landmark: "",
    })).toEqual({ accepted: false, reason: "incomplete" });
  });

  it("rejects GPS coordinates outside Douala coverage", () => {
    expect(isWithinDoualaCoverage({ latitude: 4.05, longitude: 11.52 })).toBe(false);
    expect(validateDeliveryAddress({
      city: "Douala",
      neighborhood: "Akwa",
      landmark: "Face à l'hôtel",
      coordinates: { latitude: 4.05, longitude: 11.52 },
    })).toEqual({ accepted: false, reason: "outside-bounds" });
  });

  it("matches neighbourhood names without accents or letter case", () => {
    expect(normalizeNeighborhoodName("  Bépanda  ")).toBe("bepanda");
    expect(getNeighborhoodDeliveryFee(" akwa ", suggestions)).toBe(750);
  });

  it("keeps an unknown neighbourhood valid when no fee is configured", () => {
    expect(getNeighborhoodDeliveryFee("Nouveau quartier", suggestions)).toBeNull();
  });
});
