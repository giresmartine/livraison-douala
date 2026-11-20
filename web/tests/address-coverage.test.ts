import { describe, expect, it } from "vitest";
import {
  getNeighborhoodDeliveryFee,
  normalizeNeighborhoodName,
  type AddressSuggestions,
} from "../lib/address-suggestions";
import {
  isClearlyFarFromDouala,
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

  it("accepts GPS coordinates within the provisional buffer around Douala", () => {
    expect(isWithinDoualaCoverage({ latitude: 4.055897, longitude: 9.6670278 })).toBe(true);
    expect(isWithinDoualaCoverage({ latitude: 4.24, longitude: 9.7871 })).toBe(true);
  });

  it("keeps manual Douala addresses valid when GPS is outside the provisional coverage", () => {
    const farCoordinates = { latitude: 3.6062, longitude: 9.6670278 };

    expect(isWithinDoualaCoverage(farCoordinates)).toBe(false);
    expect(isClearlyFarFromDouala(farCoordinates)).toBe(true);
    expect(validateDeliveryAddress({
      city: "Douala",
      neighborhood: "Quartier périphérique",
      landmark: "Repère connu",
      coordinates: farCoordinates,
    })).toEqual({ accepted: true });
  });

  it("uses the Douala boundary instead of accepting every point in its bounding box", () => {
    expect(isWithinDoualaCoverage({ latitude: 4.05, longitude: 9.8644 })).toBe(false);
    expect(isWithinDoualaCoverage({ latitude: 4.055897, longitude: 9.6670278 })).toBe(true);
    expect(isWithinDoualaCoverage({ latitude: 3.9167931, longitude: 9.3361339 })).toBe(true);
  });

  it("matches neighbourhood names without accents or letter case", () => {
    expect(normalizeNeighborhoodName("  Bépanda  ")).toBe("bepanda");
    expect(getNeighborhoodDeliveryFee(" akwa ", suggestions)).toBe(750);
  });

  it("keeps an unknown neighbourhood valid when no fee is configured", () => {
    expect(getNeighborhoodDeliveryFee("Nouveau quartier", suggestions)).toBeNull();
  });
});
