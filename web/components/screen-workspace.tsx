"use client";

import { useSyncExternalStore } from "react";
import { ProductScreen } from "@/components/product-screen";
import type { Locale, ScreenDefinition } from "@/lib/screens";

function subscribeToAddress() {
  return () => {};
}

function getSavedAddress() {
  try {
    const saved = sessionStorage.getItem("delivery-address-draft");
    if (!saved) return "";

    try {
      const parsed: unknown = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        const draft = parsed as Record<string, unknown>;
        if (typeof draft.neighborhood === "string") {
          return [draft.neighborhood, draft.landmark]
            .filter((value): value is string => typeof value === "string" && value.length > 0)
            .join(" · ");
        }
      }
    } catch {
      return saved;
    }

    return saved;
  } catch {
    return "";
  }
}

function getServerAddress() {
  return "";
}

export function ScreenWorkspace({
  locale,
  screen,
}: {
  locale: Locale;
  screen: ScreenDefinition;
}) {
  const selectedAddress = useSyncExternalStore(
    subscribeToAddress,
    getSavedAddress,
    getServerAddress,
  );

  return <ProductScreen address={selectedAddress} locale={locale} screen={screen} />;
}
