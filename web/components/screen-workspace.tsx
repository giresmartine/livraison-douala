"use client";

import { useSyncExternalStore } from "react";
import { ProductScreen } from "@/components/product-screen";
import type { Locale, ScreenDefinition } from "@/lib/screens";

function subscribeToAddress() {
  return () => {};
}

function getSavedAddress() {
  try {
    return sessionStorage.getItem("delivery-address-draft") ?? "";
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
