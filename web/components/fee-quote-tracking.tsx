"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptFeeQuote, cancelFeeQuote } from "@/app/[locale]/order-actions";
import type { Locale } from "@/lib/screens";

type FeeQuoteOrder = {
  id: string;
  status: string;
  subtotal: number;
  delivery_fee: number | null;
  total: number;
  quote_version: number;
  quote_expires_at: string | null;
  quote_replacement_deadline_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  partner_name: string | null;
  delivery_address: {
    neighborhood: string | null;
    landmark: string;
    details: string | null;
  } | null;
  items: {
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    options: { id: string; name: string; price_delta: number }[];
  }[];
};

function formatPrice(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en", {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function FeeQuoteTracking({
  detail = false,
  locale,
  order,
}: {
  detail?: boolean;
  locale: Locale;
  order: FeeQuoteOrder;
}) {
  const english = locale === "en";
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAwaitingQuote = order.status === "awaiting_customer_confirmation";
  const isPendingQuote = order.status === "pending_fee_quote";
  const isReplacementPending = order.status === "cancelled" && order.cancel_reason === "quote_replaced";
  const isAccepted = order.status === "quote_accepted";
  const isWaiting = isPendingQuote || isReplacementPending;
  const countdownDeadline = isAwaitingQuote
    ? order.quote_expires_at
    : isReplacementPending
      ? order.quote_replacement_deadline_at
      : null;

  useEffect(() => {
    if (!countdownDeadline) return;
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [countdownDeadline]);

  useEffect(() => {
    if (!isWaiting && !isAwaitingQuote) return;
    const timer = window.setInterval(() => router.refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [isAwaitingQuote, isWaiting, router]);

  const expiryTime = countdownDeadline ? Date.parse(countdownDeadline) : NaN;
  const remainingSeconds = currentTime === null || !Number.isFinite(expiryTime)
    ? null
    : Math.max(0, Math.ceil((expiryTime - currentTime) / 1000));

  function formatRemaining() {
    if (remainingSeconds === null) return english ? "Timer unavailable" : "Compte à rebours indisponible";
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return english
      ? `${minutes}:${String(seconds).padStart(2, "0")} remaining`
      : `${minutes}:${String(seconds).padStart(2, "0")} restantes`;
  }

  async function acceptQuote() {
    if (order.delivery_fee === null || order.quote_version < 1) return;
    setPending(true);
    setError(null);
    try {
      const result = await acceptFeeQuote({
        orderId: order.id,
        displayedTotal: order.total,
        displayedVersion: order.quote_version,
      });
      if (!result.ok) {
        setError(result.code);
        router.refresh();
        return;
      }
      router.refresh();
    } catch {
      console.error("Could not accept the delivery fee quote.");
      setError("quote_acceptance_failed");
    } finally {
      setPending(false);
    }
  }

  async function declineQuote() {
    setPending(true);
    setError(null);
    try {
      const result = await cancelFeeQuote({ orderId: order.id });
      if (!result.ok) {
        setError(result.code);
        return;
      }
      router.refresh();
    } catch {
      console.error("Could not decline the delivery fee quote.");
      setError("order_cancellation_failed");
    } finally {
      setPending(false);
    }
  }

  const cancelMessage = order.cancel_reason === "quote_not_provided"
    ? english
      ? "No quote was sent in time. This order was cancelled; you can start again from your cart."
      : "Aucun devis n’a été envoyé dans le délai. Cette commande est annulée ; tu peux recommencer depuis ton panier."
    : order.cancel_reason === "quote_expired"
      ? english
        ? "The quote expired. This order was cancelled; you can start again from your cart."
        : "Le devis a expiré. Cette commande est annulée ; tu peux recommencer depuis ton panier."
      : english
        ? "This order was cancelled."
        : "Cette commande a été annulée.";

  return (
    <main className="storefront-page page-shell">
      <header className="storefront-page-header">
        <p className="eyebrow">{english ? "ORDER TRACKING" : "SUIVI DE COMMANDE"}</p>
        <h1>{detail
          ? english ? "Order details" : "Détail de la commande"
          : english ? "Delivery fee quote" : "Devis des frais de livraison"}</h1>
      </header>
      {detail && (
        <section className="storefront-menu-section">
          <h2>{english ? "Order summary" : "Récapitulatif de la commande"}</h2>
          <p>{english ? "Shop" : "Établissement"}: {order.partner_name ?? (english ? "Unavailable" : "Indisponible")}</p>
          <ul>
            {order.items.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                {item.quantity} × {item.name}
                {item.options.length > 0 && ` · ${item.options.map((option) => option.name).join(", ")}`}
                {" — "}{formatPrice(item.line_total, locale)} XAF
              </li>
            ))}
          </ul>
          {order.delivery_address && (
            <address>
              <p>{order.delivery_address.neighborhood}</p>
              <p>{order.delivery_address.landmark}</p>
              {order.delivery_address.details && <p>{order.delivery_address.details}</p>}
            </address>
          )}
        </section>
      )}
      <ol aria-label={english ? "Order progress" : "Avancement de la commande"}>
        <li>{english ? "Order sent" : "Commande envoyée"}</li>
        <li>{isReplacementPending
          ? english ? "Preparing a new quote" : "Préparation d’un nouveau devis"
          : isPendingQuote
            ? english ? "Waiting for a delivery fee quote" : "En attente du devis de livraison"
            : english ? "Delivery fee quote sent" : "Devis de livraison envoyé"}</li>
        <li>{isAccepted
          ? english ? "Quote accepted" : "Devis accepté"
          : isWaiting
            ? english ? "Quote pending" : "Devis en attente"
            : english ? "Customer decision" : "Décision du client"}</li>
      </ol>
      {isPendingQuote && (
        <section className="storefront-menu-section" aria-live="polite">
          <p>
            {english
              ? "Your order is waiting for an agent to confirm the delivery fee. No payment is requested."
              : "Ta commande attend qu’un agent confirme les frais de livraison. Aucun paiement n’est demandé."}
          </p>
        </section>
      )}
      {isReplacementPending && (
        <section className="storefront-menu-section" aria-live="polite">
          <h2>{english ? "We’re preparing a new quote" : "Nous préparons un nouveau devis"}</h2>
          <p>
            {english
              ? "The previous quote was cancelled. An agent is preparing a replacement."
              : "Le devis précédent a été annulé. Un agent prépare son remplacement."}
          </p>
          <p>
            {english ? "Time left to receive it" : "Temps restant pour le recevoir"}: {formatRemaining()}
          </p>
        </section>
      )}
      {isAwaitingQuote && (
        <section className="storefront-menu-section" aria-live="polite">
          <h2>{english ? "Quote details" : "Détail du devis"}</h2>
          <p>{english ? "Items subtotal" : "Sous-total des articles"}: {formatPrice(order.subtotal, locale)} XAF</p>
          {order.delivery_fee !== null && (
            <p>{english ? "Delivery fee" : "Frais de livraison"}: {formatPrice(order.delivery_fee, locale)} XAF</p>
          )}
          <p><strong>{english ? "Total" : "Total"}: {formatPrice(order.total, locale)} XAF</strong></p>
          <p>{formatRemaining()}</p>
          <p>
            {english
              ? "The database checks the expiry and the exact quote version when you accept."
              : "La base vérifie l’expiration et la version exacte du devis au moment de l’acceptation."}
          </p>
          {error && (
            <p role="alert">
              {error === "quote_changed"
                ? english ? "The quote changed. Refresh to review the latest amount." : "Le devis a changé. Actualise pour vérifier le dernier montant."
                : error === "quote_expired"
                  ? english ? "This quote has expired." : "Ce devis a expiré."
                  : english ? "The request failed. Please try again." : "La demande a échoué. Réessaie."}
            </p>
          )}
          <div className="storefront-checkout-links">
            <button className="storefront-primary-button" disabled={pending} onClick={acceptQuote} type="button">
              {english ? "Accept quote" : "Accepter le devis"}
            </button>
            <button className="storefront-back-link" disabled={pending} onClick={declineQuote} type="button">
              {english ? "Decline quote" : "Refuser le devis"}
            </button>
          </div>
        </section>
      )}
      {isAccepted && (
        <section className="storefront-menu-section">
          <p>
            {english
              ? "You accepted this quote. No payment was taken in this step."
              : "Tu as accepté ce devis. Aucun paiement n’a été effectué à cette étape."}
          </p>
          <p>{english ? "Accepted total" : "Total accepté"}: {formatPrice(order.total, locale)} XAF</p>
        </section>
      )}
      {order.status === "cancelled" && !isReplacementPending && (
        <section className="storefront-menu-section">
          <p>{cancelMessage}</p>
          <Link className="storefront-primary-button" href={`/${locale}/paniers`}>
            {english ? "Start a new order" : "Recommencer une commande"}
          </Link>
        </section>
      )}
      {!isAwaitingQuote && !isPendingQuote && !isAccepted && order.status !== "cancelled" && (
        <section className="storefront-menu-section">
          <p>{english ? "Order status" : "Statut de la commande"}: {order.status}</p>
        </section>
      )}
      {!detail && (
        <Link
          className="storefront-back-link"
          href={`/${locale}/commandes/apercu?order=${order.id}`}
        >
          {english ? "View order details" : "Voir le détail de la commande"}
        </Link>
      )}
    </main>
  );
}
