export type Locale = "fr" | "en";
export type ScreenGroup = "client" | "partner" | "courier" | "operations";
export type LocalizedText = Record<Locale, string>;

export type ScreenDefinition = {
  id: string;
  group: ScreenGroup;
  role: LocalizedText;
  href: string;
  title: LocalizedText;
  description: LocalizedText;
  sections: LocalizedText[];
  next?: string[];
  sensitive?: boolean;
};

function defineScreen(
  id: string,
  group: ScreenGroup,
  role: LocalizedText,
  href: string,
  title: LocalizedText,
  description: LocalizedText,
  sections: LocalizedText[],
  options: { next?: string[]; sensitive?: boolean } = {},
): ScreenDefinition {
  return { id, group, role, href, title, description, sections, ...options };
}

const client = { fr: "Public / Client", en: "Public / Customer" };
const partner = { fr: "Partenaire", en: "Partner" };
const courier = { fr: "Livreur", en: "Courier" };
const operator = { fr: "Agent / Admin", en: "Agent / Admin" };

export const screens: ScreenDefinition[] = [
  defineScreen(
    "S-01", "client", client, "/", { fr: "Choisir une adresse", en: "Choose an address" },
    { fr: "Ville fixée à Douala ; quartier et rue ou repère en saisie libre. Le GPS facultatif est vérifié dans la zone de Douala.", en: "City fixed to Douala; neighbourhood and street or landmark entered freely. Optional GPS is checked against Douala coverage." },
    [
      { fr: "Aucune enseigne n’est affichée avant la sélection d’une adresse.", en: "No shops are shown until an address is selected." },
      { fr: "Tout quartier de Douala reste accepté même s’il est absent des suggestions ; la liste ne bloque jamais la saisie.", en: "Any Douala neighbourhood is accepted even if missing from suggestions; the list never blocks manual entry." },
      { fr: "Les quartiers fréquents et adresses récentes sont réservés aux clients connectés ; le GPS est facultatif.", en: "Frequent neighbourhoods and recent addresses are only for signed-in customers; GPS is optional." },
    ],
    { next: ["S-02"] },
  ),
  defineScreen(
    "S-02", "client", client, "/adresse/confirmer", { fr: "Confirmer l’adresse", en: "Confirm the address" },
    { fr: "Placer un repère précis sur la carte, puis compléter les instructions de livraison.", en: "Pin the precise location on the map, then add delivery instructions." },
    [
      { fr: "La carte et le géocodage attendent un fournisseur et les données de Douala.", en: "The map and geocoding need a provider and Douala map data." },
      { fr: "Le repère est obligatoire ; l’adresse principale est un choix explicite.", en: "A landmark is required; setting a primary address is optional." },
    ],
    { next: ["S-03", "S-04"], sensitive: true },
  ),
  defineScreen(
    "S-03", "client", client, "/zone-indisponible", { fr: "Livraison uniquement à Douala", en: "Delivery in Douala only" },
    { fr: "État affiché lorsque la position GPS est hors de la zone de livraison de Douala.", en: "Shown when GPS coordinates fall outside Douala delivery coverage." },
    [
      { fr: "Le message précise : « Nous livrons uniquement à Douala pour le moment ».", en: "The message says: “We only deliver in Douala for now”." },
      { fr: "Une adresse saisie manuellement à Douala n’est jamais refusée parce que son quartier manque à la liste.", en: "A manually entered Douala address is never rejected because its neighbourhood is missing from the list." },
    ],
    { next: ["S-01", "S-05"] },
  ),
  defineScreen(
    "S-04", "client", client, "/accueil", { fr: "Accueil après saisie de l’adresse", en: "Home after entering an address" },
    { fr: "Rayons, recherche, offres et raccourcis adaptés à la zone et à l’heure.", en: "Categories, search, offers and shortcuts tailored to the zone and time." },
    [
      { fr: "Les promotions, packs et commerces apparaîtront uniquement après activation et validation.", en: "Offers, bundles and shops appear only after activation and verification." },
      { fr: "Sans commerce ouvert, proposer les pharmacies de garde vérifiées et la commande vocale.", en: "When no shop is open, offer verified on-duty pharmacies and voice ordering." },
      { fr: "Le badge de garde exige un calendrier officiel.", en: "An on-duty badge requires an official schedule." },
    ],
    { next: ["S-05", "S-06", "S-07", "S-21", "S-22", "S-24"] },
  ),
  defineScreen(
    "S-05", "client", client, "/restaurants", { fr: "Restaurants", en: "Restaurants" },
    { fr: "Liste paginée de 20 résultats, filtrable et triable par pertinence, distance, délai ou note.", en: "Paginated list of 20, filterable and sortable by relevance, distance, delivery time or rating." },
    [
      { fr: "Filtres : ouvert, rapide, offres et cuisine.", en: "Filters: open, fast, offers and cuisine." },
      { fr: "Cache de liste prévu : 60 secondes par zone.", en: "Planned list cache: 60 seconds per zone." },
      { fr: "Aucun partenaire n’est encore validé pour le catalogue public.", en: "No partner is verified for the public catalogue yet." },
    ],
    { next: ["S-08"] },
  ),
  defineScreen(
    "S-06", "client", client, "/pharmacies", { fr: "Pharmacies", en: "Pharmacies" },
    { fr: "Liste des pharmacies desservant l’adresse, avec horaires vérifiés.", en: "List pharmacies serving the address, with verified hours." },
    [
      { fr: "N’afficher « de garde » qu’avec un calendrier officiel ; sinon montrer l’heure de fermeture.", en: "Show “on duty” only with an official schedule; otherwise show closing time." },
      { fr: "La mention réglementaire et la vente de médicaments requièrent validation juridique et partenariats.", en: "The regulatory notice and medicine sales require legal approval and pharmacy partners." },
    ],
    { next: ["S-09"] },
  ),
  defineScreen(
    "S-07", "client", client, "/recherche", { fr: "Recherche", en: "Search" },
    { fr: "Recherche groupée par enseignes, plats et rayons ; suggestions après 300 ms.", en: "Search grouped by shops, dishes and categories; suggestions after 300 ms." },
    [
      { fr: "Recherche plein texte et historique récent à brancher.", en: "Full-text search and recent history still need integration." },
      { fr: "Sélectionner un plat ouvre sa fiche avant l’ajout au panier.", en: "Selecting a dish opens its detail before adding it to a cart." },
    ],
    { next: ["S-08", "S-09", "S-12"] },
  ),
  defineScreen(
    "S-08", "client", client, "/e/restaurant-apercu", { fr: "Restaurant", en: "Restaurant" },
    { fr: "Fiche enseigne avec horaires, avis, sections, articles et panier ; consultable même fermée.", en: "Shop page with hours, reviews, sections, items and cart; viewable even when closed." },
    [
      { fr: "Une enseigne fermée reste consultable mais ne peut pas recevoir de commande.", en: "A closed shop remains viewable but cannot accept orders." },
      { fr: "Le catalogue public exige un accord, des horaires et au moins cinq articles validés.", en: "The public catalogue requires a partner agreement, hours and at least five verified items." },
      { fr: "Cache de 60 s prévu ; le catalogue est revalidé après modification.", en: "60-second cache planned; catalogue is revalidated after edits." },
    ],
    { next: ["S-10", "S-11", "S-12", "S-13"] },
  ),
  defineScreen(
    "S-09", "client", client, "/pharmacie/apercu", { fr: "Pharmacie", en: "Pharmacy" },
    { fr: "Page de pharmacie ; seuls les articles non médicaux sont ajoutables directement.", en: "Pharmacy page; only non-medicine items can be added directly." },
    [
      { fr: "Aucun médicament ne sera vendu directement par la plateforme.", en: "The platform will not sell medicines directly." },
      { fr: "Les ordonnances suivent une validation par la pharmacie.", en: "Prescriptions require pharmacy validation." },
    ],
    { next: ["S-25"] },
  ),
  defineScreen(
    "S-10", "client", client, "/e/restaurant-apercu/informations", { fr: "Informations du restaurant", en: "Restaurant information" },
    { fr: "Catégories, plats et ingrédients, lieu, horaires, dernière commande et moyens de paiement.", en: "Categories, dishes and ingredients, location, hours, last order and payment methods." },
    [
      { fr: "Les données affichées doivent être confirmées par le partenaire.", en: "Displayed details must be confirmed by the partner." },
      { fr: "La carte statique est chargée à la demande.", en: "The static map is loaded on demand." },
    ],
    { next: ["S-08"] },
  ),
  defineScreen(
    "S-11", "client", client, "/e/restaurant-apercu/avis", { fr: "Notes et avis", en: "Ratings and reviews" },
    { fr: "Répartition des notes, filtres et avis avec étiquettes.", en: "Rating breakdown, filters and tagged reviews." },
    [
      { fr: "Seul un client ayant reçu sa commande peut laisser un avis.", en: "Only a customer with a delivered order can review." },
      { fr: "Les avis et votes « utile » sont indisponibles sans données connectées.", en: "Reviews and helpful votes are unavailable until data is connected." },
    ],
    { next: ["S-08"] },
  ),
  defineScreen(
    "S-12", "client", client, "/article/apercu", { fr: "Détail d’un article", en: "Item details" },
    { fr: "Photo autorisée, description, ingrédients, niveau de piment, options et quantité.", en: "Licensed photo, description, ingredients, spice level, options and quantity." },
    [
      { fr: "Les groupes d’options obligatoires doivent être complétés avant l’ajout.", en: "Required option groups must be completed before adding." },
      { fr: "Aucune photo ou option fictive ne sera affichée.", en: "No invented photos or options are displayed." },
    ],
    { next: ["S-13", "S-14"] },
  ),
  defineScreen(
    "S-13", "client", client, "/paniers", { fr: "Paniers par enseigne", en: "Carts by shop" },
    { fr: "Une carte par enseigne avec articles, quantités, frais et délai.", en: "One card per shop with items, quantities, fees and delivery time." },
    [
      { fr: "Un panier est limité à une enseigne. Ajouter ailleurs demande quoi faire du panier actuel.", en: "A cart is limited to one shop. Adding from another asks what to do with the current cart." },
      { fr: "Les lignes et totaux viennent du serveur avant commande.", en: "Items and totals are server-calculated before ordering." },
    ],
    { next: ["S-14"] },
  ),
  defineScreen(
    "S-14", "client", client, "/panier/restaurant-apercu", { fr: "Panier", en: "Cart" },
    { fr: "Quantités, suggestions validées, seuil de livraison offerte et minimum de commande.", en: "Quantities, verified suggestions, free-delivery threshold and order minimum." },
    [
      { fr: "Le minimum de commande dépend de la zone ; le total doit être recalculé côté serveur.", en: "The order minimum depends on the zone; the server must calculate the total." },
      { fr: "Impossible de commander sans commerce actif et catalogue vérifié.", en: "Ordering requires an active shop and verified catalogue." },
    ],
    { next: ["S-15"] },
  ),
  defineScreen(
    "S-15", "client", client, "/commande/livraison", { fr: "Mode de livraison", en: "Delivery options" },
    { fr: "Saisir librement le quartier, un repère et les instructions de livraison ; le GPS est facultatif et vérifié dans la zone de Douala.", en: "Enter any neighbourhood, landmark and delivery instructions; optional GPS is checked against Douala coverage." },
    [
      { fr: "Les frais de livraison restent nuls tant qu’un agent ne les a pas fixés.", en: "Delivery fees remain unset until an agent enters a quote." },
      { fr: "La saisie de l’adresse ne déclenche aucun paiement.", en: "Entering an address does not trigger payment." },
    ],
    { next: ["S-17"], sensitive: true },
  ),
  defineScreen(
    "S-16", "client", client, "/commande/offres", { fr: "Offres et pourboire", en: "Offers and tip" },
    { fr: "Ancienne étape retirée du flux sans paiement.", en: "Legacy step removed from the no-payment flow." },
    [
      { fr: "Cette route redirige vers le récapitulatif de commande.", en: "This route redirects to the order summary." },
    ],
    { next: ["S-17"], sensitive: true },
  ),
  defineScreen(
    "S-17", "client", client, "/commande/recapitulatif", { fr: "Récapitulatif", en: "Order summary" },
    { fr: "Vérifier les articles puis envoyer la commande sans paiement ; les frais de livraison seront confirmés ensuite.", en: "Review items and submit without payment; delivery fees are confirmed later." },
    [
      { fr: "Les prix sont recalculés côté serveur à l’envoi ; aucun frais de livraison n’est supposé.", en: "Prices are recalculated server-side on submission; no delivery fee is assumed." },
      { fr: "Aucun paiement n’est demandé dans ce flux.", en: "No payment is requested in this flow." },
    ],
    { next: ["S-20"], sensitive: true },
  ),
  defineScreen(
    "S-18", "client", client, "/commande/paiement", { fr: "Paiement", en: "Payment" },
    { fr: "Mobile Money MTN ou Orange ; espèces selon conditions ; carte indiquée bientôt.", en: "MTN or Orange Mobile Money; cash when eligible; card marked coming soon." },
    [
      { fr: "Aucun paiement ne peut être simulé : agrégateur, compte marchand et webhook signés requis.", en: "Payments cannot be simulated: a provider, merchant account and signed webhooks are required." },
      { fr: "Mobile Money attend une confirmation, vérifiée toutes les 3 s pendant au plus 5 min.", en: "Mobile Money awaits confirmation, polled every 3 s for up to 5 minutes." },
      { fr: "CGV et confidentialité doivent être acceptées avec leur version.", en: "Terms and privacy must be accepted with their version." },
    ],
    { next: ["S-19"], sensitive: true },
  ),
  defineScreen(
    "S-19", "client", client, "/commande/apercu/confirmation", { fr: "Commande confirmée", en: "Order confirmed" },
    { fr: "Confirmation, code de remise, arrivée estimée, garantie éventuelle et reçu.", en: "Confirmation, handover code, estimated arrival, any guarantee and receipt." },
    [
      { fr: "Cet écran ne s’affiche qu’après confirmation serveur du paiement et de la commande.", en: "This screen appears only after the server confirms payment and order." },
      { fr: "Aucun code ni délai fictif n’est généré.", en: "No invented code or delivery estimate is generated." },
    ],
    { next: ["S-20", "S-28"], sensitive: true },
  ),
  defineScreen(
    "S-20", "client", client, "/commande/apercu/suivi", { fr: "Suivi de commande", en: "Track an order" },
    { fr: "Frise de suivi du devis de frais, avec acceptation ou refus par le client.", en: "Track the delivery-fee quote and accept or decline it." },
    [
      { fr: "L’acceptation vérifie le montant et la version affichés ; l’expiration est contrôlée par la base.", en: "Acceptance verifies the displayed amount and version; the database checks expiry." },
      { fr: "Les notifications restent dans l’application ; e-mail et SMS ne sont pas activés.", en: "Notifications are in-app only; email and SMS are not enabled." },
    ],
    { next: ["S-28", "S-32"], sensitive: true },
  ),
  defineScreen(
    "S-21", "client", client, "/vocal", { fr: "Commande vocale", en: "Voice order" },
    { fr: "Enregistrer au plus 30 secondes, relire et corriger la transcription puis valider les propositions.", en: "Record up to 30 seconds, review and edit transcription, then validate suggestions." },
    [
      { fr: "Accord micro explicite ; enregistrement annulable.", en: "Explicit microphone consent; recording can be cancelled." },
      { fr: "Un agent doit confirmer les éléments incertains avant toute commande.", en: "An agent must confirm uncertain items before any order." },
      { fr: "Audio supprimé après traitement ; fournisseur et agent non configurés.", en: "Audio deleted after processing; provider and agent are not configured." },
    ],
    { next: ["S-22"] },
  ),
  defineScreen(
    "S-22", "client", client, "/groupe/nouveau", { fr: "Créer une commande groupée", en: "Create a group order" },
    { fr: "Choisir une enseigne, définir l’échéance et partager un lien de participation.", en: "Choose a shop, set a deadline and share a participation link." },
    [
      { fr: "Le groupe part lorsque tous ont payé ou à l’échéance ; les impayés sont exclus.", en: "The group launches when all have paid or at the deadline; unpaid participants are excluded." },
      { fr: "L’annulation par l’organisateur entraîne le remboursement de chacun.", en: "Cancellation by the organiser refunds every participant." },
      { fr: "Paiements partagés et remboursements attendent l’intégration serveur.", en: "Shared payments and refunds require server integration." },
    ],
    { next: ["S-23"], sensitive: true },
  ),
  defineScreen(
    "S-23", "client", client, "/g/apercu", { fr: "Rejoindre une commande groupée", en: "Join a group order" },
    { fr: "Les invités consultent le groupe sans compte ; un compte est nécessaire pour ajouter et payer.", en: "Guests can view without an account; an account is needed to add items and pay." },
    [
      { fr: "Chaque participant voit uniquement sa part et le total du groupe.", en: "Each participant sees only their own share and the group total." },
      { fr: "Lien et données individuels nécessitent un jeton sécurisé.", en: "The link and participant data require a secure token." },
    ],
    { next: ["S-33", "S-12"], sensitive: true },
  ),
  defineScreen(
    "S-24", "client", client, "/courses/nouvelle", { fr: "Demander une course", en: "Request an errand" },
    { fr: "Décrire l’achat, joindre une photo ou un vocal, puis demander un devis.", en: "Describe the purchase, optionally attach a photo or voice note, then request a quote." },
    [
      { fr: "Marge de sécurité du devis : 15–20 % ; paiement avant l’achat.", en: "Quote safety margin: 15–20%; payment is required before purchase." },
      { fr: "Plafond : 20 000 FCFA pour un nouveau client, 50 000 après trois commandes.", en: "Limit: 20,000 XAF for a new customer; 50,000 after three orders." },
      { fr: "Objets exclus selon les règles de sécurité et la réglementation.", en: "Prohibited items remain subject to safety and regulatory rules." },
    ],
    { next: ["S-17"], sensitive: true },
  ),
  defineScreen(
    "S-25", "client", client, "/ordonnance/apercu", { fr: "Envoyer une ordonnance", en: "Submit a prescription" },
    { fr: "Capturer une ordonnance à destination exclusive d’une pharmacie.", en: "Submit a prescription exclusively to a pharmacy." },
    [
      { fr: "Consentement explicite pour les données de santé.", en: "Explicit consent is required for health data." },
      { fr: "Fichier privé avec URL signée ; suppression prévue après 30 jours.", en: "Private file with a signed URL; deletion scheduled after 30 days." },
      { fr: "Téléversement bloqué jusqu’à l’activation du stockage privé et du traitement de purge.", en: "Upload stays blocked until private storage and deletion processing are configured." },
    ],
    { next: ["S-26"], sensitive: true },
  ),
  defineScreen(
    "S-26", "client", client, "/ordonnance/apercu/suivi", { fr: "Suivi de l’ordonnance", en: "Track prescription" },
    { fr: "Afficher les états reçue, en validation, prix confirmé et sac scellé.", en: "Show received, under review, price confirmed and sealed bag states." },
    [
      { fr: "L’achat attend validation de la pharmacie et acceptation du prix.", en: "Purchase waits for pharmacy review and price approval." },
      { fr: "Ne pas afficher de médicament ou de conseil médical non validé.", en: "Do not show unverified medicines or medical advice." },
    ],
    { next: ["S-18", "S-20"], sensitive: true },
  ),
  defineScreen(
    "S-27", "client", client, "/commandes", { fr: "Mes commandes", en: "My orders" },
    { fr: "Commandes en cours en premier, puis historique avec enseigne, date, total et statut.", en: "Active orders first, followed by history with shop, date, total and status." },
    [
      { fr: "Données privées accessibles au seul propriétaire authentifié.", en: "Private data is accessible only to the authenticated owner." },
      { fr: "Aucune commande de démonstration n’est inventée.", en: "No sample orders are fabricated." },
    ],
    { next: ["S-20", "S-28"], sensitive: true },
  ),
  defineScreen(
    "S-28", "client", client, "/commandes/apercu", { fr: "Détail d’une commande passée", en: "Past order details" },
    { fr: "Lignes, frais, reçu, recommandation revalidée, avis admissible et aide.", en: "Items, fees, receipt, revalidated reorder, eligible review and support." },
    [
      { fr: "La disponibilité et les prix sont revérifiés avant toute nouvelle commande.", en: "Availability and prices are checked again before reordering." },
      { fr: "Un avis n’est permis qu’après livraison confirmée.", en: "A review is allowed only after confirmed delivery." },
    ],
    { next: ["S-14", "S-11", "S-32"], sensitive: true },
  ),
  defineScreen(
    "S-29", "client", client, "/compte", { fr: "Mon compte", en: "My account" },
    { fr: "Profil, adresses, parrainage, points, préférences, aide, documents et déconnexion.", en: "Profile, addresses, referrals, points, preferences, support, legal documents and sign out." },
    [
      { fr: "Les points proviennent du registre de fidélité ; aucune valeur n’est simulée.", en: "Points come from the loyalty ledger; no balance is simulated." },
      { fr: "Les données du compte exigent une session authentifiée.", en: "Account data requires an authenticated session." },
    ],
    { next: ["S-30", "S-31", "S-32", "S-36"], sensitive: true },
  ),
  defineScreen(
    "S-30", "client", client, "/compte/adresses", { fr: "Mes adresses", en: "My addresses" },
    { fr: "Consulter, ajouter ou définir une adresse principale sur une carte.", en: "View, add or set a primary address using a map." },
    [
      { fr: "Carte et géocodage ne sont pas configurés.", en: "Map and geocoding are not configured." },
      { fr: "Les adresses sont privées et ne sont jamais mises en cache.", en: "Addresses are private and are never cached." },
    ],
    { next: ["S-02"], sensitive: true },
  ),
  defineScreen(
    "S-31", "client", client, "/compte/preferences", { fr: "Préférences", en: "Preferences" },
    { fr: "Choisir la langue, le thème auto/clair/sombre et les canaux de notification.", en: "Choose language, auto/light/dark theme and notification channels." },
    [
      { fr: "Préférences de notification et de thème à modéliser côté compte.", en: "Notification and theme preferences need an account data model." },
      { fr: "Le thème nuit automatique suit l’heure de Douala ; réglage manuel à connecter.", en: "Automatic night mode follows Douala time; manual preference still needs wiring." },
    ],
    { next: ["S-29"], sensitive: true },
  ),
  defineScreen(
    "S-32", "client", client, "/aide/reclamation", { fr: "Réclamation", en: "Report an issue" },
    { fr: "Choisir la commande, le motif, décrire le problème et joindre une preuve facultative.", en: "Choose an order, issue type, describe the problem and optionally attach evidence." },
    [
      { fr: "Motifs : retard, article manquant, erreur, qualité ou autre.", en: "Types: delay, missing item, wrong item, quality or other." },
      { fr: "La pièce jointe nécessite un champ sécurisé, absent du schéma actuel.", en: "Attachments need secure storage; the current schema has no attachment field." },
      { fr: "Envoi WhatsApp indisponible tant que le numéro officiel n’est pas défini.", en: "WhatsApp submission is unavailable until an official number is set." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-33", "client", client, "/connexion", { fr: "Connexion", en: "Sign in" },
    { fr: "Connexion par email et mot de passe, avec inscription et récupération.", en: "Sign in with email and password, with sign-up and recovery." },
    [
      { fr: "Même erreur affichée que le compte existe ou non ; limitation et anti-robot requis.", en: "Show the same error whether or not an account exists; rate limiting and bot protection required." },
      { fr: "Supabase Auth est branché côté serveur quand les variables du projet sont configurées ; les rôles sont lus dans user_roles.", en: "Supabase Auth is wired server-side when project variables are configured; roles are read from user_roles." },
    ],
    { next: ["S-34", "S-35"], sensitive: true },
  ),
  defineScreen(
    "S-34", "client", client, "/inscription", { fr: "Créer un compte", en: "Create an account" },
    { fr: "Nom, email, mot de passe robuste, âge et acceptation légale.", en: "Name, email, strong password, age confirmation and legal consent." },
    [
      { fr: "Téléphone demandé avant la première commande.", en: "Phone number is required before the first order." },
      { fr: "Confirmation email et création du profil/rôle client gérées par Supabase ; fournisseur email à configurer.", en: "Email confirmation and customer profile/role creation are handled by Supabase; configure its email provider." },
      { fr: "Mot de passe transmis uniquement à Supabase Auth ; aucune copie n’est stockée par l’application.", en: "Password is sent only to Supabase Auth; the application does not store a copy." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-35", "client", client, "/mot-de-passe/oublie", { fr: "Récupérer le mot de passe", en: "Recover password" },
    { fr: "Demander un lien de réinitialisation, puis créer un nouveau mot de passe avec jeton court.", en: "Request a reset link, then set a new password with a short-lived token." },
    [
      { fr: "Demande générique et routes de rappel/réinitialisation disponibles ; le fournisseur email doit être configuré.", en: "Generic request and callback/reset routes are available; configure the email provider." },
      { fr: "Toujours éviter de révéler si une adresse email est enregistrée.", en: "Never reveal whether an email address is registered." },
    ],
    { next: ["S-33"], sensitive: true },
  ),
  defineScreen(
    "S-36", "client", client, "/legal/conditions", { fr: "Informations légales", en: "Legal information" },
    { fr: "Mentions, confidentialité, cookies, CGU/CGV et remboursements versionnés.", en: "Versioned notices, privacy, cookies, terms and refund policy." },
    [
      { fr: "Textes et identité légale à faire approuver avant lancement.", en: "Legal text and company identity require approval before launch." },
      { fr: "Ne pas présenter ce contenu comme un avis juridique.", en: "Do not present this content as legal advice." },
    ],
    { next: ["S-33", "S-29"] },
  ),
  defineScreen(
    "S-37", "client", client, "/etat/systeme", { fr: "États système", en: "System states" },
    { fr: "Vues dédiées pour 404, erreur 500, hors ligne et maintenance.", en: "Dedicated views for 404, server error, offline and maintenance." },
    [
      { fr: "Chaque état propose une explication, une action utile et la conservation des saisies.", en: "Each state provides an explanation, a useful action and preserves entered data." },
      { fr: "Réseau hors ligne et erreur serveur sont indiqués sans masquer la panne.", en: "Offline and server errors are communicated clearly, never hidden." },
    ],
    { next: ["S-01"] },
  ),
  defineScreen(
    "S-40", "partner", partner, "/pro", { fr: "Commandes partenaire", en: "Partner orders" },
    { fr: "Commandes nouvelles avec minuteur, alertes sonores et actions accepter ou refuser.", en: "New orders with timer, sound alert, and accept or reject actions." },
    [
      { fr: "Refus avec motif ; progression jusqu’à « prête ».", en: "Rejection requires a reason; progress orders to “ready”." },
      { fr: "Le téléphone du client n’est jamais révélé au partenaire.", en: "Customer phone numbers are never exposed to partners." },
      { fr: "Indicateurs jour/semaine alimentés depuis les commandes réelles.", en: "Daily and weekly metrics come from real orders." },
    ],
    { next: ["S-41", "S-42", "S-43", "S-44"], sensitive: true },
  ),
  defineScreen(
    "S-41", "partner", partner, "/pro/commandes/apercu", { fr: "Détail de commande partenaire", en: "Partner order details" },
    { fr: "Articles, notes, statut et historique d’une commande assignée.", en: "Items, notes, status and history for an assigned order." },
    [
      { fr: "Transitions effectuées par la fonction serveur autorisée.", en: "Transitions go through the authorized server function." },
      { fr: "Masquer les données client non nécessaires.", en: "Hide unnecessary customer data." },
    ],
    { next: ["S-40"], sensitive: true },
  ),
  defineScreen(
    "S-42", "partner", partner, "/pro/catalogue", { fr: "Catalogue partenaire", en: "Partner catalogue" },
    { fr: "Gérer les sections, articles, prix, disponibilité, options et photos.", en: "Manage sections, items, prices, availability, options and photos." },
    [
      { fr: "Photo acceptée seulement avec confirmation des droits.", en: "Photos require confirmation of usage rights." },
      { fr: "Aperçu client et validation avant publication.", en: "Customer preview and verification before publication." },
      { fr: "Aucun article n’est ajouté en l’absence de données réelles.", en: "No items are invented when real data is unavailable." },
    ],
    { next: ["S-08"], sensitive: true },
  ),
  defineScreen(
    "S-43", "partner", partner, "/pro/horaires", { fr: "Horaires et fermetures", en: "Hours and closures" },
    { fr: "Configurer les plages par jour, les fermetures exceptionnelles et l’heure limite.", en: "Configure daily opening periods, exceptions and last-order cutoff." },
    [
      { fr: "Les horaires validés déterminent l’éligibilité des commandes.", en: "Verified opening hours determine order eligibility." },
      { fr: "Validation des plages chevauchées et fermetures à finaliser.", en: "Overlapping periods and closure validation need final rules." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-44", "partner", partner, "/pro/releves", { fr: "Relevés partenaire", en: "Partner statements" },
    { fr: "Consulter les ventes, commissions et paiements par semaine.", en: "View weekly sales, commissions and payouts." },
    [
      { fr: "Formule de commission et règlement à valider avec chaque partenaire.", en: "Commission formula and settlement terms require partner agreement." },
      { fr: "Aucun chiffre de vente fictif n’est affiché.", en: "No fabricated sales figures are shown." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-50", "courier", courier, "/livreur", { fr: "Mes courses", en: "My deliveries" },
    { fr: "Présence en ligne, courses assignées et cash de la soirée.", en: "Online availability, assigned deliveries and cash for the shift." },
    [
      { fr: "La disponibilité dépend d’un compte livreur validé.", en: "Availability requires a verified courier account." },
      { fr: "Aucune course n’est attribuée dans cette prévisualisation.", en: "No delivery is assigned in this preview." },
    ],
    { next: ["S-51", "S-53"], sensitive: true },
  ),
  defineScreen(
    "S-51", "courier", courier, "/livreur/course", { fr: "Course en cours", en: "Active delivery" },
    { fr: "Itinéraire, récupérer, démarrer la livraison, appeler ou contacter par WhatsApp.", en: "Route, pickup, start delivery, call or contact by WhatsApp." },
    [
      { fr: "Position partagée toutes les 5–10 secondes pendant la course uniquement.", en: "Location is shared every 5–10 seconds during the active delivery only." },
      { fr: "Itinéraire externe et cartes requièrent un fournisseur configuré.", en: "External navigation and maps require a configured provider." },
    ],
    { next: ["S-52"], sensitive: true },
  ),
  defineScreen(
    "S-52", "courier", courier, "/livreur/remise", { fr: "Remise ou échec de livraison", en: "Handover or failed delivery" },
    { fr: "Saisir le code à quatre chiffres ou suivre la procédure d’échec.", en: "Enter the four-digit code or follow the failed-delivery procedure." },
    [
      { fr: "Maximum cinq essais du code.", en: "Maximum five code attempts." },
      { fr: "Client injoignable : attendre 5 minutes, appeler deux fois, envoyer un message puis déclarer l’échec.", en: "Customer unreachable: wait 5 minutes, call twice, message, then report failure." },
      { fr: "Contrôle alcool et sac pharmacie scellé selon les procédures.", en: "Alcohol checks and sealed pharmacy bags follow operating procedures." },
    ],
    { next: ["S-50"], sensitive: true },
  ),
  defineScreen(
    "S-53", "courier", courier, "/livreur/gains", { fr: "Mes gains", en: "My earnings" },
    { fr: "Courses réalisées, primes et espèces à reverser.", en: "Completed deliveries, bonuses and cash to return." },
    [
      { fr: "Rémunération et reversals selon l’accord livreur validé.", en: "Earnings and cash returns follow the verified courier agreement." },
      { fr: "Aucun revenu fictif n’est affiché.", en: "No fabricated earnings are shown." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-60", "operations", operator, "/ops", { fr: "Tableau de bord opérations", en: "Operations dashboard" },
    { fr: "Commandes de soirée, panier moyen, garanties et paiements en attente.", en: "Evening orders, average basket, guarantees and pending payments." },
    [
      { fr: "Agent ou administrateur selon habilitation.", en: "Zone agent or administrator according to permissions." },
      { fr: "Les métriques sont calculées depuis la base réelle, sans valeurs fictives.", en: "Metrics are calculated from the real database, with no fabricated values." },
    ],
    { next: ["S-61", "S-62", "S-64", "S-68"], sensitive: true },
  ),
  defineScreen(
    "S-61", "operations", operator, "/ops/commandes", { fr: "Commandes et dispatch", en: "Orders and dispatch" },
    { fr: "Filtrer par zone et statut ; affecter un livreur et suivre les transitions autorisées.", en: "Filter by zone and status; assign a courier and track allowed transitions." },
    [
      { fr: "Les changements de devis passent par les actions serveur autorisées, avec contrôle du rôle et de la session.", en: "Quote changes use authorized server actions with role and session checks." },
      { fr: "La carte et le suivi ne s’ouvrent que pour les courses actives.", en: "Maps and tracking are available only for active deliveries." },
    ],
    { next: ["S-60", "S-67", "S-68"], sensitive: true },
  ),
  defineScreen(
    "S-62", "operations", operator, "/ops/enseignes", { fr: "Gestion des enseignes", en: "Shop management" },
    { fr: "Suivre les prospects, contacts, horaires, rayon, position et onboarding.", en: "Manage prospects, contacts, hours, radius, location and onboarding." },
    [
      { fr: "Les enseignes initiales sont des prospects non engagés, jamais des partenaires actifs.", en: "Initial shop records are uncommitted prospects, never active partners." },
      { fr: "Import CSV avec aperçu et rapport avant toute écriture.", en: "CSV import shows a preview and report before any writes." },
      { fr: "Activation après accord, horaires, position, rayon et au moins cinq articles validés.", en: "Activate only after agreement, hours, location, radius and at least five verified items." },
    ],
    { next: ["S-63", "S-64"], sensitive: true },
  ),
  defineScreen(
    "S-63", "operations", operator, "/ops/medias", { fr: "Validation des médias", en: "Media review" },
    { fr: "Examiner les médias en attente, approuvés ou refusés et vérifier les droits.", en: "Review pending, approved or rejected media and verify usage rights." },
    [
      { fr: "Les images publiques doivent remplacer uniquement des éléments autorisés.", en: "Public images must replace placeholders only when licensed." },
      { fr: "Le stockage des originaux est privé.", en: "Original media storage is private." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-64", "operations", operator, "/ops/zones", { fr: "Zones et tarifs", en: "Zones and pricing" },
    { fr: "Dessiner les zones et configurer frais, minimums, suppléments et garantie.", en: "Draw zones and configure fees, order minimums, surcharges and guarantee." },
    [
      { fr: "Polygones de Douala non fournis : aucun devis fiable n’est encore possible.", en: "Douala delivery polygons are missing; reliable quotes are not yet possible." },
      { fr: "Tout changement tarifaire doit être audité.", en: "Every pricing change must be audited." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-65", "operations", operator, "/ops/utilisateurs", { fr: "Utilisateurs et rôles", en: "Users and roles" },
    { fr: "Rechercher un utilisateur, suspendre, révoquer des sessions et attribuer des rôles.", en: "Find a user, suspend, revoke sessions and assign roles." },
    [
      { fr: "Les droits d’un agent sur les rôles restent à préciser.", en: "Zone-agent permissions over roles still need definition." },
      { fr: "Chaque changement nécessite une vérification serveur et une trace d’audit.", en: "Every change requires server authorization and an audit record." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-66", "operations", operator, "/ops/vocaux", { fr: "Validation des commandes vocales", en: "Voice review queue" },
    { fr: "Trier la file par confiance, corriger la transcription et confirmer la proposition.", en: "Sort by confidence, correct transcription and confirm the suggestion." },
    [
      { fr: "Toute confiance inférieure à 70 % impose une relecture.", en: "Confidence below 70% always requires human review." },
      { fr: "Ne jamais confirmer automatiquement une commande incertaine.", en: "Never automatically confirm an uncertain order." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-67", "operations", operator, "/ops/remboursements", { fr: "Remboursements", en: "Refunds" },
    { fr: "Examiner les demandes, décision, motif et statut de paiement.", en: "Review requests, decision, reason and payment status." },
    [
      { fr: "Agent : maximum 5 000 FCFA par remboursement et 20 000 FCFA par jour.", en: "Agent limit: 5,000 XAF per refund and 20,000 XAF per day." },
      { fr: "Au-delà, autorisation administrateur requise.", en: "Higher amounts require administrator approval." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-68", "operations", operator, "/ops/reclamations", { fr: "Réclamations clients", en: "Customer issues" },
    { fr: "Trier les tickets, affecter un agent, répondre et clôturer.", en: "Sort tickets, assign an agent, respond and resolve." },
    [
      { fr: "Les pièces jointes exigent un stockage sécurisé et une règle de conservation.", en: "Attachments require secure storage and a retention policy." },
      { fr: "Les messages de l’agent sont traçables.", en: "Agent responses are auditable." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-69", "operations", operator, "/ops/audit", { fr: "Journal d’audit", en: "Audit log" },
    { fr: "Journal en lecture seule, filtrable par acteur et entité.", en: "Read-only log filterable by actor and entity." },
    [
      { fr: "Réservé aux administrateurs.", en: "Administrator access only." },
      { fr: "Les entrées d’audit ne sont pas modifiables depuis l’interface.", en: "Audit entries cannot be edited in the interface." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-70", "operations", operator, "/ops/parametres", { fr: "Paramètres globaux", en: "Global settings" },
    { fr: "Gérer les plafonds, délais, options de fonctionnalités et textes d’offres.", en: "Manage limits, timeouts, feature flags and offer copy." },
    [
      { fr: "Écran attendu administrateur ; détail de chaque réglage à spécifier.", en: "Administrator-only screen; individual settings need specification." },
      { fr: "Tout changement est confirmé et audité.", en: "Every change is confirmed and audited." },
    ],
    { sensitive: true },
  ),
  defineScreen(
    "S-71", "operations", operator, "/ops/promotions", { fr: "Promotions", en: "Promotions" },
    { fr: "Gérer les codes, règles, dates et limites d’utilisation.", en: "Manage promo codes, rules, dates and usage limits." },
    [
      { fr: "Rôle précis à définir entre agent et administrateur.", en: "Exact permissions for agents versus administrators need definition." },
      { fr: "Les règles de remise sont toujours recalculées côté serveur.", en: "Discount rules are always recalculated on the server." },
    ],
    { sensitive: true },
  ),
];

export const screenGroups: Record<ScreenGroup, LocalizedText> = {
  client: { fr: "Client et public", en: "Customer and public" },
  partner: { fr: "Partenaire", en: "Partner" },
  courier: { fr: "Livreur", en: "Courier" },
  operations: { fr: "Agent et administration", en: "Agent and administration" },
};

export function getScreenById(id: string) {
  return screens.find((screen) => screen.id === id);
}

export function getScreenByPath(path: string, pharmacy = false) {
  if (path === "e/restaurant-apercu" && pharmacy) return getScreenById("S-09");

  if (path === "mot-de-passe/reinitialiser") return getScreenById("S-35");
  if (path === "paniers" || /^panier\/[^/]+$/.test(path)) {
    return getScreenById(path === "paniers" ? "S-13" : "S-14");
  }
  if (/^e\/[^/]+\/p\/[^/]+$/.test(path) || /^pharmacie\/[^/]+\/p\/[^/]+$/.test(path)) {
    return getScreenById("S-12");
  }
  if (/^e\/[^/]+$/.test(path)) return getScreenById("S-08");
  if (/^pharmacie\/[^/]+$/.test(path)) return getScreenById("S-09");

  return screens.find((screen) => screen.href.replace(/^\//, "") === path);
}

export function screenHref(locale: Locale, path: string) {
  return `/${locale}${path === "/" ? "" : path}`;
}
