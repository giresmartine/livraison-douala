"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelAdminFeeQuote,
  reauthenticateAdmin,
  sendFeeQuote,
  verifyAdminMfa,
} from "@/app/[locale]/order-actions";
import { TurnstileField } from "@/components/turnstile-field";
import type { Locale } from "@/lib/screens";

export type AdminFeeQuoteOrder = {
  id: string;
  status: "pending_fee_quote" | "awaiting_customer_confirmation" | "cancelled";
  subtotal: number;
  delivery_fee: number | null;
  total: number;
  quote_requested_at: string;
  quote_expires_at: string | null;
  quote_version: number;
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
    options: { id: string; name: string; price_delta: number }[];
  }[];
};

type AdminQueueAction = {
  orderId: string;
  kind: "send" | "cancel";
};

type MfaChallenge = {
  method: "totp" | "phone";
  factorId: string;
  challengeId?: string;
};

function formatPrice(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en", {
    maximumFractionDigits: 0,
  }).format(amount);
}

function minutesWaiting(timestamp: string, serverNow: string) {
  const requestedAt = Date.parse(timestamp);
  const now = Date.parse(serverNow);
  return Number.isFinite(requestedAt) && Number.isFinite(now)
    ? Math.max(0, Math.floor((now - requestedAt) / 60000))
    : null;
}

export function AdminFeeQuoteQueue({
  locale,
  maxDeliveryFee,
  orders,
  serverNow,
  turnstileSiteKey,
}: {
  locale: Locale;
  maxDeliveryFee: number;
  orders: AdminFeeQuoteOrder[];
  serverNow: string;
  turnstileSiteKey?: string;
}) {
  const english = locale === "en";
  const router = useRouter();
  const [deliveryFees, setDeliveryFees] = useState<Record<string, string>>({});
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [reauthAction, setReauthAction] = useState<AdminQueueAction | null>(null);
  const [reauthStep, setReauthStep] = useState<"password" | "mfa" | null>(null);
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);

  function setOrderError(orderId: string, code: string) {
    setActionErrors((current) => ({ ...current, [orderId]: code }));
  }

  async function executeAction(action: AdminQueueAction) {
    const feeText = deliveryFees[action.orderId] ?? "";
    const deliveryFee = Number(feeText);
    if (action.kind === "send" && (
      !/^\d+$/.test(feeText) ||
      !Number.isSafeInteger(deliveryFee) ||
      deliveryFee < 0
    )) {
      setOrderError(action.orderId, "invalid_quote");
      return;
    }

    setPendingOrderId(action.orderId);
    setOrderError(action.orderId, "");
    try {
      const result = action.kind === "send"
        ? await sendFeeQuote({ orderId: action.orderId, deliveryFee })
        : await cancelAdminFeeQuote({ orderId: action.orderId });
      if (!result.ok) {
        if (result.code === "admin_reauth_required") {
          setReauthAction(action);
          setReauthStep("password");
          setReauthError(null);
          setCaptchaToken("");
          setCaptchaResetSignal((signal) => signal + 1);
        } else {
          setOrderError(action.orderId, result.code);
        }
        return;
      }

      if (
        action.kind === "send" &&
        "result" in result &&
        result.result === "cancelled_quote_not_provided"
      ) {
        setOrderError(action.orderId, "quote_not_provided");
      }
      router.refresh();
    } catch {
      console.error("Could not complete the administrator fee quote action.");
      setOrderError(action.orderId, "quote_action_failed");
    } finally {
      setPendingOrderId(null);
    }
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reauthAction) return;
    setReauthError(null);
    setPendingOrderId(reauthAction.orderId);

    try {
      const result = await reauthenticateAdmin({ password, captchaToken });
      setPassword("");
      setCaptchaToken("");
      setCaptchaResetSignal((signal) => signal + 1);
      if (!result.ok) {
        setReauthError(result.code);
        return;
      }
      if (result.needsMfa) {
        setMfaChallenge({
          method: result.method,
          factorId: result.factorId,
          ...(result.method === "phone" ? { challengeId: result.challengeId } : {}),
        });
        setReauthStep("mfa");
        return;
      }

      setReauthStep(null);
      setReauthAction(null);
      await executeAction(reauthAction);
    } catch {
      console.error("Administrator password re-verification failed.");
      setReauthError("reauthentication_failed");
    } finally {
      setPendingOrderId(null);
    }
  }

  async function submitMfa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reauthAction || !mfaChallenge) return;
    setReauthError(null);
    setPendingOrderId(reauthAction.orderId);

    try {
      const result = await verifyAdminMfa({
        ...mfaChallenge,
        code: mfaCode,
      });
      setMfaCode("");
      if (!result.ok) {
        setReauthError(result.code);
        return;
      }

      const action = reauthAction;
      setReauthStep(null);
      setReauthAction(null);
      setMfaChallenge(null);
      await executeAction(action);
    } catch {
      console.error("Administrator MFA re-verification failed.");
      setReauthError("mfa_verification_failed");
    } finally {
      setPendingOrderId(null);
    }
  }

  function closeReauthentication() {
    setReauthStep(null);
    setReauthAction(null);
    setReauthError(null);
    setPassword("");
    setCaptchaToken("");
    setMfaCode("");
    setMfaChallenge(null);
  }

  function errorMessage(code: string) {
    if (code === "admin_required") return english ? "Administrator access is required." : "Cette action est réservée à l’administrateur.";
    if (code === "delivery_fee_out_of_limit") return english ? "The amount exceeds the configured limit." : "Le montant dépasse le plafond configuré.";
    if (code === "order_not_found") return english ? "This order is no longer available." : "Cette commande n’est plus disponible.";
    if (code === "order_not_quoteable") return english ? "This order can no longer receive a quote." : "Cette commande ne peut plus recevoir de devis.";
    if (code === "quote_not_provided") return english ? "The order timed out and was cancelled." : "Le délai est dépassé ; la commande a été annulée.";
    if (code === "invalid_quote") return english ? "Enter a whole amount in XAF." : "Saisis un montant entier en XAF.";
    return english ? "The action failed. Refresh and try again." : "L’action a échoué. Actualise puis réessaie.";
  }

  function reauthenticationMessage(code: string) {
    if (code === "reauthentication_failed") return english ? "The password could not be verified. Try again." : "Le mot de passe n’a pas été vérifié. Réessaie.";
    if (code === "invalid_mfa_code") return english ? "That code is not valid. Try again." : "Ce code n’est pas valide. Réessaie.";
    if (code === "mfa_method_unavailable") return english ? "Use a TOTP or phone factor, or ask an administrator to configure one." : "Utilise un facteur TOTP ou téléphone, ou demande à un administrateur d’en configurer un.";
    return english ? "Verification is unavailable. Try again later." : "La vérification est indisponible. Réessaie plus tard.";
  }

  return (
    <main className="storefront-page page-shell">
      <header className="storefront-page-header">
        <p className="eyebrow">{english ? "ADMIN · FEE QUOTES" : "ADMIN · DEVIS DE FRAIS"}</p>
        <h1>{english ? "Delivery fee quote queue" : "File des devis de livraison"}</h1>
      </header>
      <p>
        {english
          ? `Maximum delivery fee: ${formatPrice(maxDeliveryFee, locale)} XAF. This is a safeguard, not a tariff.`
          : `Plafond du frais de livraison : ${formatPrice(maxDeliveryFee, locale)} XAF. C’est un garde-fou, pas un tarif.`}
      </p>
      {orders.length === 0 ? (
        <p>{english ? "No quote needs action." : "Aucun devis ne nécessite d’action."}</p>
      ) : (
        <div className="storefront-search-section">
          {orders.map((order) => {
            const isSent = order.status === "awaiting_customer_confirmation";
            const isReissue = order.status === "cancelled";
            const wait = minutesWaiting(order.quote_requested_at, serverNow);
            return (
              <article className="storefront-menu-section" key={order.id}>
                <header>
                  <h2>{order.partner_name ?? (english ? "Shop unavailable" : "Enseigne indisponible")}</h2>
                  <p>
                    {english ? "Waiting" : "Attente"}: {wait === null
                      ? english ? "unknown" : "inconnue"
                      : english ? `${wait} min` : `${wait} min`}
                    {" · "}
                    {new Date(order.created_at).toLocaleString(locale === "fr" ? "fr-FR" : "en")}
                  </p>
                  <p>
                    {isSent
                      ? english ? `Quote sent · version ${order.quote_version}` : `Devis envoyé · version ${order.quote_version}`
                      : isReissue
                        ? english ? `Reissue available · next version ${order.quote_version + 1}` : `Réémission possible · prochaine version ${order.quote_version + 1}`
                        : english ? "Waiting for a quote" : "En attente d’un devis"}
                  </p>
                </header>
                <section>
                  <h3>{english ? "Delivery address" : "Adresse de livraison"}</h3>
                  {order.delivery_address
                    ? (
                      <address>
                        <p>{order.delivery_address.neighborhood}</p>
                        <p>{order.delivery_address.landmark}</p>
                        {order.delivery_address.details && <p>{order.delivery_address.details}</p>}
                      </address>
                    )
                    : <p>{english ? "Address unavailable" : "Adresse indisponible"}</p>}
                </section>
                <section>
                  <h3>{english ? "Items" : "Articles"}</h3>
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={`${item.name}-${index}`}>
                        {item.quantity} × {item.name}
                        {item.options.length > 0 && ` · ${item.options.map((option) => option.name).join(", ")}`}
                      </li>
                    ))}
                  </ul>
                  <p>{english ? "Server subtotal" : "Sous-total serveur"}: {formatPrice(order.subtotal, locale)} XAF</p>
                </section>
                {isSent && order.delivery_fee !== null && (
                  <section>
                    <p>{english ? "Current delivery fee" : "Frais de livraison actuels"}: {formatPrice(order.delivery_fee, locale)} XAF</p>
                    <p>{english ? "Current total" : "Total actuel"}: {formatPrice(order.total, locale)} XAF</p>
                    {order.quote_expires_at && (
                      <p>
                        {english ? "Quote expires" : "Expiration du devis"}:{" "}
                        {new Date(order.quote_expires_at).toLocaleString(locale === "fr" ? "fr-FR" : "en")}
                      </p>
                    )}
                  </section>
                )}
                {!isSent && (
                  <div className="storefront-form-field">
                    <label htmlFor={`delivery-fee-${order.id}`}>
                      {english ? "Delivery fee in XAF" : "Frais de livraison en XAF"}
                    </label>
                    <input
                      id={`delivery-fee-${order.id}`}
                      inputMode="numeric"
                      max={maxDeliveryFee}
                      min={0}
                      onChange={(event) => setDeliveryFees((current) => ({
                        ...current,
                        [order.id]: event.target.value,
                      }))}
                      step={1}
                      type="number"
                      value={deliveryFees[order.id] ?? ""}
                    />
                    <button
                      className="storefront-primary-button"
                      disabled={pendingOrderId === order.id}
                      onClick={() => void executeAction({ orderId: order.id, kind: "send" })}
                      type="button"
                    >
                      {pendingOrderId === order.id
                        ? english ? "Working…" : "Traitement…"
                        : isReissue
                          ? english ? "Reissue quote" : "Réémettre le devis"
                          : english ? "Send quote" : "Envoyer le devis"}
                    </button>
                  </div>
                )}
                {isSent && (
                  <button
                    className="storefront-back-link"
                    disabled={pendingOrderId === order.id}
                    onClick={() => {
                      const accepted = window.confirm(english
                        ? "Cancel this quote so you can issue a replacement?"
                        : "Annuler ce devis pour pouvoir en émettre un nouveau ?");
                      if (accepted) void executeAction({ orderId: order.id, kind: "cancel" });
                    }}
                    type="button"
                  >
                    {english ? "Cancel and prepare replacement" : "Annuler et préparer une réémission"}
                  </button>
                )}
                {actionErrors[order.id] && (
                  <p role="alert">{errorMessage(actionErrors[order.id])}</p>
                )}
                {reauthAction?.orderId === order.id && reauthStep && (
                  <section aria-labelledby={`reauth-title-${order.id}`} aria-modal="true" className="storefront-menu-section" role="dialog">
                    <h3 id={`reauth-title-${order.id}`}>
                      {english ? "Verify your identity" : "Vérifie ton identité"}
                    </h3>
                    <p>
                      {english
                        ? "Your amount is still here. Verify again to continue the action."
                        : "Le montant saisi est conservé. Vérifie-toi à nouveau pour poursuivre l’action."}
                    </p>
                    {reauthStep === "password" ? (
                      <form onSubmit={submitPassword}>
                        <label htmlFor={`admin-password-${order.id}`}>{english ? "Password" : "Mot de passe"}</label>
                        <input
                          autoComplete="current-password"
                          id={`admin-password-${order.id}`}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          type="password"
                          value={password}
                        />
                        {turnstileSiteKey
                          ? (
                            <TurnstileField
                              locale={locale}
                              onTokenChange={setCaptchaToken}
                              resetSignal={captchaResetSignal}
                              siteKey={turnstileSiteKey}
                            />
                          )
                          : <p role="alert">{english ? "Verification is not configured." : "La vérification n’est pas configurée."}</p>}
                        {reauthError && <p role="alert">{reauthenticationMessage(reauthError)}</p>}
                        <button className="storefront-primary-button" disabled={!captchaToken || !turnstileSiteKey || pendingOrderId === order.id} type="submit">
                          {english ? "Verify and continue" : "Vérifier et continuer"}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={submitMfa}>
                        <label htmlFor={`admin-mfa-${order.id}`}>
                          {mfaChallenge?.method === "phone"
                            ? english ? "Code sent to your phone" : "Code envoyé sur ton téléphone"
                            : english ? "Authenticator code" : "Code de l’application d’authentification"}
                        </label>
                        <input
                          autoComplete="one-time-code"
                          id={`admin-mfa-${order.id}`}
                          inputMode="numeric"
                          maxLength={8}
                          onChange={(event) => setMfaCode(event.target.value)}
                          pattern="[0-9]{6,8}"
                          required
                          value={mfaCode}
                        />
                        {reauthError && <p role="alert">{reauthenticationMessage(reauthError)}</p>}
                        <button className="storefront-primary-button" disabled={pendingOrderId === order.id} type="submit">
                          {english ? "Verify and continue" : "Vérifier et continuer"}
                        </button>
                      </form>
                    )}
                    <button className="storefront-back-link" onClick={closeReauthentication} type="button">
                      {english ? "Cancel verification" : "Annuler la vérification"}
                    </button>
                  </section>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
