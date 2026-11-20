import { z } from "zod";

export const addressSuggestionsSchema = z.object({
  neighborhoods: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    deliveryFee: z.number().int().nonnegative().nullable(),
  })),
  frequentNeighborhoods: z.array(z.string().min(1)),
  recentAddresses: z.array(z.object({
    id: z.string().uuid(),
    neighborhood: z.string(),
    landmark: z.string().min(1),
  })),
});

export type AddressSuggestions = z.infer<typeof addressSuggestionsSchema>;

export const emptyAddressSuggestions: AddressSuggestions = {
  neighborhoods: [],
  frequentNeighborhoods: [],
  recentAddresses: [],
};

export function normalizeNeighborhoodName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

export function getNeighborhoodDeliveryFee(
  neighborhood: string,
  suggestions: AddressSuggestions,
) {
  const normalizedNeighborhood = normalizeNeighborhoodName(neighborhood);
  if (!normalizedNeighborhood) return null;

  return suggestions.neighborhoods.find(
    (entry) => normalizeNeighborhoodName(entry.name) === normalizedNeighborhood,
  )?.deliveryFee ?? null;
}
