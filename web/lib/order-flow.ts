import { z } from "zod";
import type { Coordinates } from "@/lib/config/coverage";

const pointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number().finite(), z.number().finite()]),
});

export type FeeQuoteOrderItem = {
  product_id: string;
  qty: number;
  option_ids: string[];
};

type CartLineForOrder = {
  product: { id: string; price?: number };
  quantity: number;
  options: { id: string; priceDelta?: number }[];
};

export function buildFeeQuoteOrderItems(
  lines: readonly CartLineForOrder[],
): FeeQuoteOrderItem[] {
  return lines.map((line) => ({
    product_id: line.product.id,
    qty: line.quantity,
    option_ids: line.options.map((option) => option.id),
  }));
}

export function parseGeographyPoint(value: unknown): Coordinates | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const match = /^\s*(?:SRID=4326;)?POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)\s*$/i.exec(value);
    if (!match) throw new Error("The saved delivery coordinates are invalid.");

    return {
      longitude: Number(match[1]),
      latitude: Number(match[2]),
    };
  }

  const parsed = pointSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("The saved delivery coordinates are invalid.");
  }

  return {
    longitude: parsed.data.coordinates[0],
    latitude: parsed.data.coordinates[1],
  };
}
