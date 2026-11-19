## 7. Performance et montée en charge (1 000 utilisateurs connectés en même temps)

### 7.1 Ce que « 1 000 connectés » veut dire
Mille sessions ouvertes ne sont pas mille requêtes par seconde. Modèle de départ : un utilisateur actif fait une action toutes les 8 à 10 secondes, soit 100 à 125 requêtes par seconde en moyenne, jusqu'à 300 en pointe (match, soirée). Si au moins 80 % des lectures sont servies par le cache (CDN, pages régénérées, cache de proximité), la base reçoit environ 60 requêtes par seconde en pointe. Les commandes sont rares : à 3 à 5 % de conversion, mille connectés produisent quelques dizaines de commandes par dizaine de minutes. L'objectif de conception est 3 000 connectés avant de réarchitecturer, 1 000 avec une marge de 3.

### 7.2 Objectifs mesurables (budget de performance)
Affichage principal en moins de 2,5 s sur 4G moyenne et téléphone modeste ; interaction en moins de 200 ms ; décalage visuel cumulé sous 0,1. JavaScript du premier chargement : viser 170 Ko compressés maximum par route. Temps de réponse des API : p95 sous 800 ms, p99 sous 1,5 s, taux d'erreur sous 1 % à 1 000 utilisateurs simultanés. Requêtes de base fréquentes : p95 sous 50 ms. Disponibilité visée 99,5 % entre 20 h et 3 h.

### 7.3 Couches de cache
1. **CDN** : fichiers statiques et images avec cache immuable d'un an. Pages publiques d'enseigne en régénération incrémentale toutes les 60 s avec revalidation ciblée par étiquette à chaque modification du catalogue.
2. **Cache applicatif** : résultats de `partners_near` par cellule de position et par type, 60 s ; promotions et catégories 5 minutes ; paramètres 60 s.
3. **Navigateur** : requêtes dédoublonnées et mises en cache côté client (durée de fraîcheur courte), pré-chargement au survol ou à l'apparition, stockage hors ligne du panier et du dernier contenu.
Jamais de cache pour : panier, commande, paiement, données personnelles, ordonnances.

### 7.4 Base de données
Pooler de connexions en mode transaction pour les fonctions sans état ; délai maximal par requête (statement timeout) de 5 s ; index géographiques et de tri comme dans le schéma ; vues ou tables agrégées pour les statistiques de l'administration (pas de calcul lourd à la demande sur les tables chaudes) ; pagination par curseur ; sélection des seules colonnes utiles ; écritures groupées pour les notifications ; plan d'exécution des 20 requêtes principales conservé dans la documentation et vérifié dans l'intégration continue. Dimensionnement de départ : plan payant avec sauvegardes ; la taille de calcul est choisie après le test de charge et peut être augmentée sans changement de code. Vérifier les quotas du plan (connexions, temps réel, stockage, bande passante) avant le lancement.

### 7.5 Temps réel
Le temps réel sert seulement : le suivi d'une commande en cours, les tableaux de bord partenaire, livreur et agent. Le catalogue et l'accueil n'utilisent jamais le temps réel. Chaque client ne s'abonne qu'à sa commande active, et se désabonne à la fin. Repli automatique par interrogation toutes les 15 s avec intervalle croissant si le temps réel est indisponible. Objectif : moins de 300 connexions temps réel simultanées pour 1 000 utilisateurs, vérifié contre le quota du plan.

### 7.6 Tâches de fond et files
Notifications, relances, expiration des ordonnances, clôture des groupes, rapprochement des paiements : traités par tâches planifiées et table de file d'attente avec reprises à intervalle croissant, limitation du débit vers WhatsApp et le fournisseur d'emails, idempotence par identifiant d'événement. Jamais de traitement long dans le chemin de réponse à un utilisateur.

### 7.7 Interface
Rendu côté serveur avec flux (Suspense) pour afficher l'enveloppe tout de suite ; découpage du JavaScript par route ; carte et micro chargés à la demande ; listes virtualisées au-delà de 50 éléments ; polices auto-hébergées ; images adaptatives ; aucune bibliothèque de dates, d'animations ou d'icônes importée en entier ; suppression des dépendances inutiles ; interface optimiste pour ajouter au panier et laisser un avis avec retour arrière en cas d'échec ; prévention des doubles envois (bouton désactivé et clé d'idempotence).

### 7.8 Test de charge (obligatoire avant le lancement et avant chaque version majeure)
Outil k6 sur un environnement de test avec des volumes réalistes : 100 enseignes, 5 000 articles, 200 000 commandes d'historique simulées. Scénario : montée de 0 à 1 000 utilisateurs virtuels en 10 minutes, palier de 15 minutes, descente. Répartition : parcours de navigation 70 % (accueil, liste, page enseigne), recherche 10 %, panier et commande 8 %, suivi 7 %, compte 5 %. Seuils d'échec : p95 supérieur à 800 ms, erreurs supérieures à 1 %, mémoire ou connexions de la base saturées, file de notifications croissante. Tests complémentaires : pic brutal de 3 000 utilisateurs, webhook de paiement rejoué 100 fois, panne du prestataire de paiement, temps réel désactivé, base en lecture seule. Résultats archivés dans `docs/performance/` avec la configuration et les décisions de dimensionnement.

### 7.9 Mode dégradé
Si la charge dépasse la capacité : désactiver le vocal, passer le temps réel en interrogation, servir le catalogue depuis le cache périmé acceptable (jusqu'à 10 minutes), limiter la création de nouveaux groupes, afficher un message de forte affluence. Chaque mode est un drapeau dans `settings`, testé.

### 7.10 Observabilité
Suivi d'erreurs, indicateurs de performance réelle (Core Web Vitals) par page et par type d'appareil, journal des requêtes lentes de la base, tableau de bord des commandes par minute, alertes au téléphone du fondateur et de l'agent de nuit, sonde de disponibilité toutes les minutes.

## 8. Gestion du code

### 8.1 Dépôt
Un seul dépôt privé. Structure : `app/` (routes par espace), `components/ui` et `components/features`, `lib/` (clients, utilitaires, schémas), `messages/` (fr, en), `supabase/` (migrations, fonctions, seed, tests), `design/` (jetons), `docs/` (livre, écrans, décisions, performance), `e2e/` (tests de bout en bout), `scripts/` (import de catalogue, outils). Domaines nommés en anglais (`partner`, `order`, `courier`, `zone`).

### 8.2 Branches et commits
Branche principale protégée, branches courtes par fonctionnalité (`feat/S-12-article-sheet`, `fix/order-total-rounding`), fusion par demande d'intégration avec relecture et intégration continue verte obligatoires. Messages au format Conventional Commits avec portée (`feat(order): ...`, `fix(payments): ...`), phrase au présent, en anglais ou en français de façon cohérente, un sujet par commit. Aucune mention d'outil ou de co-auteur automatique.

### 8.3 Demande d'intégration
Modèle obligatoire : objectif, écrans ou parties concernés, captures avant/après (3 largeurs, 2 thèmes), tests ajoutés, impacts sécurité et performance, migrations, plan de retour arrière. Liste de relecture : droits et RLS, validation des entrées, textes FR/EN, accessibilité, états, poids des dépendances, absence de secrets et de journaux de debug.

### 8.4 Intégration continue
À chaque demande : installation propre, vérification des types, lint, format, tests unitaires, tests de base (migrations sur base vide + tests RLS), analyse de secrets, analyse des dépendances, compilation, vérification qu'aucun secret ne figure dans le paquet client, tests de bout en bout sur les parcours critiques, audit d'accessibilité automatisé, vérification du budget de JavaScript. Déploiement de prévisualisation par demande. Mise en production : manuelle, après validation, depuis la branche principale étiquetée.

### 8.5 Environnements et configuration
Développement (Supabase local), test (projet séparé, paiement en environnement de test), production. Variables par environnement ; fichier `.env.example` à jour ; validation de la configuration au démarrage (le serveur refuse de démarrer si une variable manque).

### 8.6 Migrations de base
Fichiers numérotés, jamais modifiés après fusion. Principe « étendre puis contracter » : ajouter d'abord, déployer le code compatible, supprimer ensuite. Chaque migration est testée sur une copie de la production anonymisée avant application. Retour arrière documenté.

### 8.7 Versions et retour arrière
Versionnage sémantique, journal des changements tenu à jour, étiquettes Git, publication des cartes de sources au seul outil de suivi d'erreurs. Retour arrière d'une version du site en une action ; migrations compatibles avec la version précédente.

### 8.8 Qualité du code
TypeScript strict sans `any` injustifié ; fonctions courtes ; fichiers sous 300 lignes ; composants sans logique métier (elle vit dans `lib/` et les fonctions serveur) ; erreurs typées et gérées (pas de blocs vides) ; journaux structurés sans données personnelles ; aucune valeur magique (jetons, constantes nommées) ; commentaires réservés au « pourquoi », jamais au « quoi » ; décisions importantes consignées dans `docs/decisions/` (une page par décision : contexte, choix, alternatives, conséquences).

## 9. Qualité et tests

### 9.1 Pyramide
Tests unitaires (calculs de prix, frais, minimums, plafonds, formatage FCFA, horaires de nuit) ; tests de base (RLS, fonctions, transitions) ; tests d'intégration des routes serveur et des webhooks ; tests de bout en bout (Playwright) ; captures de référence par écran et par thème pour détecter les régressions visuelles ; tests de charge ; tests de sécurité.

### 9.2 Parcours de bout en bout obligatoires
1. Adresse, accueil, page enseigne, ajout d'un article avec options, commande, paiement Mobile Money en test, suivi, livraison avec code. 2. Commande avec livraison offerte et code promo. 3. Enseigne fermée : visible mais non commandable. 4. Zone sans enseigne. 5. Commande vocale avec validation d'un agent. 6. Commande de groupe avec un participant qui ne paie pas. 7. Course à la demande avec dépassement refusé puis accepté. 8. Ordonnance envoyée, validée, supprimée à J+30. 9. Client injoignable (procédure, annulation, remboursement partiel). 10. Retard sur pack garanti et compensation. 11. Remboursement par un agent dans et au-dessus du plafond. 12. Connexion avec 6 tentatives, verrouillage et message générique. 13. Perte de réseau pendant le paiement (aucun doublon). 14. Webhook rejoué (aucun doublon). 15. Changement de langue et de thème.

### 9.3 Appareils et réseaux
Téléphone Android d'entrée de gamme (2 Go de mémoire) ; Chrome Android, Samsung Internet, Safari iOS (installation PWA), Firefox, ordinateur ; réseaux 3G lent, 4G variable, hors ligne, coupure en cours de requête ; écran 360, 412, 768, 1280 px ; zoom système 200 %.

### 9.4 Accessibilité et langue
Contrastes AA, navigation au clavier, ordre de focus, libellés de formulaires, rôles et noms accessibles, annonces des états de chargement et d'erreur, cibles tactiles de 44 px, réduction des animations. Relecture humaine des textes en français et en anglais, sans chaîne manquante (test qui échoue si une clé existe dans une langue et pas dans l'autre).

## 10. Protocole de travail écran par écran

### 10.1 Ordre de construction
1. Fondations : dépôt, Next.js strict, jetons de design, polices, composants de base, configuration validée, CI, Supabase local, migrations, seed, types générés.
2. Authentification, rôles, redirections, tests des cinq failles.
3. Base et RLS avec les tests de sécurité des données.
4. Catalogue : enseignes, horaires, articles, options, médias, import CSV, administration S-62 à S-64 minimale.
5. Adresse d'abord, accueil, listes, page enseigne, informations, avis, fiche article (S-01 à S-12).
6. Paniers, commande, livraison, offres, récapitulatif (S-13 à S-17).
7. Paiement avec l'agrégateur en environnement de test, confirmation, webhooks (S-18, S-19).
8. Espaces partenaire, livreur, agent (S-40 à S-61), suivi (S-20), carte.
9. Compte, historique, avis, réclamation, pages légales (S-27 à S-37).
10. Vocal, groupe, courses, ordonnances (S-21 à S-26), puis performance, test de charge, sécurité, mise en production.
Aucune phase ne commence avant la validation de la précédente.

### 10.2 Boucle sur un écran
1. Tu relis la fiche S-xx et les jetons. 2. Tu proposes en quelques lignes ce que tu vas construire et les questions éventuelles. 3. Tu construis composants, données, états, textes FR/EN. 4. Tu testes (unitaires, bout en bout, accessibilité). 5. Tu produis des captures à 360, 768 et 1280 px, en thème clair et sombre. 6. Tu présentes le résultat avec les risques. 7. Le fondateur valide ou demande des ajustements. 8. Tu enregistres la capture de référence et mets à jour `docs/screens/S-xx.md`.

### 10.3 Demandes d'ajustement
Le fondateur écrit : « S-xx : ce qui ne va pas ; ce que je veux ». Tu reformules en une phrase, tu proposes le changement, tu l'appliques sans toucher aux autres écrans, tu refais les captures et tu notes la modification dans `docs/CHANGELOG_ECRANS.md`. Si le changement touche un composant partagé, tu listes les écrans impactés avant de l'appliquer.

### 10.4 Définition de terminé
Voir la section 2.5 critères transversaux, plus : sécurité relue, performance mesurée, textes relus, aucune trace de génération automatique selon la section 1.9.
