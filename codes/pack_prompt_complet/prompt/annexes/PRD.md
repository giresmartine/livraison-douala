# 1. PRD — Product Requirements Document

## 1.1 Vision et problème

La plateforme permet de se faire livrer à Douala, de jour comme de nuit, ce dont on a besoin : un repas d'un restaurant partenaire, des boissons et des essentiels, des produits d'une pharmacie partenaire, ou n'importe quelle course. Elle remplace quatre habitudes actuelles : appeler un revendeur du quartier, sortir soi-même, commander via WhatsApp ou une application peu fiable, ou attendre le lendemain.

**Problèmes résolus :** options réduites la nuit, prix majorés, délais imprévisibles, paiement flou, absence de suivi, et en groupe une seule personne qui avance l'argent.

**Objectifs mesurables :** au moins 50 commandes en 30 jours ; au moins 15 clients qui commandent deux fois ; 80 % des livraisons en moins de 45 minutes dans les zones cœur avant d'activer la garantie ; panier moyen d'au moins 7 000 FCFA (seuils proposés).

## 1.2 Utilisateurs et rôles

| Rôle | Description | Peut | Ne peut pas |
|---|---|---|---|
| Visiteur | Personne non connectée | Voir l'accueil, les rayons, les partenaires ouverts, les prix | Commander ou payer |
| Client | Personne inscrite | Commander, payer, suivre, réclamer, gérer son profil et ses adresses | Voir les données d'un autre client |
| Partenaire | Restaurant, pharmacie ou dépôt | Gérer ses articles, ses horaires, accepter ou refuser, marquer prête, voir ses ventes | Voir le numéro du client, ni les commandes d'un autre partenaire |
| Livreur | Coursier identifié | Voir les courses assignées, changer les statuts, appeler le client pendant la course | Voir les commandes non assignées ou l'historique d'autres livreurs |
| Agent de zone | Responsable local | Suivre les commandes de sa zone, dispatcher, valider les propositions vocales, répondre aux réclamations, rembourser dans son plafond | Modifier les paramètres globaux, rembourser au-dessus du plafond |
| Administrateur | Toi | Tout, avec journal d'audit | Contourner la journalisation |

## 1.3 Fonctionnalités par espace (P1 = V1, P2 = V1.1, P3 = plus tard)

| Espace | P1 (premier mois) | P2 (V1.1) | P3 |
|---|---|---|---|
| Client | Accueil et rayons, recherche et filtres, fiche partenaire ouverte, panier, adresse (quartier, repère, GPS), paiement Mobile Money et cash selon historique, suivi, historique et recommander, profil, réclamation, commande vocale (IA propose, humain valide), langues FR/EN, thème jour/nuit | Commande de groupe avec paiement partagé, courses à la demande, ordonnances par photo, fidélité et parrainage, carte bancaire | Abonnement, livraison programmée, mode B2B |
| Partenaire | Recevoir, accepter ou refuser les commandes, marquer prête, gérer articles, prix, disponibilité et horaires, historique et relevé | Validation des ordonnances (pharmacie), statistiques | Import de catalogue |
| Livreur | Courses assignées, statuts, appel du client, code de remise, preuve par photo pour les courses, cash déclaré | Itinéraire sur carte, historique et gains | Optimisation de tournées |
| Agent et admin | Tableau de bord, dispatch manuel, file de validation des vocaux, partenaires, produits et stock, zones et tarifs, utilisateurs, remboursements, réclamations, journal d'audit, paramètres | Statistiques avancées, promotions, campagnes | Dispatch automatique |

## 1.4 Règles métier

- **R1 Horaires :** un partenaire n'est visible et commandable que pendant ses horaires ; dernière commande 30 minutes avant la fermeture (paramétrable).
- **R2 Paiement :** paiement avant livraison par défaut ; cash réservé aux clients ayant au moins 3 commandes réussies ou aux petits montants (plafond défini par l'admin).
- **R3 Client injoignable :** le livreur appelle 2 fois, écrit sur WhatsApp, attend 5 minutes puis repart. Plat préparé non remboursé ; produit en stock réintégré et remboursé moins la livraison ; après 2 échecs, paiement obligatoire avant livraison.
- **R4 Garantie 30 minutes :** packs étiquetés uniquement, zones 1 et 2, un seul arrêt ; chrono dès la confirmation du paiement ; exclusions : pluie forte, adresse introuvable, client injoignable ; compensation : frais de livraison remboursés + bon d'achat. Activée après 4 à 6 semaines de mesure des délais.
- **R5 Frais de livraison :** 3 zones autour du local (700, 1 000 et 1 500 FCFA, hypothèses), suppléments nuit et pluie (environ 300 FCFA), minimum de commande par zone (3 000, 4 000, 5 000, hypothèses).
- **R6 Arrêts :** au maximum 2 arrêts par commande.
- **R7 Alcool :** vente réservée aux majeurs ; contrôle de l'âge à la livraison ; le livreur peut refuser ; mention explicite à l'inscription.
- **R8 Pharmacie :** la plateforme ne vend aucun médicament, la pharmacie est le vendeur. Ordonnance exigée selon la réglementation en vigueur (à confirmer). Photo de l'ordonnance conservée 30 jours puis supprimée, visible uniquement par la pharmacie concernée et l'admin. Sac scellé remis au destinataire.
- **R9 Courses à la demande :** devis = estimation + marge de sécurité de 15 à 20 % + frais de service ; paiement avant ; plafond par course : 20 000 FCFA pour un nouveau client, 50 000 FCFA après 3 commandes réussies, au-delà validation de l'admin et paiement complet avant l'achat (valeurs à ajuster après les 50 premières commandes) ; aucun dépassement sans accord du client ; photos du ticket et de l'article ; différence rendue en crédit ; liste d'exclusions (produits illégaux ou dangereux, armes, drogues, médicaments hors pharmacie, argent à transporter).
- **R10 Remboursements :** l'agent de zone rembourse jusqu'à 5 000 FCFA par remboursement et 20 000 FCFA par jour (valeurs à ajuster) ; au-dessus, validation de l'admin ; chaque remboursement est journalisé.
- **R11 Groupe :** l'organisateur crée et partage un lien ; chacun ajoute ses articles et paie sa part ; la commande part quand tous ont payé ou à l'heure limite ; les non-payeurs sont exclus ; si l'organisateur annule, tous sont remboursés.
- **R12 Vocal :** l'IA propose, un humain valide avant confirmation ; aucun enregistrement conservé après traitement ; confiance faible = relecture obligatoire.
- **R13 Fidélisation :** les partenaires reçoivent le prénom, la commande et le quartier, pas le numéro complet ; les points de fidélité ne servent que sur la plateforme.
- **R14 Partenaires :** marge ajoutée sur le prix du plat, ou remise de 10 à 15 % pour les petits grilladins ; paiement hebdomadaire (à la commande pendant l'essai).
- **R15 Livreurs :** identifiés (nom, photo) ; accord écrit sur la rémunération, la responsabilité et le non-contournement (livreurs actuellement non rémunérés : à formaliser).
- **R16 Montants :** FCFA, entiers, sans décimales.
- **R17 Code de remise :** un code à 4 chiffres communiqué au client, confirmé par le livreur à chaque livraison (règle validée).
- **R18 Consentement :** acceptation explicite des CGV et de la politique de confidentialité, version enregistrée ; retrait du consentement possible.
- **R19 Suspension :** un compte suspendu perd immédiatement ses sessions.

## 1.5 Cas d'usage

| ID | Acteur | Scénario | Résultat attendu |
|---|---|---|---|
| UC1 | Client | Commande d'un repas chez un restaurant ouvert | Commande payée, partenaire notifié, suivi en direct, livraison |
| UC2 | Client | Commande par message vocal | Proposition de commande, validation humaine, confirmation, paiement |
| UC3 | Client | Commande de groupe pour une soirée | Chacun paie sa part ; commande lancée à l'heure limite |
| UC4 | Client | Produits de pharmacie avec ordonnance | Pharmacie valide, prépare ; remise en sac scellé |
| UC5 | Client | Course à la demande (outils, mall) | Devis, paiement, achat avec preuves, livraison, remboursement de l'écart |
| UC6 | Livreur | Client injoignable | Procédure R3, statut échec, trace dans l'historique |
| UC7 | Système | Retard sur un pack garanti | Compensation automatique proposée à l'agent |
| UC8 | Agent | Remboursement dans son plafond | Remboursement exécuté et journalisé |

## 1.6 Contraintes et objectifs de qualité

- **Réseau :** usage sur téléphones modestes et 4G variable ; chargement rapide, tolérance aux coupures.
- **Disponibilité :** service critique entre 20h et 3h ; surveillance et alerte en cas de panne.
- **Sécurité et données :** conformité à la loi camerounaise sur les données personnelles (voir annexe A) ; secrets jamais côté client.
- **Langues :** interface française et anglaise ; catalogue en français, traduction anglaise facultative.
- **Budget :** 500 000 à 2 000 000 FCFA ; coûts d'infrastructure mensuels à maintenir bas ; livraison du premier mois par une seule personne.
- **Accessibilité :** contrastes AA, zones tactiles d'au moins 44 px, libellés lisibles par lecteur d'écran.

## 1.7 Critères d'acceptation (extraits)

| Fonction | Critères |
|---|---|
| Horaires | Un partenaire fermé n'apparaît pas dans la liste ; sa fiche indique l'heure d'ouverture |
| Commande | Un client connecté avec téléphone renseigné peut payer ; la commande passe de "paiement en attente" à "payée" uniquement après confirmation serveur du paiement |
| Paiement | Un webhook rejoué ne crée pas de double paiement (clé d'idempotence) ; signature invalide = rejet |
| Vocal | Un message vocal produit une proposition modifiable ; rien n'est confirmé sans validation |
| Groupe | Un participant ne voit que sa propre part et le total ; la commande part à l'heure limite avec les parts payées |
| Ordonnances | Une photo n'est lisible que par la pharmacie concernée et l'admin ; elle est supprimée à J+30 |
| Droits | Un client ne peut lire aucune commande d'un autre client, même avec l'identifiant (test RLS) |
| Remboursement | Un agent ne peut pas dépasser son plafond ; l'action est inscrite au journal |

