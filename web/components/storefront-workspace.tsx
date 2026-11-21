"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { saveOrderAddress, submitFeeQuoteOrder } from "@/app/[locale]/order-actions";
import { doualaCoverage, isWithinDoualaCoverage } from "@/lib/config/coverage";
import type { Coordinates } from "@/lib/config/coverage";
import { buildFeeQuoteOrderItems } from "@/lib/order-flow";
import type { Locale, ScreenDefinition } from "@/lib/screens";
import type {
  StorefrontData,
  StorefrontOption,
  StorefrontOptionGroup,
  StorefrontPartner,
  StorefrontProduct,
} from "@/lib/storefront";

type PartnerMenu = {
  configured: boolean;
  partner: StorefrontPartner | null;
  sections: { id: string; name: string; sort: number }[];
  products: StorefrontProduct[];
};

type SearchResult = {
  id: string;
  partnerSlug: string;
  partnerName: string;
  partnerType: StorefrontPartner["type"];
  slug: string;
  name: string;
  description: string;
  price: number;
};

type CartLine = {
  product: StorefrontProduct;
  quantity: number;
  options: StorefrontOption[];
};

type Cart = {
  partnerSlug: string;
  partnerName: string;
  lines: CartLine[];
};

type DeliveryAddressSummary = {
  neighborhood: string;
  landmark: string;
};

const CART_STORAGE_KEY = "douala-cart-v1";
const DELIVERY_ADDRESS_ID_KEY = "delivery-address-id";
const ORDER_IDEMPOTENCY_KEY = "fee-quote-order-idempotency-v1";
const cartListeners = new Set<() => void>();
let cachedCartJson: string | null | undefined;
let cachedCartSnapshot: Cart | null = null;

function isCart(value: unknown): value is Cart {
  if (!value || typeof value !== "object") return false;
  const cart = value as Partial<Cart>;
  return typeof cart.partnerSlug === "string" &&
    typeof cart.partnerName === "string" &&
    Array.isArray(cart.lines) &&
    cart.lines.every((line) =>
      line &&
      typeof line.product?.id === "string" &&
      typeof line.product.price === "number" &&
      Number.isInteger(line.quantity) &&
      line.quantity > 0 &&
      Array.isArray(line.options) &&
      line.options.every((option) =>
        option &&
        typeof option.id === "string" &&
        typeof option.name === "string" &&
        typeof option.priceDelta === "number",
      ),
    );
}

function getCartSnapshot(): Cart | null {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved === cachedCartJson) return cachedCartSnapshot;
    cachedCartJson = saved;
    const parsed: unknown = saved ? JSON.parse(saved) : null;
    cachedCartSnapshot = isCart(parsed) ? parsed : null;
    return cachedCartSnapshot;
  } catch (error) {
    console.error("Could not restore the saved cart.", error);
    cachedCartJson = null;
    cachedCartSnapshot = null;
    return null;
  }
}

function getServerCartSnapshot() {
  return null;
}

function subscribeToCart(listener: () => void) {
  cartListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    cartListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function persistCart(cart: Cart | null) {
  const json = cart ? JSON.stringify(cart) : null;
  if (json) localStorage.setItem(CART_STORAGE_KEY, json);
  else localStorage.removeItem(CART_STORAGE_KEY);
  cachedCartJson = json;
  cachedCartSnapshot = cart;
  cartListeners.forEach((listener) => listener());
}

function cartLineKey(line: CartLine) {
  return `${line.product.id}:${line.options.map((option) => option.id).sort().join(",")}`;
}

function formatPrice(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en", {
    maximumFractionDigits: 0,
  }).format(amount);
}

function CatalogCard({
  partner,
  locale,
}: {
  partner: StorefrontPartner;
  locale: Locale;
}) {
  const english = locale === "en";
  return (
    <Link
      className="storefront-partner-card"
      href={`/${locale}/${partner.type === "pharmacy" ? "pharmacie" : "e"}/${partner.slug}`}
    >
      <div className="storefront-banner" aria-hidden="true">
        <span className="storefront-card-mark">
          {partner.type === "pharmacy" ? "+" : partner.name.slice(0, 1).toUpperCase()}
        </span>
        <span className={partner.isOpen ? "storefront-delay is-open" : "storefront-delay"}>
          {partner.isOpen ? english ? "Open" : "Ouvert" : english ? "Closed" : "Fermé"}
        </span>
      </div>
      <div className="storefront-card-content">
        <h3>{partner.name}</h3>
        {partner.description && <p>{partner.description}</p>}
        <div className="storefront-meta">
          <span>
            {partner.hours.length > 0
              ? `${english ? "Today" : "Aujourd’hui"} · ${partner.hours.join(", ")}`
              : english ? "Hours not provided" : "Horaires non renseignés"}
          </span>
          {partner.rating !== null && (
            <span>{partner.rating.toFixed(1)} · {partner.ratingCount}</span>
          )}
          {partner.minimumOrder !== null && (
            <span>{english ? "Min." : "Min."} {formatPrice(partner.minimumOrder, locale)} FCFA</span>
          )}
        </div>
        {partner.tags.length > 0 && (
          <div className="storefront-tags">
            {partner.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        )}
      </div>
    </Link>
  );
}

function InfoMessage({ children }: { children: React.ReactNode }) {
  return <div className="storefront-message" role="status">{children}</div>;
}

function CartPanel({
  cart,
  locale,
  updateQuantity,
  clearCart,
}: {
  cart: Cart | null;
  locale: Locale;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
}) {
  const english = locale === "en";
  const subtotal = cart?.lines.reduce(
    (total, line) =>
      total + (line.product.price + line.options.reduce((sum, option) => sum + option.priceDelta, 0)) * line.quantity,
    0,
  ) ?? 0;

  if (!cart || cart.lines.length === 0) {
    return (
      <InfoMessage>
        {english ? "Your cart is empty. Choose a verified shop to get started." : "Ton panier est vide. Choisis une enseigne vérifiée pour commencer."}
        {" "}
        <Link href={`/${locale}/restaurants`}>{english ? "Browse restaurants" : "Voir les restaurants"}</Link>
      </InfoMessage>
    );
  }

  return (
    <div className="storefront-cart">
      <div className="storefront-cart-heading">
        <div>
          <p className="eyebrow">{english ? "ONE SHOP PER CART" : "UNE ENSEIGNE PAR PANIER"}</p>
          <h2>{cart.partnerName}</h2>
        </div>
        <button className="storefront-text-button" onClick={clearCart} type="button">
          {english ? "Clear cart" : "Vider le panier"}
        </button>
      </div>
      <ul className="storefront-cart-lines">
        {cart.lines.map((line) => {
          const unitPrice = line.product.price + line.options.reduce((sum, option) => sum + option.priceDelta, 0);
          return (
            <li className="storefront-cart-line" key={cartLineKey(line)}>
              <div>
                <strong>{line.product.name}</strong>
                {line.options.length > 0 && (
                  <small>{line.options.map((option) => option.name).join(", ")}</small>
                )}
                <span>{formatPrice(unitPrice, locale)} FCFA</span>
              </div>
              <div className="storefront-quantity">
                <button
                  aria-label={english ? `Remove one ${line.product.name}` : `Retirer un ${line.product.name}`}
                  onClick={() => updateQuantity(cartLineKey(line), line.quantity - 1)}
                  type="button"
                >−</button>
                <span>{line.quantity}</span>
                <button
                  aria-label={english ? `Add one ${line.product.name}` : `Ajouter un ${line.product.name}`}
                  onClick={() => updateQuantity(cartLineKey(line), line.quantity + 1)}
                  type="button"
                >+</button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="storefront-subtotal">
        <span>{english ? "Items subtotal" : "Sous-total des articles"}</span>
        <strong>{formatPrice(subtotal, locale)} FCFA</strong>
      </div>
      <p className="storefront-footnote">
        {english
          ? "Delivery fee and final total are not available until a real delivery zone and server quote are configured."
          : "Les frais de livraison et le total final seront connus uniquement après configuration d’une vraie zone et d’un devis serveur."}
      </p>
      <InfoMessage>
        {english
          ? "Checkout is unavailable: delivery coverage, pricing and payment provider are not configured."
          : "La commande est indisponible : la couverture, les tarifs et le prestataire de paiement ne sont pas configurés."}
      </InfoMessage>
      <Link className="storefront-back-link" href={`/${locale}/commande/livraison`}>
        {english ? "Enter delivery address (draft only)" : "Saisir une adresse de livraison (brouillon seulement)"}
      </Link>
    </div>
  );
}

function ProductChoices({
  groups,
  locale,
  onAdd,
}: {
  groups: StorefrontOptionGroup[];
  locale: Locale;
  onAdd: (options: StorefrontOption[]) => void;
}) {
  const english = locale === "en";
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const isValid = groups.every((group) => {
    const count = selected[group.id]?.length ?? 0;
    return count >= group.minSelect && count <= group.maxSelect;
  });
  const selectedOptions = groups.flatMap((group) =>
    group.options.filter((option) => selected[group.id]?.includes(option.id)),
  );

  function toggleOption(group: StorefrontOptionGroup, option: StorefrontOption) {
    const current = selected[group.id] ?? [];
    const next = current.includes(option.id)
      ? current.filter((id) => id !== option.id)
      : group.maxSelect === 1
        ? [option.id]
        : current.length < group.maxSelect
          ? [...current, option.id]
          : current;
    setSelected((previous) => ({ ...previous, [group.id]: next }));
  }

  return (
    <div className="storefront-choices">
      {groups.map((group) => (
        <fieldset className="storefront-option-group" key={group.id}>
          <legend>
            {group.name}
            <small>
              {group.minSelect > 0
                ? english ? ` · Choose at least ${group.minSelect}` : ` · Choix minimum : ${group.minSelect}`
                : english ? " · Optional" : " · Facultatif"}
            </small>
          </legend>
          {group.options.length === 0 && (
            <p className="storefront-footnote">{english ? "No verified options available." : "Aucune option vérifiée disponible."}</p>
          )}
          {group.options.map((option) => {
            const checked = selected[group.id]?.includes(option.id) ?? false;
            return (
              <label className="storefront-option" key={option.id}>
                <input
                  checked={checked}
                  onChange={() => toggleOption(group, option)}
                  type={group.maxSelect === 1 ? "radio" : "checkbox"}
                  name={group.id}
                />
                <span>{option.name}</span>
                {option.priceDelta !== 0 && (
                  <small>
                    {option.priceDelta > 0 ? "+" : ""}
                    {formatPrice(option.priceDelta, locale)} FCFA
                  </small>
                )}
              </label>
            );
          })}
        </fieldset>
      ))}
      <button
        className="storefront-primary-button"
        disabled={!isValid}
        onClick={() => onAdd(selectedOptions)}
        type="button"
      >
        {english ? "Add to cart" : "Ajouter au panier"}
      </button>
    </div>
  );
}

export function StorefrontWorkspace({
  locale,
  screen,
  path,
  listing,
  menu,
  searchPartners,
  searchResults,
  searchQuery,
}: {
  locale: Locale;
  screen: ScreenDefinition;
  path: string[];
  listing?: StorefrontData;
  menu?: PartnerMenu;
  searchPartners?: StorefrontPartner[];
  searchResults?: SearchResult[];
  searchQuery?: string;
}) {
  const english = locale === "en";
  const router = useRouter();
  const cart = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot);
  const [cartError, setCartError] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliveryPending, setDeliveryPending] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [gpsOutsideCoverage, setGpsOutsideCoverage] = useState(false);
  const [deliverySummary, setDeliverySummary] = useState<DeliveryAddressSummary | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderPending, setOrderPending] = useState(false);
  const [search, setSearch] = useState(searchQuery ?? "");

  useEffect(() => {
    if (screen.id !== "S-17") return;
    const timer = window.setTimeout(() => {
      try {
        const stored = sessionStorage.getItem("delivery-address-draft");
        const parsed: unknown = stored ? JSON.parse(stored) : null;
        if (
          parsed &&
          typeof parsed === "object" &&
          "neighborhood" in parsed &&
          typeof parsed.neighborhood === "string" &&
          "landmark" in parsed &&
          typeof parsed.landmark === "string"
        ) {
          setDeliverySummary({
            neighborhood: parsed.neighborhood,
            landmark: parsed.landmark,
          });
        }
      } catch {
        console.error("Could not restore the delivery address summary.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [screen.id]);

  function updateCart(next: Cart | null) {
    try {
      persistCart(next);
      setCartError(false);
    } catch (error) {
      console.error("Could not save the cart on this device.", error);
      setCartError(true);
    }
  }

  const selectedProduct = useMemo(() => {
    if (!menu || screen.id !== "S-12") return null;
    const slug = path[3];
    return slug ? menu.products.find((product) => product.slug === slug) ?? null : null;
  }, [menu, path, screen.id]);

  function addToCart(
    product: StorefrontProduct,
    partner: StorefrontPartner,
    options: StorefrontOption[] = [],
  ) {
    if (!partner.canOrder) return;
    const current = cart;
    if (current && current.partnerSlug !== partner.slug) {
      const shouldReplace = window.confirm(
        english
          ? "Your cart contains items from another shop. Replace it?"
          : "Ton panier contient une autre enseigne. Le remplacer ?",
      );
      if (!shouldReplace) return;
      updateCart({ partnerSlug: partner.slug, partnerName: partner.name, lines: [{ product, quantity: 1, options }] });
      return;
    }

    const existing = current?.lines.find((line) =>
      line.product.id === product.id &&
      line.options.map((option) => option.id).sort().join(",") === options.map((option) => option.id).sort().join(","),
    );
    if (existing && current) {
      updateCart({
        ...current,
        lines: current.lines.map((line) => line === existing ? { ...line, quantity: line.quantity + 1 } : line),
      });
      return;
    }
    updateCart({
      partnerSlug: partner.slug,
      partnerName: partner.name,
      lines: [...(current?.lines ?? []), { product, quantity: 1, options }],
    });
  }

  async function saveDeliveryDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (gpsOutsideCoverage) {
      setDeliveryError("outside_coverage");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const draft = {
      city: doualaCoverage.city,
      neighborhood: String(formData.get("neighborhood") ?? "").trim(),
      landmark: String(formData.get("landmark") ?? "").trim(),
      details: String(formData.get("details") ?? "").trim(),
    };

    setDeliveryPending(true);
    setDeliveryError(null);
    try {
      const result = await saveOrderAddress({
        ...draft,
        coordinates,
      });
      if (!result.ok) {
        setDeliveryError(result.code);
        return;
      }
      sessionStorage.setItem("delivery-address-draft", JSON.stringify(draft));
      sessionStorage.setItem(DELIVERY_ADDRESS_ID_KEY, result.addressId);
      router.push(`/${locale}/commande/recapitulatif`);
    } catch {
      console.error("Could not save the delivery address.");
      setDeliveryError("address_save_failed");
    } finally {
      setDeliveryPending(false);
    }
  }

  function requestLocation() {
    setLocationError(false);
    if (!navigator.geolocation) {
      setLocationError(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords: position }) => {
        const current = {
          latitude: position.latitude,
          longitude: position.longitude,
        };
        if (!isWithinDoualaCoverage(current)) {
          setCoordinates(null);
          setGpsOutsideCoverage(true);
          setLocationError(true);
          return;
        }
        setCoordinates(current);
        setGpsOutsideCoverage(false);
        setLocationError(false);
      },
      () => setLocationError(true),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async function submitOrder() {
    if (!cart || cart.lines.length === 0) return;
    setOrderPending(true);
    setOrderError(null);

    try {
      const addressId = sessionStorage.getItem(DELIVERY_ADDRESS_ID_KEY);
      if (!addressId) {
        setOrderError("delivery_address_unavailable");
        return;
      }
      const items = buildFeeQuoteOrderItems(cart.lines);
      const fingerprint = JSON.stringify({ addressId, items });
      const stored = sessionStorage.getItem(ORDER_IDEMPOTENCY_KEY);
      let idempotencyKey: string;
      if (stored) {
        let previous: unknown;
        try {
          previous = JSON.parse(stored);
        } catch {
          console.error("Could not read the order idempotency record.");
          setOrderError("idempotency_key_unavailable");
          return;
        }
        if (
          !previous ||
          typeof previous !== "object" ||
          !("fingerprint" in previous) ||
          typeof previous.fingerprint !== "string" ||
          !("key" in previous) ||
          typeof previous.key !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(previous.key)
        ) {
          console.error("The order idempotency record is invalid.");
          setOrderError("idempotency_key_unavailable");
          return;
        }
        if (previous.fingerprint === fingerprint) {
          idempotencyKey = previous.key;
        } else {
          idempotencyKey = crypto.randomUUID();
          sessionStorage.setItem(ORDER_IDEMPOTENCY_KEY, JSON.stringify({ fingerprint, key: idempotencyKey }));
        }
      } else {
        idempotencyKey = crypto.randomUUID();
        sessionStorage.setItem(ORDER_IDEMPOTENCY_KEY, JSON.stringify({ fingerprint, key: idempotencyKey }));
      }

      const result = await submitFeeQuoteOrder({
        locale,
        addressId,
        idempotencyKey,
        items,
      });
      if (!result.ok) {
        setOrderError(result.code);
        return;
      }
      updateCart(null);
      sessionStorage.removeItem("delivery-address-draft");
      sessionStorage.removeItem(DELIVERY_ADDRESS_ID_KEY);
      sessionStorage.removeItem(ORDER_IDEMPOTENCY_KEY);
      router.push(`/${locale}/commande/apercu/suivi?order=${result.orderId}`);
    } catch {
      console.error("Could not submit the fee quote order.");
      setOrderError("order_submission_failed");
    } finally {
      setOrderPending(false);
    }
  }

  const liveCatalogueConfigured = listing?.configured ?? menu?.configured ?? false;
  const emptyListMessage = liveCatalogueConfigured
    ? english
      ? "No verified shops are available in the connected catalogue yet."
      : "Aucune enseigne vérifiée n’est encore disponible dans le catalogue connecté."
    : english
      ? "The live catalogue is not configured. No sample shops or products are shown."
      : "Le catalogue réel n’est pas configuré. Aucun commerce ni produit fictif n’est affiché.";

  if (screen.id === "S-13" || screen.id === "S-14") {
    return (
      <main className="storefront-page page-shell">
        <StorefrontHeader locale={locale} title={screen.title[locale]} />
        {cartError && (
          <InfoMessage>
            {english ? "The cart could not be saved on this device." : "Le panier n’a pas pu être enregistré sur cet appareil."}
          </InfoMessage>
        )}
        <CartPanel
          cart={cart}
          locale={locale}
          clearCart={() => updateCart(null)}
          updateQuantity={(lineKey, quantity) =>
            updateCart(cart && ({
              ...cart,
              lines: quantity <= 0
                ? cart.lines.filter((line) => cartLineKey(line) !== lineKey)
                : cart.lines.map((line) => cartLineKey(line) === lineKey ? { ...line, quantity } : line),
            }))
          }
        />
      </main>
    );
  }

  if (screen.id === "S-15") {
    return (
      <main className="storefront-page page-shell">
        <StorefrontHeader locale={locale} title={screen.title[locale]} />
        <InfoMessage>
          {english
            ? "Delivery is limited to Douala. Enter any neighbourhood; a location outside the service area will be refused. No delivery fee is calculated here."
            : "La livraison est limitée à Douala. Saisis librement ton quartier ; une position hors zone sera refusée. Aucun frais n’est calculé à cette étape."}
        </InfoMessage>
        <form className="storefront-delivery-form" onSubmit={saveDeliveryDraft}>
          <div className="storefront-form-field">
            <label htmlFor="delivery-city">{english ? "City" : "Ville"}</label>
            <input autoComplete="address-level2" id="delivery-city" name="city" readOnly value={doualaCoverage.city} />
          </div>
          <div className="storefront-form-field">
            <label htmlFor="delivery-neighborhood">{english ? "Neighbourhood" : "Quartier"}</label>
            <input autoComplete="address-level3" id="delivery-neighborhood" maxLength={100} name="neighborhood" required />
          </div>
          <div className="storefront-form-field">
            <label htmlFor="delivery-landmark">{english ? "Landmark / directions" : "Repère / indications"}</label>
            <input autoComplete="off" id="delivery-landmark" maxLength={200} name="landmark" required />
          </div>
          <div className="storefront-form-field">
            <label htmlFor="delivery-details">{english ? "Additional details (optional)" : "Complément d’adresse (facultatif)"}</label>
            <textarea autoComplete="off" id="delivery-details" maxLength={500} name="details" rows={3} />
          </div>
          <div className="storefront-form-field">
            <button className="storefront-small-link" onClick={requestLocation} type="button">
              {english ? "Use my current location" : "Utiliser ma position actuelle"}
            </button>
            {coordinates && (
              <span>{english ? "Location captured." : "Position enregistrée."}</span>
            )}
          </div>
          {locationError && (
            <InfoMessage>
              {english
                ? "Location is unavailable or outside Douala. Check the address and try again."
                : "La position est indisponible ou hors de Douala. Vérifie l’adresse puis réessaie."}
            </InfoMessage>
          )}
          {deliveryError && (
            <InfoMessage>
              {deliveryError === "outside_coverage"
                ? english ? "This location is outside our Douala service area." : "Cette position est hors de notre zone de livraison à Douala."
                : deliveryError === "auth_required"
                  ? english ? "Sign in to save a delivery address." : "Connecte-toi pour enregistrer une adresse de livraison."
                  : english ? "The address could not be saved. Please try again." : "L’adresse n’a pas pu être enregistrée. Réessaie."}
            </InfoMessage>
          )}
          <button className="storefront-primary-button" disabled={deliveryPending} type="submit">
            {deliveryPending
              ? english ? "Saving…" : "Enregistrement…"
              : english ? "Save address and continue" : "Enregistrer l’adresse et continuer"}
          </button>
        </form>
        <Link className="storefront-back-link" href={`/${locale}/paniers`}>
          {english ? "Back to cart" : "Retour au panier"}
        </Link>
      </main>
    );
  }

  if (screen.id === "S-16") {
    router.replace(`/${locale}/commande/recapitulatif`);
    return null;
  }

  if (screen.id === "S-17") {
    return (
      <main className="storefront-page page-shell">
        <StorefrontHeader locale={locale} title={screen.title[locale]} />
        {!cart || cart.lines.length === 0 ? (
          <>
            <InfoMessage>
              {english ? "Your cart is empty. No order has been created." : "Ton panier est vide. Aucune commande n’a été créée."}
            </InfoMessage>
            <Link className="storefront-back-link" href={`/${locale}/paniers`}>
              {english ? "Back to cart" : "Retour au panier"}
            </Link>
          </>
        ) : (
          <>
            <section className="storefront-menu-section">
              <h2>{cart.partnerName}</h2>
              <ul>
                {cart.lines.map((line) => (
                  <li key={cartLineKey(line)}>
                    {line.quantity} × {line.product.name}
                    {line.options.length > 0 && ` · ${line.options.map((option) => option.name).join(", ")}`}
                  </li>
                ))}
              </ul>
            </section>
            <section className="storefront-menu-section">
              <h2>{english ? "Delivery address" : "Adresse de livraison"}</h2>
              {deliverySummary
                ? <p>{deliverySummary.neighborhood} · {deliverySummary.landmark}</p>
                : <p>{english ? "Saved address" : "Adresse enregistrée"}</p>}
            </section>
            <InfoMessage>
              {english
                ? "Product prices are recalculated by the server when you submit. Delivery fees stay unconfirmed until an agent sends a quote. No payment is taken in this step."
                : "Les prix des articles sont recalculés par le serveur à l’envoi. Les frais de livraison restent à confirmer jusqu’au devis d’un agent. Aucun paiement n’est effectué à cette étape."}
            </InfoMessage>
            {orderError && (
              <InfoMessage>
              {orderError === "idempotency_key_unavailable"
                ? english
                  ? "This order cannot be retried safely. Check your tracking page before submitting another order."
                  : "Cette commande ne peut pas être relancée en toute sécurité. Vérifie le suivi avant d’en envoyer une autre."
                : orderError === "auth_required"
                  ? english ? "Sign in before submitting your order." : "Connecte-toi avant d’envoyer ta commande."
                  : orderError === "outside_coverage"
                    ? english ? "The saved location is outside Douala. Update the delivery address." : "La position enregistrée est hors de Douala. Modifie l’adresse de livraison."
                    : orderError === "partner_closed" || orderError === "partner_not_orderable"
                      ? english ? "This shop is no longer accepting orders. Your cart is unchanged." : "Cette enseigne ne prend plus de commandes. Ton panier est conservé."
                      : english ? "The order could not be submitted. Your cart is unchanged; please retry." : "La commande n’a pas pu être envoyée. Ton panier est conservé ; réessaie."}
              </InfoMessage>
            )}
            <div className="storefront-checkout-links">
              <Link className="storefront-back-link" href={`/${locale}/commande/livraison`}>
                {english ? "Edit delivery address" : "Modifier l’adresse de livraison"}
              </Link>
              <button className="storefront-primary-button" disabled={orderPending} onClick={submitOrder} type="button">
                {orderPending
                  ? english ? "Submitting…" : "Envoi…"
                  : english ? "Submit order — no payment" : "Envoyer la commande — sans paiement"}
              </button>
            </div>
          </>
        )}
      </main>
    );
  }

  if (screen.id === "S-07") {
    return (
      <main className="storefront-page page-shell">
        <StorefrontHeader locale={locale} title={screen.title[locale]} />
        <form className="storefront-search" action={`/${locale}/recherche`} method="get">
          <label htmlFor="storefront-search-input">{english ? "Search shops and dishes" : "Rechercher une enseigne ou un plat"}</label>
          <div>
            <input
              autoComplete="off"
              id="storefront-search-input"
              name="q"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={english ? "e.g. grilled fish" : "Ex. poisson braisé"}
              value={search}
            />
            <button className="storefront-primary-button" type="submit">{english ? "Search" : "Rechercher"}</button>
          </div>
        </form>
        {(searchPartners?.length ?? 0) > 0 && (
          <section className="storefront-search-section">
            <h2>{english ? "Shops" : "Enseignes"}</h2>
            {searchPartners?.map((partner) => <CatalogCard key={partner.id} partner={partner} locale={locale} />)}
          </section>
        )}
        {(searchResults?.length ?? 0) > 0 ? (
          <section className="storefront-search-section">
            <h2>{english ? "Dishes and products" : "Plats et produits"}</h2>
            <div className="storefront-product-grid">
              {searchResults?.map((product) => (
              <Link
                className="storefront-product-card"
                href={`/${locale}/${product.partnerType === "pharmacy" ? "pharmacie" : "e"}/${product.partnerSlug}/p/${product.slug}`}
                key={product.id}
              >
                <div className="storefront-product-placeholder" aria-hidden="true">D</div>
                <p className="eyebrow">{product.partnerName}</p>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <strong>{formatPrice(product.price, locale)} FCFA</strong>
              </Link>
              ))}
            </div>
          </section>
        ) : null}
        {(searchResults?.length ?? 0) === 0 && (searchPartners?.length ?? 0) === 0 && (
          <InfoMessage>
            {search
              ? listing && !listing.configured
                ? emptyListMessage
                : english ? "No verified product matches this search." : "Aucun produit vérifié ne correspond à cette recherche."
              : emptyListMessage}
          </InfoMessage>
        )}
      </main>
    );
  }

  if (screen.id === "S-08" || screen.id === "S-09" || screen.id === "S-12") {
    if (!menu?.configured || !menu.partner) {
      return (
        <main className="storefront-page page-shell">
          <StorefrontHeader locale={locale} title={screen.title[locale]} />
          <InfoMessage>{emptyListMessage}</InfoMessage>
          <Link className="storefront-back-link" href={`/${locale}/${screen.id === "S-09" ? "pharmacies" : "restaurants"}`}>
            {english ? "Back to shops" : "Retour aux enseignes"}
          </Link>
        </main>
      );
    }

    const { partner } = menu;
    const partnerPath = partner.type === "pharmacy" ? "pharmacie" : "e";
    if (screen.id === "S-12" && selectedProduct) {
      return (
        <main className="storefront-page page-shell">
          <StorefrontHeader locale={locale} title={partner.name} />
          <Link className="storefront-back-link" href={`/${locale}/${partnerPath}/${partner.slug}`}>
            ← {english ? "Back to menu" : "Retour au menu"}
          </Link>
          <section className="storefront-product-detail">
            <p className="eyebrow">{partner.name}</p>
            <h1>{selectedProduct.name}</h1>
            <p>{selectedProduct.description}</p>
            <strong className="storefront-detail-price">{formatPrice(selectedProduct.price, locale)} FCFA</strong>
            {selectedProduct.requiresAgeCheck && (
              <InfoMessage>
                {english
                  ? "Age verification is required; this item cannot be added to the cart yet."
                  : "Une vérification d’âge est requise ; cet article ne peut pas encore être ajouté au panier."}
              </InfoMessage>
            )}
            {!partner.canOrder && (
              <InfoMessage>{english ? "This shop is closed for ordering now." : "Cette enseigne ne prend pas de commandes actuellement."}</InfoMessage>
            )}
            {!selectedProduct.requiresAgeCheck && partner.canOrder && (
              selectedProduct.optionGroups.length > 0
                ? <ProductChoices groups={selectedProduct.optionGroups} locale={locale} onAdd={(options) => addToCart(selectedProduct, partner, options)} />
                : <button className="storefront-primary-button" onClick={() => addToCart(selectedProduct, partner)} type="button">
                    {english ? "Add to cart" : "Ajouter au panier"}
                  </button>
            )}
          </section>
        </main>
      );
    }

    return (
      <main className="storefront-page page-shell">
        <StorefrontHeader locale={locale} title={partner.name} />
        <section className="storefront-shop-heading">
          <div className="storefront-banner storefront-banner-wide" aria-hidden="true" />
          <div>
            <p className="eyebrow">{partner.type === "pharmacy" ? english ? "PHARMACY" : "PHARMACIE" : english ? "RESTAURANT" : "RESTAURANT"}</p>
            <h1>{partner.name}</h1>
            {partner.description && <p>{partner.description}</p>}
            <div className="storefront-meta">
              <span>{partner.isOpen ? english ? "Open now" : "Ouvert maintenant" : english ? "Closed" : "Fermé"}</span>
              <span>{partner.hours.length ? partner.hours.join(", ") : english ? "Hours not provided" : "Horaires non renseignés"}</span>
              {partner.minimumOrder !== null && <span>{english ? "Minimum" : "Minimum"} {formatPrice(partner.minimumOrder, locale)} FCFA</span>}
            </div>
          </div>
          <span className={partner.canOrder ? "storefront-status is-open" : "storefront-status"}>
            {partner.canOrder ? english ? "Ordering open" : "Commande ouverte" : english ? "Ordering unavailable" : "Commande indisponible"}
          </span>
        </section>
        {!partner.canOrder && (
          <InfoMessage>{english ? "You can browse this menu, but this shop is not accepting orders now." : "Tu peux consulter ce menu, mais cette enseigne ne prend pas de commandes actuellement."}</InfoMessage>
        )}
        {menu.products.length === 0 ? (
          <InfoMessage>
            {english
              ? "This verified shop has no available non-medicine items in its live menu."
              : "Cette enseigne vérifiée n’a aucun article non médical disponible dans son menu réel."}
          </InfoMessage>
        ) : (
          [
            ...menu.sections,
            ...(menu.products.some((product) => product.sectionId === null)
              ? [{ id: "__unsectioned", name: english ? "Other items" : "Autres articles", sort: Number.MAX_SAFE_INTEGER }]
              : []),
          ].map((section) => {
            const products = menu.products.filter((product) =>
              section.id === "__unsectioned"
                ? product.sectionId === null
                : product.sectionId === section.id,
            );
            if (products.length === 0) return null;
            return (
              <section className="storefront-menu-section" key={section.id}>
                <h2>{section.name}</h2>
                <div className="storefront-product-grid">
                  {products.map((product) => (
                    <article className="storefront-product-card" key={product.id}>
                      <Link href={`/${locale}/${partnerPath}/${partner.slug}/p/${product.slug}`}>
                        <div className="storefront-product-placeholder" aria-hidden="true">D</div>
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>
                      </Link>
                      <div className="storefront-product-footer">
                        <strong>
                          {formatPrice(product.price, locale)} FCFA
                          {product.compareAtPrice !== null && product.compareAtPrice > product.price && (
                            <del className="storefront-compare-price">{formatPrice(product.compareAtPrice, locale)}</del>
                          )}
                        </strong>
                        {product.requiresAgeCheck ? (
                          <span className="storefront-age-note">{english ? "Age check required" : "Vérification d’âge"}</span>
                        ) : (
                          <Link
                            className="storefront-small-link"
                            href={`/${locale}/${partnerPath}/${partner.slug}/p/${product.slug}`}
                          >
                            {product.optionGroups.length > 0
                              ? english ? "Customize" : "Personnaliser"
                              : english ? "View item" : "Voir l’article"}
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })
        )}
        <Link className="storefront-cart-link" href={`/${locale}/paniers`}>
          {english ? "View cart" : "Voir le panier"}
          {cart && <span>{cart.lines.reduce((sum, line) => sum + line.quantity, 0)}</span>}
        </Link>
      </main>
    );
  }

  const partners = listing?.configured ? listing.partners : [];
  const filteredPartners = screen.id === "S-05"
    ? partners.filter((partner) => partner.type === "restaurant")
    : screen.id === "S-06"
      ? partners.filter((partner) => partner.type === "pharmacy")
      : partners;

  return (
    <main className="storefront-page page-shell">
      <StorefrontHeader locale={locale} title={screen.title[locale]} />
      {!listing?.configured && <InfoMessage>{emptyListMessage}</InfoMessage>}
      {listing?.configured && filteredPartners.length === 0 && <InfoMessage>{emptyListMessage}</InfoMessage>}
      <div className="storefront-grid">
        {filteredPartners.map((partner) => <CatalogCard key={partner.id} partner={partner} locale={locale} />)}
      </div>
      {listing?.configured && listing.categories.length > 0 && (
        <section className="storefront-categories">
          <h2>{english ? "Browse categories" : "Parcourir les catégories"}</h2>
          <div>
            {listing.categories.map((category) => (
              <span className="storefront-category-chip" key={category.slug}>
                {category.icon && <span aria-hidden="true">{category.icon}</span>}
                {category.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function StorefrontHeader({ locale, title }: { locale: Locale; title: string }) {
  const english = locale === "en";
  return (
    <header className="storefront-header">
      <Link className="gallery-brand" href={`/${locale}`}>
        <span className="brand-symbol" aria-hidden="true">D</span>
        <span>
          <strong>{english ? "Delivery · Now" : "Livraison · Maintenant"}</strong>
          <small>{title}</small>
        </span>
      </Link>
      <nav aria-label={english ? "Customer navigation" : "Navigation client"}>
        <Link href={`/${locale}/recherche`}>{english ? "Search" : "Recherche"}</Link>
        <Link href={`/${locale}/restaurants`}>{english ? "Restaurants" : "Restaurants"}</Link>
        <Link href={`/${locale}/pharmacies`}>{english ? "Pharmacies" : "Pharmacies"}</Link>
        <Link href={`/${locale}/paniers`}>{english ? "Cart" : "Panier"}</Link>
        <Link href={`/${locale}/compte`}>{english ? "Account" : "Compte"}</Link>
      </nav>
    </header>
  );
}
