# 0. Décisions prises et lecture du dossier

Le projet part de zéro : il n'y a pas de code existant à auditer. Toutes les décisions ci-dessous viennent de tes réponses ou de recommandations que tu as validées.

| Sujet | Décision | Statut |
|---|---|---|
| Produit | Livraison jour et nuit à Douala : repas, boissons et essentiels, pharmacie via partenaires, courses à la demande | Validé |
| Piliers | Vocal WhatsApp assisté par IA, commande de groupe avec paiement partagé, garantie 30 min sur certains packs, magasin de la nuit élargi | Validé |
| Premier livrable | Site web installable (PWA), bilingue français et anglais | Validé |
| Espaces V1 | Client, partenaire, livreur, administrateur (plus un rôle agent de zone) | Validé |
| Connexion | Email + mot de passe, téléphone obligatoire à la commande ; Google et mode invité plus tard | Validé |
| Base de données | Supabase (PostgreSQL), région Europe, démarches auprès de l'autorité de protection des données, migration possible plus tard | Validé |
| Paiement | Mobile Money par agrégateur dès la V1 (mise en service dès validation du dossier), cash selon historique, carte plus tard | Validé |
| Livraison | Frais par zones (3 zones) + suppléments nuit et pluie + minimum de commande par zone | Validé |
| Notifications | Notification de l'appli, WhatsApp, email | Validé |
| Carte | OpenStreetMap | Validé |
| Ordonnances | Photos conservées 30 jours puis supprimées automatiquement | Validé |
| Remboursements | Administrateur et agent de zone (plafond, validation admin au-dessus) | Validé |
| Réclamations | Formulaire dans l'appli + WhatsApp | Validé |
| Connexion coupée | Panier sauvegardé et commande mise en attente puis envoyée au retour du réseau | Choix de Claude |
| Couverture S-01 | Douala uniquement ; quartiers libres acceptés sans blocage GPS ; géorepérage OSM provisoire avec tampon de 2,5 km | Implémenté ; limite à confirmer auprès d’une source officielle avant lancement |
| Style visuel | Base Ciel (bleu clair vivant, thème jour/nuit) + navigation de Bulles (micro au centre) + anneau de suivi de Nuit néon, un seul système de jetons | Choix de Claude, à confirmer |
| Typographie | Inter partout, conforme à `docs/UX_UI_DESIGN_BRIEF.md` et `web/design/tokens.css` ; Fraunces retirée | Validé par GIRES le 21 novembre 2026 ; décision prioritaire sur la mention Fraunces pour les titres dans `codes/PROMPT_MAITRE.md` |
| Flux commande avec devis | Aucun paiement dans ce bloc ; frais de livraison fixés et audités par admin ; devis à accepter sous 30 min ; expiration sans devis à 120 min ; plafond de garde-fou 5 000 XAF | Validé par GIRES le 21 novembre 2026 ; détails et valeurs configurables dans `docs/plans/flux-commande.md` |
| Nom, SARL | Nom à définir ; SARL choisie, démarches en cours par un tiers | En cours |
| Cash | Réservé aux clients ayant au moins 3 commandes réussies | Validé |
| Code de remise | Code à 4 chiffres à chaque livraison | Validé |
| Client injoignable | Le livreur attend 5 minutes puis applique la procédure | Validé |
| Garantie 30 min | Activée après 4 à 6 semaines de mesure des délais | Validé |
| Plafonds | Course : 20 000 FCFA (nouveau client), 50 000 FCFA après 3 commandes ; remboursement par un agent : 5 000 FCFA, 20 000 FCFA par jour | Proposé par Claude, à ajuster |
| Nuit | Un agent de zone de nuit valide les commandes vocales et un agent répond au WhatsApp | Validé |
| Infrastructure | Gratuit pour le développement et les tests ; production payante (environ 45 dollars par mois) à décider avant le lancement | À décider |

## Changements depuis la version 1

| Sujet | Avant | Maintenant |
|---|---|---|
| Cash (R2) | Après 2 commandes réussies | Après 3 commandes réussies |
| Code de remise (R17) | Proposition | Obligatoire à chaque livraison |
| Courses (R9) | Plafond de 50 000 FCFA à confirmer | 20 000 FCFA (nouveau client), 50 000 FCFA ensuite, validation admin au-delà |
| Remboursements (R10) | Plafond à définir | 5 000 FCFA par remboursement, 20 000 FCFA par jour et par agent |
| Nuit | Non défini | Agent de zone de nuit : validation des vocaux ; un agent pour le WhatsApp |
| Infrastructure | Gratuit au début | Gratuit en test ; plans payants nécessaires en production (Supabase sans pause ni sauvegardes quotidiennes, hébergement commercial) |
| Style | À choisir | Base Ciel + navigation Bulles + anneau Nuit néon, à confirmer |

## Couverture de Douala (S-01)

- La ville de livraison est fixée à Douala. La saisie manuelle accepte un quartier libre, même s’il n’est pas dans les suggestions.
- La position GPS est comparée à la limite indicative représentée par la relation OpenStreetMap [R3832073](https://www.openstreetmap.org/relation/3832073), servie par Nominatim le 20 novembre 2026 et simplifiée avec une tolérance de `0.0001` degré. Un tampon de 2,5 km réduit les faux refus périphériques.
- Cette géométrie n’est pas une source administrative officielle. Le polygone, sa provenance et sa licence ODbL sont dans `web/lib/config/coverage.ts`; l’application affiche « © contributeurs OpenStreetMap ».
- Un GPS manifestement éloigné (au moins 50 km du point de référence OSM) ouvre l’écran de zone indisponible, qui propose la saisie manuelle. Pour les positions hors du tampon mais non éloignées, l’application propose la saisie manuelle sans redirection. Une adresse manuelle déclarée à Douala n’est jamais rejetée à cause du GPS.
- La limite ne définit ni tarifs ni quartiers tarifaires. Aucun frais n’est déduit lorsqu’une zone tarifaire n’est pas configurée.

