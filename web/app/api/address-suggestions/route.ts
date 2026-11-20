import { z } from "zod";
import { addressSuggestionsSchema } from "@/lib/address-suggestions";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const neighborhoodRowsSchema = z.array(z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  zone_id: z.string().uuid().nullable(),
}));

const zoneRowsSchema = z.array(z.object({
  id: z.string().uuid(),
  delivery_fee: z.number().int().nonnegative(),
}));

const addressRowsSchema = z.array(z.object({
  id: z.string().uuid(),
  label: z.string().nullable(),
  neighborhood_id: z.string().uuid().nullable(),
  landmark: z.string().min(1),
}));

const emptySuggestions = {
  neighborhoods: [],
  frequentNeighborhoods: [],
  recentAddresses: [],
};

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET() {
  if (!isSupabaseConfigured) return jsonResponse(emptySuggestions);

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("Could not verify session for address suggestions.");
    return jsonResponse({ error: "Suggestions are temporarily unavailable." }, 503);
  }

  const { data: neighborhoodData, error: neighborhoodError } = await supabase
    .from("neighborhoods")
    .select("id, name, zone_id")
    .order("name")
    .limit(100);

  if (neighborhoodError) {
    console.error("Could not load public neighborhood suggestions.");
    return jsonResponse({ error: "Suggestions are temporarily unavailable." }, 503);
  }

  const parsedNeighborhoods = neighborhoodRowsSchema.safeParse(neighborhoodData ?? []);
  if (!parsedNeighborhoods.success) {
    console.error("Neighborhood suggestion data has an invalid shape.");
    return jsonResponse({ error: "Suggestions are temporarily unavailable." }, 503);
  }

  const zoneIds = [...new Set(
    parsedNeighborhoods.data
      .map((entry) => entry.zone_id)
      .filter((id): id is string => id !== null),
  )];
  const { data: zoneData, error: zoneError } = zoneIds.length
    ? await supabase
        .from("zones")
        .select("id, delivery_fee")
        .in("id", zoneIds)
        .eq("active", true)
    : { data: [], error: null };

  if (zoneError) {
    console.error("Could not load configured delivery fees.");
    return jsonResponse({ error: "Suggestions are temporarily unavailable." }, 503);
  }

  const parsedZones = zoneRowsSchema.safeParse(zoneData ?? []);
  if (!parsedZones.success) {
    console.error("Configured delivery-fee data has an invalid shape.");
    return jsonResponse({ error: "Suggestions are temporarily unavailable." }, 503);
  }
  const feeByZone = new Map(parsedZones.data.map((zone) => [zone.id, zone.delivery_fee]));

  let addressRows: z.infer<typeof addressRowsSchema> = [];
  if (user) {
    const { data, error } = await supabase
      .from("addresses")
      .select("id, label, neighborhood_id, landmark")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Could not load the current user's saved addresses.");
      return jsonResponse({ error: "Suggestions are temporarily unavailable." }, 503);
    }

    const parsedAddresses = addressRowsSchema.safeParse(data ?? []);
    if (!parsedAddresses.success) {
      console.error("Saved-address suggestion data has an invalid shape.");
      return jsonResponse({ error: "Suggestions are temporarily unavailable." }, 503);
    }
    addressRows = parsedAddresses.data;
  }

  const nameById = new Map(
    parsedNeighborhoods.data.map((entry) => [entry.id, entry.name]),
  );
  const neighborhoodCount = new Map<string, number>();
  for (const address of addressRows) {
    if (address.neighborhood_id) {
      neighborhoodCount.set(
        address.neighborhood_id,
        (neighborhoodCount.get(address.neighborhood_id) ?? 0) + 1,
      );
    }
  }

  const suggestions = {
    neighborhoods: parsedNeighborhoods.data.map((entry) => ({
      id: entry.id,
      name: entry.name,
      deliveryFee: entry.zone_id ? feeByZone.get(entry.zone_id) ?? null : null,
    })),
    frequentNeighborhoods: [...neighborhoodCount.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([id]) => nameById.get(id))
      .filter((name): name is string => Boolean(name)),
    recentAddresses: addressRows.slice(0, 5).map((address) => ({
      id: address.id,
      neighborhood:
        (address.neighborhood_id && nameById.get(address.neighborhood_id)) ||
        address.label ||
        "",
      landmark: address.landmark,
    })),
  };
  const parsedSuggestions = addressSuggestionsSchema.safeParse(suggestions);

  if (!parsedSuggestions.success) {
    console.error("Address suggestions could not be normalized.");
    return jsonResponse({ error: "Suggestions are temporarily unavailable." }, 503);
  }

  return jsonResponse(parsedSuggestions.data);
}
