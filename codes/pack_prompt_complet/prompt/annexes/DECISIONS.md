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
| Style visuel | Base Ciel (bleu clair vivant, thème jour/nuit) + navigation de Bulles (micro au centre) + anneau de suivi de Nuit néon, un seul système de jetons | Choix de Claude, à confirmer |
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

