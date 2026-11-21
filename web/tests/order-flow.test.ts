import { describe, expect, it } from "vitest";
import {
  buildFeeQuoteOrderItems,
  parseGeographyPoint,
} from "@/lib/order-flow";

describe("fee quote order inputs", () => {
  it("sends catalogue identifiers only, never browser prices", () => {
    expect(buildFeeQuoteOrderItems([{
      product: { id: "product-1", price: 1 },
      quantity: 2,
      options: [{ id: "option-1", priceDelta: 1 }],
    }])).toEqual([{
      product_id: "product-1",
      qty: 2,
      option_ids: ["option-1"],
    }]);
  });

  it("parses PostGIS WKT and GeoJSON points in longitude-latitude order", () => {
    expect(parseGeographyPoint("POINT(9.667 4.056)")).toEqual({
      longitude: 9.667,
      latitude: 4.056,
    });
    expect(parseGeographyPoint({
      type: "Point",
      coordinates: [9.667, 4.056],
    })).toEqual({
      longitude: 9.667,
      latitude: 4.056,
    });
  });

  it("fails explicitly for malformed stored coordinates", () => {
    expect(() => parseGeographyPoint("LINESTRING(9.667 4.056)"))
      .toThrow("The saved delivery coordinates are invalid.");
  });
});
