"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import type { Locale, ScreenDefinition } from "@/lib/screens";
import { screenHref } from "@/lib/screens";
import { brand } from "@/lib/config/brand";

function tx(locale: Locale, fr: string, en: string) {
  return locale === "en" ? en : fr;
}

export function ProductScreen({
  locale,
  screen,
  address,
}: {
  locale: Locale;
  screen: ScreenDefinition;
  address: string;
}) {
  return (
    <main className="ps">
      <AppBar locale={locale} address={address} screen={screen} />
      <div className="ps-body">{bodyFor(locale, screen, address)}</div>
      {screen.group === "client" && <ClientNavigation locale={locale} screen={screen} />}
    </main>
  );
}

function ClientNavigation({
  locale,
  screen,
}: {
  locale: Locale;
  screen: ScreenDefinition;
}) {
  const activeSection = screen.id === "S-04"
    ? "home"
    : ["S-13", "S-14", "S-16", "S-17", "S-18"].includes(screen.id)
      ? "cart"
      : ["S-29", "S-30", "S-31"].includes(screen.id)
        ? "account"
        : "";

  return (
    <nav className="ps-bottom-nav" aria-label={tx(locale, "Navigation principale", "Main navigation")}>
      <Link aria-current={activeSection === "home" ? "page" : undefined} href={`/${locale}/accueil`}>
        <Icon name="home" />
        <span>{tx(locale, "Accueil", "Home")}</span>
      </Link>
      <Link aria-current={activeSection === "cart" ? "page" : undefined} href={`/${locale}/paniers`}>
        <Icon name="bag" />
        <span>{tx(locale, "Panier", "Cart")}</span>
      </Link>
      <Link
        className="ps-nav-mic"
        href={`/${locale}/vocal`}
        aria-label={tx(locale, "Commande vocale", "Voice order")}
      >
        <Icon name="mic" />
      </Link>
      <Link href={`/${locale}/groupe/nouveau`}>
        <Icon name="users" />
        <span>{tx(locale, "Groupe", "Group")}</span>
      </Link>
      <Link aria-current={activeSection === "account" ? "page" : undefined} href={`/${locale}/compte`}>
        <Icon name="user" />
        <span>{tx(locale, "Compte", "Account")}</span>
      </Link>
    </nav>
  );
}

function AppBar({
  locale,
  address,
  screen,
}: {
  locale: Locale;
  address: string;
  screen: ScreenDefinition;
}) {
  const place = address || tx(locale, "Choisir un quartier", "Choose a neighbourhood");
  const ops = screen.group === "operations" || screen.group === "partner" || screen.group === "courier";

  return (
    <header className="ps-bar">
      <Link className="ps-brand" href={screen.group === "client" ? `/${locale}` : screenHref(locale, screen.href)}>
        <span className="ps-mark" aria-hidden="true">
          {brand.logoText}
        </span>
        <span>
          <strong>{ops ? screen.role[locale] : brand.name}</strong>
          <small>{ops ? screen.id : place}</small>
        </span>
        {!ops && <Icon name="chevron" />}
      </Link>
      <nav className="ps-tools" aria-label={tx(locale, "Actions", "Actions")}>
        <Link className="ps-tool" href={`/${locale}/recherche`} aria-label={tx(locale, "Recherche", "Search")}>
          <Icon name="search" />
        </Link>
        <Link className="ps-tool" href={`/${locale}/compte`} aria-label={tx(locale, "Notifications", "Notifications")}>
          <Icon name="bell" />
        </Link>
        <Link className="ps-tool" href={`/${locale}/paniers`} aria-label={tx(locale, "Panier", "Cart")}>
          <Icon name="bag" />
        </Link>
        <Link className="ps-tool" href={`/${locale}/compte`} aria-label={tx(locale, "Compte", "Account")}>
          <Icon name="user" />
        </Link>
        <Link className="ps-lang" href={screenHref(locale === "fr" ? "en" : "fr", screen.href)}>
          {locale === "fr" ? "EN" : "FR"}
        </Link>
      </nav>
    </header>
  );
}

function bodyFor(locale: Locale, screen: ScreenDefinition, address: string) {
  switch (screen.id) {
    case "S-02":
      return <ConfirmAddress locale={locale} address={address} />;
    case "S-03":
      return <NoCoverage locale={locale} />;
    case "S-04":
      return <HomeFeed locale={locale} address={address} />;
    case "S-10":
      return <ShopInfo locale={locale} />;
    case "S-11":
      return <Reviews locale={locale} />;
    case "S-17":
      return <Summary locale={locale} />;
    case "S-18":
      return <Payment locale={locale} />;
    case "S-19":
      return <Confirmed locale={locale} />;
    case "S-20":
      return <Tracking locale={locale} />;
    case "S-21":
      return <VoiceOrder locale={locale} />;
    case "S-22":
    case "S-23":
      return <GroupOrder locale={locale} guest={screen.id === "S-23"} />;
    case "S-24":
      return <Errand locale={locale} />;
    case "S-25":
    case "S-26":
      return <Prescription locale={locale} tracking={screen.id === "S-26"} />;
    case "S-27":
    case "S-28":
      return <Orders locale={locale} detail={screen.id === "S-28"} />;
    case "S-29":
    case "S-30":
    case "S-31":
      return <Account locale={locale} screenId={screen.id} />;
    case "S-32":
      return <Complaint locale={locale} />;
    case "S-36":
      return <Legal locale={locale} />;
    case "S-37":
      return <SystemStates locale={locale} />;
    case "S-40":
    case "S-41":
      return <PartnerOrders locale={locale} detail={screen.id === "S-41"} />;
    case "S-42":
      return <Catalogue locale={locale} />;
    case "S-43":
      return <Hours locale={locale} />;
    case "S-44":
      return <Statements locale={locale} />;
    case "S-50":
    case "S-51":
    case "S-52":
    case "S-53":
      return <Courier locale={locale} screenId={screen.id} />;
    default:
      return <Ops locale={locale} screen={screen} />;
  }
}

function HomeFeed({ locale, address }: { locale: Locale; address: string }) {
  const rays = [
    [tx(locale, "Repas", "Meals"), "/restaurants"],
    [tx(locale, "Boissons", "Drinks"), "/restaurants"],
    [tx(locale, "Pharmacie", "Pharmacy"), "/pharmacies"],
    [tx(locale, "Courses", "Errands"), "/courses/nouvelle"],
    [tx(locale, "Offres", "Offers"), "/commande/offres"],
  ] as const;

  return (
    <div className="ps-home-feed">
      <form className="ps-search" action={`/${locale}/recherche`} method="get" role="search">
        <Icon name="search" />
        <input
          autoComplete="off"
          id="home-search"
          name="q"
          placeholder={tx(locale, "Restaurants, pharmacies, plats", "Restaurants, pharmacies, dishes")}
        />
        <button type="submit" aria-label={tx(locale, "Rechercher", "Search")}>
          <Icon name="arrowRight" />
        </button>
        <Link
          className="ps-search-mic"
          href={`/${locale}/vocal`}
          aria-label={tx(locale, "Commande vocale", "Voice order")}
        >
          <Icon name="mic" />
        </Link>
      </form>
      <nav className="ps-tabs" aria-label={tx(locale, "Rayons", "Sections")}>
        {rays.map(([label, href]) => <Link href={`/${locale}${href}`} key={label}>{label}</Link>)}
      </nav>
      <div className="ps-rays">
        {[
          [tx(locale, "Course à la demande", "On-demand errands"), "/courses/nouvelle"],
          [tx(locale, "Pharmacie", "Pharmacy"), "/pharmacies"],
          [tx(locale, "Commande de groupe", "Group order"), "/groupe/nouveau"],
        ].map(([label, href], index) => (
          <Link href={`/${locale}${href}`} key={label}>
            <span aria-hidden="true">
              <Icon name={index === 0 ? "bag" : index === 1 ? "plus" : "users"} />
            </span>
            {label}
          </Link>
        ))}
      </div>
      <section className="ps-offer">
        <p>{tx(locale, "La disponibilité et les tarifs sont confirmés selon ton quartier.", "Availability and delivery fees are confirmed for your neighbourhood.")}</p>
        <Link href={`/${locale}`}>{tx(locale, "Choisir une adresse", "Choose an address")}</Link>
      </section>
      <SectionTitle>{tx(locale, "Ouverts maintenant près de toi", "Open near you now")}</SectionTitle>
      <Empty
        title={address
          ? tx(locale, "Pas encore d’enseigne ouverte ici", "No shop is open here yet")
          : tx(locale, "Indique d’abord où te livrer", "Tell us where to deliver first")}
        text={tx(locale, "Les enseignes vérifiées apparaîtront ici dès leur activation.", "Verified shops will appear here once they are activated.")}
        action={tx(locale, "Pharmacies", "Pharmacies")}
        href={`/${locale}/pharmacies`}
      />
      <section className="ps-shortcuts" aria-label={tx(locale, "Autres services", "More services")}>
        <Link href={`/${locale}/groupe/nouveau`}>
          <Icon name="users" />
          <span>
            <strong>{tx(locale, "Commande de groupe", "Group order")}</strong>
            <small>{tx(locale, "Chacun règle sa part", "Everyone pays their share")}</small>
          </span>
          <Icon className="ps-shortcut-chevron" name="chevron" />
        </Link>
        <Link href={`/${locale}/courses/nouvelle`}>
          <Icon name="bag" />
          <span>
            <strong>{tx(locale, "Course à la demande", "On-demand errand")}</strong>
            <small>{tx(locale, "Un devis avant tout achat", "A quote before any purchase")}</small>
          </span>
          <Icon className="ps-shortcut-chevron" name="chevron" />
        </Link>
      </section>
    </div>
  );
}

function ConfirmAddress({ locale, address }: { locale: Locale; address: string }) {
  const [saved, setSaved] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const landmark = String(data.get("landmark") ?? "").trim();
    if (!landmark) return;
    try {
      sessionStorage.setItem(
        "delivery-address-draft",
        [address, String(data.get("address") ?? ""), landmark].filter(Boolean).join(" · "),
      );
    } catch {
      /* draft stays on the page */
    }
    setSaved(true);
  }

  return (
    <form className="ps-sheet" onSubmit={onSubmit}>
      <h1>{tx(locale, "Confirmer l’adresse", "Confirm the address")}</h1>
      <p className="ps-lead">{tx(locale, "Le repère est obligatoire : peu de rues ont un nom.", "A landmark is required: few streets have a name.")}</p>
      <div className="ps-map" role="img" aria-label={tx(locale, "Carte, repère à placer", "Map, pin to place")}>
        <span className="ps-pin"><Icon name="pin" /></span>
        <small>{tx(locale, "Précision affichée quand la carte est branchée", "Accuracy shows once the map is connected")}</small>
      </div>
      <Field label={tx(locale, "Quartier, rue", "Neighbourhood, street")} name="address" defaultValue={address} required />
      <Field label={tx(locale, "Repère", "Landmark")} name="landmark" required placeholder={tx(locale, "Face à la station, portail bleu…", "Opposite the station, blue gate…")} />
      <Field label={tx(locale, "Complément", "Extra details")} name="details" />
      <label className="ps-check">
        <input name="primary" type="checkbox" />
        <span>{tx(locale, "Enregistrer comme adresse principale", "Save as primary address")}</span>
      </label>
      <button className="ps-primary" type="submit">{tx(locale, "Confirmer l’adresse", "Confirm the address")}</button>
      {saved && <p className="ps-note" role="status">{tx(locale, "Repère noté. La zone sera confirmée au devis.", "Landmark saved. The zone is confirmed with the quote.")}</p>}
    </form>
  );
}

function NoCoverage({ locale }: { locale: Locale }) {
  return (
    <section className="ps-sheet">
      <div className="ps-empty-icon" aria-hidden="true"><Icon name="pin" /></div>
      <h1>{tx(locale, "Nous livrons uniquement à Douala pour le moment", "We only deliver in Douala for now")}</h1>
      <p className="ps-lead">{tx(locale, "Tu peux saisir librement n’importe quel quartier de Douala.", "You can freely enter any neighbourhood in Douala.")}</p>
      <Link className="ps-primary" href={`/${locale}`}>{tx(locale, "Saisir une adresse à Douala", "Enter a Douala address")}</Link>
    </section>
  );
}

function ShopInfo({ locale }: { locale: Locale }) {
  const rows = locale === "fr"
    ? [["Lieu", "Carte et adresse confirmées par l’enseigne"], ["Horaires", "Par jour, avec dernière commande"], ["Paiement", "MTN, Orange, espèces si éligible"]]
    : [["Place", "Map and address confirmed by the shop"], ["Hours", "By day, with last-order time"], ["Payment", "MTN, Orange, cash when eligible"]];
  return (
    <section className="ps-sheet">
      <h1>{tx(locale, "Informations", "Information")}</h1>
      <ul className="ps-list">
        {rows.map(([title, detail]) => (
          <li key={title}>
            <div>
              <strong>{title}</strong>
              <small>{detail}</small>
            </div>
            <Icon name="chevron" />
          </li>
        ))}
      </ul>
      <Link className="ps-primary" href={`/${locale}/e/restaurant-apercu`}>{tx(locale, "Retour au menu", "Back to menu")}</Link>
    </section>
  );
}

function Reviews({ locale }: { locale: Locale }) {
  return (
    <section className="ps-sheet">
      <p className="ps-kicker">{tx(locale, "Avis", "Reviews")}</p>
      <h1 className="ps-score">—</h1>
      <p className="ps-lead">{tx(locale, "Les avis apparaissent après une commande livrée.", "Reviews appear after a delivered order.")}</p>
      <div className="ps-bars" aria-hidden="true">
        {[5, 4, 3, 2, 1].map((star) => (
          <div key={star}><span>{star}</span><i /></div>
        ))}
      </div>
      <Empty
        title={tx(locale, "Aucun avis pour l’instant", "No reviews yet")}
        text={tx(locale, "Tu pourras noter après la livraison.", "You can rate after delivery.")}
        action={tx(locale, "Retour au menu", "Back to menu")}
        href={`/${locale}/e/restaurant-apercu`}
      />
    </section>
  );
}

function Summary({ locale }: { locale: Locale }) {
  const lines = locale === "fr"
    ? [["Sous-total", "—"], ["Économies", "—"], ["Livraison", "—"], ["Supplément", "—"], ["Pourboire", "—"]]
    : [["Subtotal", "—"], ["Savings", "—"], ["Delivery", "—"], ["Surcharge", "—"], ["Tip", "—"]];
  return (
    <section className="ps-sheet">
      <h1>{tx(locale, "Récapitulatif", "Summary")}</h1>
      <p className="ps-lead">{tx(locale, "Le total affiché vient du serveur, après le devis de zone.", "The total comes from the server, after the zone quote.")}</p>
      <ul className="ps-totals">
        {lines.map(([label, value]) => (
          <li key={label}><span>{label}</span><strong className="num">{value}</strong></li>
        ))}
        <li className="is-total"><span>{tx(locale, "Total", "Total")}</span><strong>—</strong></li>
      </ul>
      <button className="ps-primary" disabled type="button">{tx(locale, "Passer au paiement", "Continue to payment")}</button>
      <p className="ps-note">{tx(locale, "Le bouton s’active quand la zone, le minimum et les articles sont confirmés.", "The button turns on once the zone, minimum and items are confirmed.")}</p>
    </section>
  );
}

function Payment({ locale }: { locale: Locale }) {
  const [method, setMethod] = useState("mtn");
  const options = [
    ["mtn", "MTN Mobile Money"],
    ["orange", "Orange Money"],
    ["cash", tx(locale, "Espèces à la livraison", "Cash on delivery")],
    ["card", tx(locale, "Carte · bientôt", "Card · soon")],
  ] as const;

  return (
    <form className="ps-sheet" onSubmit={(event) => event.preventDefault()}>
      <h1>{tx(locale, "Paiement", "Payment")}</h1>
      <div className="ps-choices" role="radiogroup" aria-label={tx(locale, "Moyen de paiement", "Payment method")}>
        {options.map(([id, label]) => (
          <label key={id} className={method === id ? "is-on" : undefined}>
            <input checked={method === id} disabled={id === "card"} name="pay" onChange={() => setMethod(id)} type="radio" />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <p className="ps-note">
        {method === "cash"
          ? tx(locale, "Réservé après 3 commandes réussies, avec un plafond.", "Available after 3 successful orders, with a cap.")
          : tx(locale, "La demande part chez l’agrégateur. L’attente dure au plus 5 minutes.", "The request goes to the provider. Waiting lasts at most 5 minutes.")}
      </p>
      <label className="ps-check">
        <input required type="checkbox" />
        <span>{tx(locale, "J’accepte les CGV et la confidentialité", "I accept the terms and privacy policy")}</span>
      </label>
      <button className="ps-primary" disabled type="submit">{tx(locale, "Payer", "Pay")}</button>
    </form>
  );
}

function Confirmed({ locale }: { locale: Locale }) {
  return (
    <section className="ps-sheet ps-center">
      <span className="ps-check-badge" aria-hidden="true"><Icon name="check" /></span>
      <h1>{tx(locale, "Commande confirmée", "Order confirmed")}</h1>
      <p className="ps-code" aria-label={tx(locale, "Code de remise", "Handover code")}>— — — —</p>
      <p className="ps-lead">{tx(locale, "Le code et l’heure d’arrivée s’affichent dès que le serveur confirme.", "The code and arrival time appear once the server confirms.")}</p>
      <Link className="ps-primary" href={`/${locale}/commandes`}>{tx(locale, "Voir mes commandes", "See my orders")}</Link>
    </section>
  );
}

function Tracking({ locale }: { locale: Locale }) {
  const steps = locale === "fr"
    ? ["Confirmée", "En préparation", "Livreur en route", "Livrée"]
    : ["Confirmed", "Preparing", "Courier on the way", "Delivered"];
  return (
    <section className="ps-sheet">
      <div className="ps-map"><span className="ps-pin"><Icon name="pin" /></span></div>
      <h1>{tx(locale, "Suivi", "Tracking")}</h1>
      <ol className="ps-steps">
        {steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <Empty
        title={tx(locale, "Aucune course en cours", "No active delivery")}
        text={tx(locale, "La position du livreur s’affiche seulement pendant la course.", "The courier’s location shows only during the trip.")}
        action={tx(locale, "Mes commandes", "My orders")}
        href={`/${locale}/commandes`}
      />
    </section>
  );
}

function VoiceOrder({ locale }: { locale: Locale }) {
  const [on, setOn] = useState(false);
  return (
    <section className="ps-sheet ps-center">
      <h1>{tx(locale, "Commande vocale", "Voice order")}</h1>
      <p className="ps-lead">{tx(locale, "30 secondes maximum. Un agent relit avant confirmation.", "30 seconds maximum. An agent reviews it before confirmation.")}</p>
      <button className={`ps-mic${on ? " is-on" : ""}`} onClick={() => setOn((value) => !value)} type="button">
        <Icon name="mic" />
        <span>{on ? tx(locale, "Arrêter", "Stop") : tx(locale, "Parler", "Speak")}</span>
      </button>
      <label className="ps-check">
        <input required type="checkbox" />
        <span>{tx(locale, "J’accepte l’enregistrement temporaire", "I accept the temporary recording")}</span>
      </label>
      <div className="ps-split">
        <article>
          <h2>{tx(locale, "Ce que j’ai compris", "What I heard")}</h2>
          <p>{tx(locale, "La transcription s’affiche ici, tu peux la corriger.", "The transcript shows here and you can edit it.")}</p>
        </article>
        <article>
          <h2>{tx(locale, "Ma proposition", "My suggestion")}</h2>
          <p>{tx(locale, "Les articles reconnus, avec le prix. L’incertain est marqué à valider.", "Recognised items, with prices. Uncertain ones are marked for review.")}</p>
        </article>
      </div>
    </section>
  );
}

function GroupOrder({ locale, guest }: { locale: Locale; guest: boolean }) {
  return (
    <section className="ps-sheet">
      <h1>{guest ? tx(locale, "Rejoindre le groupe", "Join the group") : tx(locale, "Commande de groupe", "Group order")}</h1>
      <p className="ps-lead">
        {guest
          ? tx(locale, "Tu vois ta part et le total. Un compte est nécessaire pour ajouter et payer.", "You see your share and the total. An account is required to add items and pay.")
          : tx(locale, "Choisis l’enseigne, l’heure limite, puis partage le lien.", "Pick the shop and the deadline, then share the link.")}
      </p>
      {!guest && (
        <>
          <Field label={tx(locale, "Enseigne", "Shop")} name="shop" required />
          <Field label={tx(locale, "Heure limite", "Deadline")} name="deadline" type="datetime-local" required />
        </>
      )}
      <div className="ps-progress" aria-hidden="true"><span /></div>
      <Empty
        title={tx(locale, "Personne n’a encore rejoint", "Nobody has joined yet")}
        text={tx(locale, "Payé et en attente apparaîtront ici.", "Paid and waiting will show here.")}
        action={guest ? tx(locale, "Se connecter", "Sign in") : tx(locale, "Partager", "Share")}
        href={guest ? `/${locale}/connexion` : `/${locale}/groupe/nouveau`}
      />
    </section>
  );
}

function Errand({ locale }: { locale: Locale }) {
  return (
    <form className="ps-sheet" onSubmit={(event) => event.preventDefault()}>
      <h1>{tx(locale, "Course à la demande", "On-demand errand")}</h1>
      <p className="ps-lead">{tx(locale, "Décris l’achat. Le devis inclut une marge de 15 à 20 %. Tu paies avant l’achat.", "Describe the purchase. The quote includes a 15 to 20% margin. You pay before the purchase.")}</p>
      <label className="ps-field">
        <span>{tx(locale, "Ta demande", "Your request")}</span>
        <textarea name="request" required rows={4} />
      </label>
      <ul className="ps-totals">
        <li><span>{tx(locale, "Plafond nouveau client", "New customer cap")}</span><strong className="num">20 000 FCFA</strong></li>
        <li><span>{tx(locale, "Après 3 commandes", "After 3 orders")}</span><strong className="num">50 000 FCFA</strong></li>
      </ul>
      <label className="ps-check">
        <input required type="checkbox" />
        <span>{tx(locale, "Les articles demandés respectent les règles", "The requested items follow the rules")}</span>
      </label>
      <button className="ps-primary" type="submit">{tx(locale, "Demander un devis", "Request a quote")}</button>
    </form>
  );
}

function Prescription({ locale, tracking }: { locale: Locale; tracking: boolean }) {
  const steps = locale === "fr"
    ? ["Reçue", "Validation du pharmacien", "Prix confirmé", "Livraison en sac scellé"]
    : ["Received", "Pharmacist review", "Price confirmed", "Sealed-bag delivery"];
  if (tracking) {
    return (
      <section className="ps-sheet">
        <h1>{tx(locale, "Suivi d’ordonnance", "Prescription tracking")}</h1>
        <ol className="ps-steps">{steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p className="ps-note">{tx(locale, "Le paiement s’ouvre après le prix confirmé par la pharmacie.", "Payment opens after the pharmacy confirms the price.")}</p>
      </section>
    );
  }
  return (
    <form className="ps-sheet" onSubmit={(event) => event.preventDefault()}>
      <h1>{tx(locale, "Mon ordonnance", "My prescription")}</h1>
      <p className="ps-lead">{tx(locale, "Visible uniquement par cette pharmacie, supprimée après 30 jours.", "Visible only to this pharmacy, deleted after 30 days.")}</p>
      <div className="ps-frame">{tx(locale, "Cadre la photo dans ce rectangle", "Frame the photo inside this rectangle")}</div>
      <label className="ps-check">
        <input required type="checkbox" />
        <span>{tx(locale, "J’accepte l’envoi de cette donnée de santé", "I consent to sending this health information")}</span>
      </label>
      <button className="ps-primary" type="submit">{tx(locale, "Envoyer à la pharmacie", "Send to the pharmacy")}</button>
    </form>
  );
}

function Orders({ locale, detail }: { locale: Locale; detail: boolean }) {
  return (
    <section className="ps-sheet">
      <h1>{detail ? tx(locale, "Détail", "Details") : tx(locale, "Commandes", "Orders")}</h1>
      <Empty
        title={tx(locale, "Aucune commande", "No orders")}
        text={detail
          ? tx(locale, "Les lignes, le reçu et l’avis s’affichent après une livraison.", "Items, the receipt and the review show after a delivery.")
          : tx(locale, "Celles en cours passeront en haut, puis l’historique.", "Active ones will sit on top, then the history.")}
        action={tx(locale, "Voir les restaurants", "See restaurants")}
        href={`/${locale}/restaurants`}
      />
    </section>
  );
}

function Account({ locale, screenId }: { locale: Locale; screenId: string }) {
  const [theme, setTheme] = useState("auto");
  if (screenId === "S-30") {
    return (
      <section className="ps-sheet">
        <h1>{tx(locale, "Adresses", "Addresses")}</h1>
        <Empty
          title={tx(locale, "Aucune adresse enregistrée", "No saved address")}
          text={tx(locale, "Ajoute un repère sur la carte. Une adresse peut être principale.", "Add a landmark on the map. One address can be primary.")}
          action={tx(locale, "Ajouter une adresse", "Add an address")}
          href={`/${locale}/adresse/confirmer`}
        />
      </section>
    );
  }
  if (screenId === "S-31") {
    return (
      <section className="ps-sheet">
        <h1>{tx(locale, "Préférences", "Preferences")}</h1>
        <div className="ps-choices" role="radiogroup" aria-label={tx(locale, "Thème", "Theme")}>
          {(["auto", "light", "dark"] as const).map((value) => (
            <label className={theme === value ? "is-on" : undefined} key={value}>
              <input checked={theme === value} name="theme" onChange={() => setTheme(value)} type="radio" />
              <span>{value === "auto" ? tx(locale, "Auto", "Auto") : value === "light" ? tx(locale, "Clair", "Light") : tx(locale, "Sombre", "Dark")}</span>
            </label>
          ))}
        </div>
        <nav className="ps-lang-row" aria-label={tx(locale, "Langue", "Language")}>
          <Link href="/fr" hrefLang="fr">FR</Link>
          <Link href="/en" hrefLang="en">EN</Link>
        </nav>
      </section>
    );
  }
  const links = [
    [tx(locale, "Adresses", "Addresses"), "/compte/adresses"],
    [tx(locale, "Préférences", "Preferences"), "/compte/preferences"],
    [tx(locale, "Réclamation", "Report an issue"), "/aide/reclamation"],
    [tx(locale, "Documents légaux", "Legal documents"), "/legal/conditions"],
  ] as const;
  return (
    <section className="ps-sheet">
      <h1>{tx(locale, "Compte", "Account")}</h1>
      <ul className="ps-list">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={`/${locale}${href}`}>
              <strong>{label}</strong>
              <Icon name="chevron" />
            </Link>
          </li>
        ))}
      </ul>
      <Link className="ps-text" href={`/${locale}/connexion`}>{tx(locale, "Connexion", "Sign in")}</Link>
    </section>
  );
}

function Complaint({ locale }: { locale: Locale }) {
  const reasons = locale === "fr"
    ? ["Retard", "Article manquant", "Mauvais article", "Qualité", "Autre"]
    : ["Delay", "Missing item", "Wrong item", "Quality", "Other"];
  return (
    <form className="ps-sheet" onSubmit={(event) => event.preventDefault()}>
      <h1>{tx(locale, "Réclamation", "Report an issue")}</h1>
      <Field label={tx(locale, "Commande", "Order")} name="order" required />
      <label className="ps-field">
        <span>{tx(locale, "Motif", "Reason")}</span>
        <select defaultValue="" name="reason" required>
          <option disabled value="">{tx(locale, "Choisir", "Choose")}</option>
          {reasons.map((reason) => <option key={reason}>{reason}</option>)}
        </select>
      </label>
      <label className="ps-field">
        <span>{tx(locale, "Décris ce qui s’est passé", "Describe what happened")}</span>
        <textarea name="details" required rows={4} />
      </label>
      <button className="ps-primary" type="submit">{tx(locale, "Envoyer", "Send")}</button>
    </form>
  );
}

function Legal({ locale }: { locale: Locale }) {
  const docs = locale === "fr"
    ? ["Mentions légales", "Confidentialité", "Cookies", "CGU", "CGV", "Remboursements"]
    : ["Legal notice", "Privacy", "Cookies", "Terms of use", "Terms of sale", "Refunds"];
  return (
    <section className="ps-sheet">
      <h1>{tx(locale, "Documents", "Documents")}</h1>
      <p className="ps-lead">{tx(locale, "La version et la date s’affichent sur chaque texte approuvé.", "The version and date show on each approved text.")}</p>
      <ul className="ps-list">
        {docs.map((doc) => (
          <li key={doc}><span><strong>{doc}</strong><small>{tx(locale, "En attente d’approbation", "Waiting for approval")}</small></span></li>
        ))}
      </ul>
    </section>
  );
}

function SystemStates({ locale }: { locale: Locale }) {
  const states = [
    ["404", tx(locale, "Cette page n’existe pas", "This page does not exist")],
    ["500", tx(locale, "Le service a un souci", "The service has a problem")],
    [tx(locale, "Hors ligne", "Offline"), tx(locale, "Dernier contenu conservé", "Last content kept")],
    [tx(locale, "Maintenance", "Maintenance"), tx(locale, "On revient vite", "Back soon")],
  ];
  return (
    <section className="ps-sheet">
      <h1>{tx(locale, "États", "States")}</h1>
      <div className="ps-states">
        {states.map(([code, label]) => (
          <article key={code}>
            <strong>{code}</strong>
            <p>{label}</p>
            <Link href={`/${locale}`}>{tx(locale, "Retour à l’accueil", "Back home")}</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function PartnerOrders({ locale, detail }: { locale: Locale; detail: boolean }) {
  return (
    <section className="ps-sheet ps-wide">
      <div className="ps-metrics">
        <Metric label={tx(locale, "Aujourd’hui", "Today")} />
        <Metric label={tx(locale, "Cette semaine", "This week")} />
        <Metric label={tx(locale, "À accepter", "To accept")} />
      </div>
      <h1>{detail ? tx(locale, "Détail de commande", "Order details") : tx(locale, "Commandes", "Orders")}</h1>
      <div className="ps-queues">
        <article>
          <h2>{tx(locale, "Nouvelles", "New")}</h2>
          <p>{tx(locale, "Le minuteur et les boutons Accepter / Refuser s’affichent ici. Le téléphone du client n’apparaît jamais.", "The timer and Accept / Decline buttons show here. The customer’s phone never appears.")}</p>
        </article>
        <article>
          <h2>{tx(locale, "En préparation", "Preparing")}</h2>
          <p>{tx(locale, "Marquer prête quand l’enseigne a terminé.", "Mark ready when the shop is done.")}</p>
        </article>
      </div>
    </section>
  );
}

function Catalogue({ locale }: { locale: Locale }) {
  return (
    <section className="ps-sheet ps-wide">
      <h1>{tx(locale, "Catalogue", "Catalogue")}</h1>
      <p className="ps-lead">{tx(locale, "Sections, prix, disponibilité en un geste. Une photo exige la confirmation des droits.", "Sections, prices, availability in one gesture. A photo requires confirmed rights.")}</p>
      <form className="ps-inline" onSubmit={(event) => event.preventDefault()}>
        <Field label={tx(locale, "Article", "Item")} name="item" required />
        <Field label={tx(locale, "Prix (FCFA)", "Price (XAF)")} name="price" type="number" required />
        <label className="ps-check">
          <input type="checkbox" />
          <span>{tx(locale, "Je détiens les droits sur la photo", "I hold the rights to the photo")}</span>
        </label>
        <button className="ps-primary" type="submit">{tx(locale, "Ajouter", "Add")}</button>
      </form>
      <Empty
        title={tx(locale, "Aucun article publié", "No published item")}
        text={tx(locale, "Cinq articles validés sont nécessaires avant l’ouverture au public.", "Five verified items are required before the public opening.")}
        action={tx(locale, "Voir l’aperçu client", "See the customer preview")}
        href={`/${locale}/restaurants`}
      />
    </section>
  );
}

function Hours({ locale }: { locale: Locale }) {
  const days = locale === "fr"
    ? ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return (
    <section className="ps-sheet">
      <h1>{tx(locale, "Horaires", "Hours")}</h1>
      <ul className="ps-hours">
        {days.map((day) => (
          <li key={day}>
            <strong>{day}</strong>
            <input aria-label={tx(locale, `${day} ouverture`, `${day} opens`)} type="time" />
            <input aria-label={tx(locale, `${day} fermeture`, `${day} closes`)} type="time" />
          </li>
        ))}
      </ul>
      <Field label={tx(locale, "Dernière commande", "Last order")} name="cutoff" type="time" />
    </section>
  );
}

function Statements({ locale }: { locale: Locale }) {
  return (
    <section className="ps-sheet">
      <h1>{tx(locale, "Relevés", "Statements")}</h1>
      <div className="ps-metrics">
        <Metric label={tx(locale, "Ventes", "Sales")} />
        <Metric label={tx(locale, "Commissions", "Commissions")} />
        <Metric label={tx(locale, "À payer", "Payout")} />
      </div>
      <p className="ps-note">{tx(locale, "Les montants viennent des commandes de la semaine, pas d’un exemple.", "Amounts come from the week’s orders, not from a sample.")}</p>
    </section>
  );
}

function Courier({ locale, screenId }: { locale: Locale; screenId: string }) {
  const [online, setOnline] = useState(false);
  if (screenId === "S-52") {
    return (
      <form className="ps-sheet" onSubmit={(event) => event.preventDefault()}>
        <h1>{tx(locale, "Remise", "Handover")}</h1>
        <Field label={tx(locale, "Code à 4 chiffres", "4-digit code")} name="code" required placeholder="0000" />
        <p className="ps-note">{tx(locale, "5 essais. Si le client est injoignable : 5 minutes, deux appels, un message, puis déclarer l’échec.", "5 attempts. If the customer cannot be reached: 5 minutes, two calls, one message, then report failure.")}</p>
        <button className="ps-primary" type="submit">{tx(locale, "Confirmer la remise", "Confirm handover")}</button>
      </form>
    );
  }
  if (screenId === "S-53") {
    return (
      <section className="ps-sheet">
        <h1>{tx(locale, "Gains", "Earnings")}</h1>
        <div className="ps-metrics">
          <Metric label={tx(locale, "Courses", "Trips")} />
          <Metric label={tx(locale, "Primes", "Bonuses")} />
          <Metric label={tx(locale, "Cash à reverser", "Cash to return")} />
        </div>
      </section>
    );
  }
  return (
    <section className="ps-sheet">
      <div className="ps-online">
        <div>
          <h1>{screenId === "S-51" ? tx(locale, "Course en cours", "Active trip") : tx(locale, "Mes courses", "My trips")}</h1>
          <p>{online ? tx(locale, "En ligne", "Online") : tx(locale, "Hors ligne", "Offline")}</p>
        </div>
        <button aria-pressed={online} className="ps-switch" onClick={() => setOnline((value) => !value)} type="button">
          <span />
        </button>
      </div>
      {screenId === "S-51" ? (
        <>
          <div className="ps-map"><span className="ps-pin"><Icon name="pin" /></span></div>
          <ol className="ps-steps">
            <li>{tx(locale, "Récupérer", "Pick up")}</li>
            <li>{tx(locale, "En route", "On the way")}</li>
            <li>{tx(locale, "Remise", "Handover")}</li>
          </ol>
        </>
      ) : (
        <Empty
          title={tx(locale, "Aucune course assignée", "No trip assigned")}
          text={tx(locale, "Passe en ligne pour recevoir une course.", "Go online to receive a trip.")}
          action={tx(locale, "Voir les gains", "See earnings")}
          href={`/${locale}/livreur/gains`}
        />
      )}
    </section>
  );
}

function Ops({ locale, screen }: { locale: Locale; screen: ScreenDefinition }) {
  return (
    <section className="ps-sheet ps-wide">
      <p className="ps-kicker">{screen.id}</p>
      <h1>{screen.title[locale]}</h1>
      <p className="ps-lead">{screen.description[locale]}</p>
      <div className="ps-metrics">
        <Metric label={tx(locale, "Ce soir", "Tonight")} />
        <Metric label={tx(locale, "En attente", "Waiting")} />
        <Metric label={tx(locale, "À traiter", "To handle")} />
      </div>
      <div className="ps-table-wrap">
        <table className="ps-table">
          <thead>
            <tr>
              <th>{tx(locale, "Élément", "Item")}</th>
              <th>{tx(locale, "État", "Status")}</th>
              <th>{tx(locale, "Action", "Action")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={3}>
                {tx(locale, "Rien à traiter. Les lignes réelles arrivent ici, filtrables.", "Nothing to handle. Live rows arrive here and can be filtered.")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul className="ps-rules">
        {screen.sections.map((section) => (
          <li key={section[locale]}>{section[locale]}</li>
        ))}
      </ul>
    </section>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="ps-section">{children}</h2>;
}

function Empty({
  title,
  text,
  action,
  href,
}: {
  title: string;
  text: string;
  action: string;
  href: string;
}) {
  return (
    <div className="ps-empty">
      <strong>{title}</strong>
      <p>{text}</p>
      <Link href={href}>{action}</Link>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="ps-field">
      <span>{label}</span>
      <input defaultValue={defaultValue} name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}

function Metric({ label }: { label: string }) {
  return (
    <article className="ps-metric">
      <span>{label}</span>
      <strong className="num">—</strong>
    </article>
  );
}
