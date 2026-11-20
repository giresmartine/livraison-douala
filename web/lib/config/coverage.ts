export const doualaCoverage = {
  city: "Douala",
  bounds: {
    south: 3.7407169,
    north: 4.2252363,
    west: 9.3361339,
    east: 9.8644121,
  },
} as const;

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type DeliveryAddress = {
  city: string;
  neighborhood: string;
  landmark: string;
  coordinates?: Coordinates;
};

export type DeliveryAddressValidation =
  | { accepted: true }
  | { accepted: false; reason: "outside-city" | "outside-bounds" | "incomplete" };

export function isWithinDoualaCoverage({ latitude, longitude }: Coordinates) {
  const { bounds } = doualaCoverage;
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east;
}

export function validateDeliveryAddress(
  address: DeliveryAddress,
): DeliveryAddressValidation {
  if (address.city.trim().toLocaleLowerCase() !== doualaCoverage.city.toLocaleLowerCase()) {
    return { accepted: false, reason: "outside-city" };
  }

  if (!address.neighborhood.trim() || !address.landmark.trim()) {
    return { accepted: false, reason: "incomplete" };
  }

  if (address.coordinates && !isWithinDoualaCoverage(address.coordinates)) {
    return { accepted: false, reason: "outside-bounds" };
  }

  return { accepted: true };
}
