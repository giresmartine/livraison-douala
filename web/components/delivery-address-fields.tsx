"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  addressSuggestionsSchema,
  emptyAddressSuggestions,
  getNeighborhoodDeliveryFee,
} from "@/lib/address-suggestions";
import { formatFcfa } from "@/lib/format-fcfa";

type Props = {
  neighborhood: string;
  landmark: string;
  onNeighborhoodChange: (value: string) => void;
  onLandmarkChange: (value: string) => void;
};

export function DeliveryAddressFields({
  neighborhood,
  landmark,
  onNeighborhoodChange,
  onLandmarkChange,
}: Props) {
  const t = useTranslations("home");
  const [suggestions, setSuggestions] = useState(emptyAddressSuggestions);
  const [suggestionsUnavailable, setSuggestionsUnavailable] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSuggestions() {
      try {
        const response = await fetch("/api/address-suggestions", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Address suggestions are unavailable.");

        const parsed = addressSuggestionsSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error("Address suggestions have an invalid format.");

        if (active) setSuggestions(parsed.data);
      } catch (error) {
        console.error("Could not load delivery-address suggestions.", error);
        if (active) setSuggestionsUnavailable(true);
      }
    }

    void loadSuggestions();
    return () => {
      active = false;
    };
  }, []);

  const deliveryFee = getNeighborhoodDeliveryFee(neighborhood, suggestions);

  return (
    <>
      <div className="address-field">
        <label className="field-label" htmlFor="delivery-neighborhood">
          {t("neighborhoodLabel")}
        </label>
        <input
          autoComplete="address-level3"
          className="address-input"
          id="delivery-neighborhood"
          list="douala-neighborhood-suggestions"
          maxLength={100}
          onChange={(event) => onNeighborhoodChange(event.target.value)}
          placeholder={t("neighborhoodPlaceholder")}
          required
          value={neighborhood}
        />
        <datalist id="douala-neighborhood-suggestions">
          {suggestions.neighborhoods.map((entry) => (
            <option key={entry.id} value={entry.name} />
          ))}
        </datalist>
      </div>

      <div className="address-field">
        <label className="field-label" htmlFor="delivery-landmark">
          {t("landmarkLabel")}
        </label>
        <input
          autoComplete="street-address"
          className="address-input"
          id="delivery-landmark"
          maxLength={200}
          onChange={(event) => onLandmarkChange(event.target.value)}
          placeholder={t("landmarkPlaceholder")}
          required
          value={landmark}
        />
      </div>

      {neighborhood.trim() && (
        <p className="delivery-fee-note" role="status">
          {deliveryFee === null
            ? t("deliveryFeePending")
            : t("deliveryFeeKnown", { amount: formatFcfa(deliveryFee) })}
        </p>
      )}

      {suggestionsUnavailable && (
        <p className="form-feedback" data-kind="error" role="status">
          {t("suggestionsUnavailable")}
        </p>
      )}

      {suggestions.frequentNeighborhoods.length > 0 && (
        <section className="address-suggestions" aria-label={t("frequentTitle")}>
          <p>{t("frequentTitle")}</p>
          <div className="address-suggestion-list">
            {suggestions.frequentNeighborhoods.map((name) => (
              <button
                key={name}
                onClick={() => onNeighborhoodChange(name)}
                type="button"
              >
                {name}
              </button>
            ))}
          </div>
        </section>
      )}

      {suggestions.recentAddresses.length > 0 && (
        <section className="address-suggestions" aria-label={t("recentTitle")}>
          <p>{t("recentTitle")}</p>
          <div className="address-suggestion-list">
            {suggestions.recentAddresses.map((address) => {
              const label = [address.neighborhood, address.landmark]
                .filter(Boolean)
                .join(" · ");
              return (
                <button
                  key={address.id}
                  onClick={() => {
                    onNeighborhoodChange(address.neighborhood);
                    onLandmarkChange(address.landmark);
                  }}
                  type="button"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>
      )}

    </>
  );
}
