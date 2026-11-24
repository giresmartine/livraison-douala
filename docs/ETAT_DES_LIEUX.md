# État des lieux complet du projet

Date de vérification : 24 novembre 2026
Branche vérifiée : `feat/bloc-b`
Dépôt distant : `https://github.com/giresmartine/livraison-douala.git`

## Résumé exécutif honnête

- Le dépôt contient une application Next.js/Supabase substantielle, avec authentification, RLS, devis de livraison serveur, géocouverture Douala, catalogue fictif et galerie de 58 écrans enregistrés.
- La dernière CI du commit `e80585c` est rouge : 12 étapes passent sur 13, puis l’E2E échoue sur le nettoyage du devis administrateur. Les migrations et les 8 fichiers pgTAP passent.
- Sur cette machine, le typecheck, le lint, les 55 tests Vitest et le build Webpack passent. Le build Turbopack standard plante dans ce Windows.
- Aucun `.env.local`, aucun compte de test, aucun projet Supabase de développement lié. La navigation réelle des données, la connexion et les parcours à plusieurs rôles ne peuvent pas être testés sur cette machine.
- Aucun écran n’est actuellement prouvé « FONCTIONNEL » avec un parcours réel sur un Supabase configuré. Plusieurs écrans sont construits avec des composants, des actions serveur ou des migrations, mais sans base locale les données restent absentes.

## 1. Dépôt et CI

### Sorties vérifiées

- `git status --short --branch` : `feat/bloc-b...origin/feat/bloc-b`; aucun fichier modifié au début de l’audit.
- Le travail est poussé : aucun commit local non poussé sur `feat/bloc-b`.
- `git branch -a` : `main`, `fix/bloc-a`, `feat/bloc-b`; toutes les branches existent sur le remote.
- Différences : `main...feat/bloc-b` donne 0 commit côté gauche et 41 commits côté droit. La branche contient donc 41 commits d’avance sur `main`.
- Les derniers commits vérifiés sont :

  - `e80585c feat(ui): generate branded PWA manifest`
  - `e97db32 docs: add end-to-end manual acceptance checklist`
  - `1c0e40d feat(ui): unify branding, localization, and protected flows`
  - `f0fb8b2 feat(dev): add guarded Supabase demo setup and catalog`
  - `fe1a6da fix(sql): harden fee quote lifecycle and demo markers`
  - `7760611 test: exercise quote RLS with transactional grants`

### Dernière CI

- Run : https://github.com/giresmartine/livraison-douala/actions/runs/44913843044
- Commit : `e80585c`
- Conclusion globale : **failure**
- Job unique `validate` :
  - checkout : succès
  - setup Node : succès
  - npm ci : succès
  - installation Playwright Chromium : succès
  - typecheck : succès
  - lint : succès
  - Vitest : succès
  - build normal : succès
  - démarrage Supabase : succès
  - reset DB : succès
  - pgTAP : succès
  - E2E : **échec**

L’E2E a exécuté 6 tests : 5 passent, 1 échoue. La régression affichée est « Could not remove the isolated E2E fee-quote order » dans [admin-fee-quote.spec.ts](<../web/tests/e2e/admin-fee-quote.spec.ts>). Le test échoue dans son bloc `finally` lors de la suppression finale de la commande, pas dans une preuve que l’interface est absente. Il faut connaître l’erreur PostgreSQL sous-jacente, retournée dans `cleanupError`, avant de conclure que le scénario admin lui-même est vert.

Par ailleurs, les logs CI confirment que les 8 fichiers pgTAP sont passés pour 85 tests/assserts regroupés :

- `admin_fee_quote_queue.test.sql`
- `create_fee_quote_order.test.sql`
- `customer_order_tracking.test.sql`
- `demo_catalog_markers.test.sql`
- `fee_quote_order_rls.test.sql`
- `order_fee_quote_actions.test.sql`
- `order_fee_quote_schema.test.sql`
- `order_flow_admin_auth.test.sql`

Preuve : logs du job 136875099151 liés au run ci-dessus.

## 2. Les 58 écrans

Important : la liste contient exactement 58 entrées uniques dans [screens.ts](<../web/lib/screens.ts>). Les identifiants S-38, S-39, S-45 à S-49, S-54 à S-59 sont absents de la liste ; on ne compte donc pas 58 écrans consécutifs.

Les statuts ci-dessous sont basés sur les fichiers réels, pas sur l’intitulé de la galerie.

| Écran | Nom | Rôle | Statut | Ce qui manque / preuve |
|---|---|---|---|---|
| S-01 | Choisir une adresse | client | INTERFACE SEULE | Adresse/GPS localement accessibles ; aucune base nécessaire pour le brouillon, mais aucun catalogue réel. Preuve : [address-entry.tsx](<../web/components/address-entry.tsx>) et `address-coverage.test.ts`. |
| S-02 | Confirmer l’adresse | client | APERÇU | Route sensible générique ; pas de carte ni de sauvegarde serveur complète visible. Preuve : `screens.ts`, `requireRole`. |
| S-03 | Livraison uniquement à Douala | client | INTERFACE SEULE | Écran GPS réel et test Playwright ; la zone est une géométrie OSM indicative, pas une décision officielle. |
| S-04 | Accueil après adresse | client | APERÇU | Aucun partenaire réel sans Supabase ; catalogue vide si non configuré. Preuve : `storefront-workspace.tsx` et `lib/storefront.ts`. |
| S-05 | Restaurants | client | APERÇU | La liste lit Supabase mais aucun projet/données local actuel. 20 restaurants sont seulement préparés dans le JSON, pas chargés. |
| S-06 | Pharmacies | client | APERÇU | Même blocage Supabase ; aucun inventaire réel chargé dans cette machine. |
| S-07 | Recherche | client | APERÇU | Recherche en code, dépendante des données Supabase ; non vérifiée avec un catalogue chargé localement. |
| S-08 | Restaurant | client | APERÇU | Fiche dynamique prévue, mais aucune donnée réelle vérifiée chargée. |
| S-09 | Pharmacie | client | APERÇU | Fiche pharmacie prévue ; aucun produit réel chargé. |
| S-10 | Informations du restaurant | client | APERÇU | Vue générique ; aucune donnée partenaire confirmée. |
| S-11 | Notes et avis | client | NON COMMENCÉ | Schéma de reviews présent, mais aucune interface ni données de test. |
| S-12 | Détail article | client | APERÇU | Éléments/options prévus ; chargement réel dépend du JSON/DB. |
| S-13 | Paniers par enseigne | client | INTERFACE SEULE | Panier local fonctionnel dans [storefront-workspace.tsx](<../web/components/storefront-workspace.tsx>) ; sauvegarde serveur/commande non active. |
| S-14 | Panier | client | INTERFACE SEULE | Quantités, sous-total et minimum côté local ; aucune confirmation/serveur complète. |
| S-15 | Mode de livraison | client | INTERFACE SEULE | Saisie adresse réelle et brouillon ; sauvegarde serveur derrière une session. |
| S-16 | Offres/pourboire | client | APERÇU | Route redirige vers S-17 ; étape volontairement retirée du flux. |
| S-17 | Récapitulatif | client | INTERFACE SEULE | Création de commande existe dans SQL + action serveur, mais aucun compte/projet local. |
| S-18 | Paiement | client | NON COMMENCÉ | Aucun fournisseur, webhook ni paiement réalisé. |
| S-19 | Confirmation | client | APERÇU | Aucun paiement ni confirmation partenaire ; hors périmètre actuel. |
| S-20 | Suivi commande | client | INTERFACE SEULE | Composant [fee-quote-tracking.tsx](<../web/components/fee-quote-tracking.tsx>) et RPC SQL présents ; non vérifié bout en bout hors CI. |
| S-21 | Commande vocale | client | NON COMMENCÉ | Aucun microphone/transcription/modèle implémentés. |
| S-22 | Groupe nouveau | client | NON COMMENCÉ | Aucun modèle de paiement partagé ni groupe connecté. |
| S-23 | Groupe rejoindre | client | NON COMMENCÉ | Aucun lien sécurisé ni jeton de groupe. |
| S-24 | Course à la demande | client | APERÇU | Simple fiche générique ; aucun devis/coursier/paiement. |
| S-25 | Ordonnance | client | APERÇU | Aucun upload privé, purge J+30 ou stockage. |
| S-26 | Suivi ordonnance | client | APERÇU | Aucun workflow pharmacie ni stockage. |
| S-27 | Mes commandes | client | APERÇU | Aucune liste chargée depuis une base locale. |
| S-28 | Détail commande | client | INTERFACE SEULE | Suivi existant; recommandation, avis, reçu et support restent absents. |
| S-29 | Mon compte | client | APERÇU | Aucun profil complet, adresse, points ou préférences reliés. |
| S-30 | Mes adresses | client | INTERFACE SEULE | Schéma et RLS addresses présents ; interface générique sans gestion complète. |
| S-31 | Préférences | client | APERÇU | Thème automatique réel; autres préférences non persistées. |
| S-32 | Réclamation | client | APERÇU | Aucun formulaire/stockage/traitement tickets. |
| S-33 | Connexion | client | INTERFACE SEULE | Supabase Auth codé; CAPTCHA et compte absents sur cette machine. |
| S-34 | Inscription | client | INTERFACE SEULE | Formulaire et Supabase signUp codés; e-mail/test compte non vérifiés. |
| S-35 | Mot de passe oublié | client | INTERFACE SEULE | Actions/reset codés; fournisseur e-mail non configuré pour un projet réel. |
| S-36 | Informations légales | client | APERÇU | Page légale à valider; accord juridique non fourni. |
| S-37 | États système | client | APERÇU | 404/page error génériques; offline/maintenance non implémentés. |
| S-38 | non inventorié | — | NON COMMENCÉ | Aucun identifiant dans `screens.ts`; l’identifiant S-38 n’est pas enregistré. |
| S-39 | non inventorié | — | NON COMMENCÉ | Aucun identifiant dans `screens.ts`; l’identifiant S-39 n’est pas enregistré. |
| S-40 | Commandes partenaire | partenaire | APERÇU | Route protégée générique, aucune fonctionnalité partenaire réelle. |
| S-41 | Détail commande partenaire | partenaire | APERÇU | RLS/fonctions prévues, aucune interface métier réelle. |
| S-42 | Catalogue partenaire | partenaire | APERÇU | Écriture SQL prévue mais pas d’interface CRUD complète. |
| S-43 | Horaires partenaire | partenaire | APERÇU | Schéma horaires/closures présent, pas d’interface de modification complète. |
| S-44 | Relevés partenaire | partenaire | NON COMMENCÉ | Aucun calcul de vente/paiement/commission. |
| S-45 | non inventorié | — | NON COMMENCÉ | Aucun identifiant dans `screens.ts`; l’identifiant S-45 n’est pas enregistré. |
| S-46 | non inventorié | — | NON COMMENCÉ | Aucun identifiant dans `screens.ts`; l’identifiant S-46 n’est pas enregistré. |
| S-47 | non inventorié | — | NON COMMENCÉ | Aucun identifiant dans `screens.ts`; l’identifiant S-47 n’est pas enregistré. |
| S-48 | non inventorié | — | NON COMMENCÉ | Aucun identifiant dans `screens.ts`; l’identifiant S-48 n’est pas enregistré. |
| S-49 | non inventorié | — | NON COMMENCÉ | Aucun identifiant dans `screens.ts`; l’identifiant S-49 n’est pas enregistré. |
| S-50 | Mes courses | livreur | APERÇU | Route protégée générique, aucune course assignée. |
| S-51 | Course active | livreur | APERÇU | Aucun statut temps réel ni carte de navigation. |
| S-52 | Remise/échec | livreur | APERÇU | Aucun code, procédure ni preuves implémentés. |
| S-53 | Mes gains | livreur | NON COMMENCÉ | Aucun calcul ni paiement. |
| S-54 | non inventorié | — | NON COMMENCÉ | Aucun identifiant dans `screens.ts`; l’identifiant S-54 n’est pas enregistré. |
| S-55 | non inventorié | — | NON COMMENCÉ | Aucun identifiant dans `screens.ts`; l’identifiant S-55 n’est pas enregistré. |
| S-56 | non inventorié | — | NON COMMENCÉ | Aucun identifiant dans `screens.ts`; l’identifiant S-56 n’est pas enregistré. |
| S-57 | non inventorié | — | NON COMMENCÉ | Aucun identifiant dans `screens.ts`; l’identifiant S-57 n’est pas enregistré. |
| S-58 | non inventorié | — | NON COMMENCÉ | Aucun identifiant dans `screens.ts`; l’identifiant S-58 n’est pas enregistré. |
| S-60 | Tableau de bord opérations | admin/agent | APERÇU | Route protégée générique, aucune métrique réelle. |
| S-61 | Commandes et devis | admin/agent | INTERFACE SEULE | File admin, RPC, annulation/réémission, axe-core/E2E sont codés; CI E2E reste rouge au nettoyage. |
| S-62 | Gestion enseignes | admin/agent | APERÇU | Aucun CRUD prospect/onboarding. |
| S-63 | Validation médias | admin/agent | APERÇU | Schéma media, sans interface ni workflow. |
| S-64 | Zones/tarifs | admin/agent | APERÇU | Configuration SQL devis présente, pas de dessin/carte ni réglage UI complet. |
| S-65 | Utilisateurs/rôles | admin/agent | INTERFACE SEULE | Suspension SQL/RLS présente; écran générique seulement. |
| S-66 | Validation vocaux | admin/agent | NON COMMENCÉ | Aucun flux vocal. |
| S-67 | Remboursements | admin/agent | NON COMMENCÉ | Aucun plafond/refund action. |
| S-68 | Réclamations | admin/agent | APERÇU | Schéma support existe; interface incomplet. |
| S-69 | Journal d’audit | admin/agent | APERÇU | Table/audit SQL présents; pas d’interface listante. |
| S-70 | Paramètres globaux | admin | APERÇU | Table settings RLS présente; aucune interface paramétrique complète. |
| S-71 | Promotions | admin/agent | NON COMMENCÉ | Schéma promotions présent, aucune interface ni recalcul complet. |

## 3. Fonctionnalités par parcours

### Visiteur

- Marche : accueil, adresse, GPS, routes FR/EN, mentions/crédits, thème et pages publiques.
- Ne marche pas : données réelles, liste 20+20 sans projet Supabase, catalogue complet.
- Bloquant : `.env.local` + projet Supabase de développement.

### Inscription et connexion

- Code présent : formulaire, sign-in/sign-up/reset, CAPTCHA Turnstile, rôles, redirection par rôle, suspension.
- Non vérifié bout en bout localement : `.env.local` absent, Docker absent, aucun compte.
- CAPTCHA officielle test dans `.env.example`, mais pas activée sur aucun projet Supabase réel.

### Recherche

- Code serveur prévu dans `getStorefrontData/searchStorefront`.
- Non vérifié avec données chargées : pas de Supabase.

### Restaurants et pharmacies

- JSON fictif vérifié : 20 restaurants, 20 pharmacies, 320 produits, horaires variés, fermeture exceptionnelle.
- Aucun chargement dans une base locale ou de développement. Aucun nom vérifié contre une base de marques, donc fictivité web non prouvée.

### Panier

- Le panier local conserve les lignes, quantités, options et sous-total.
- La création de commande, minimum/stock réel, paiement et marchand réel restent bloqués.
- Preuve : tests unitaires `storefront.test.ts`, `order-flow.test.ts`.

### Adresse

- Ville Douala fixe, saisie quartier libre, repère obligatoire, GPS indicatif.
- Sauvegarde Supabase/RLS codée, mais non testée sans projet.
- La limite OSM n’est pas une source officielle.

### Commande avec devis

- SQL substantiel : frais réservés à l’admin, plafond, quotas, idempotence, prix recalculés côté serveur, expiration, réémission, historique.
- pgTAP : 8 fichiers / 85 résultats, tous verts dans la dernière CI.
- E2E : la CI échoue au nettoyage de l’ordre du test admin.
- Sans projet Supabase local, aucun parcours client/admin réel ne peut être testé sur l’environnement.

### Suivi

- Composant client et RPC `get_customer_fee_quote_order` présents.
- Expiration côté base et état `quote_replaced` codés.
- Non vérifié avec deux comptes réels.

### Partenaire

- RLS, membres, politique de lecture données limitées.
- UI uniquement générique; aucune commande réelle, accept/refuse/prêt.

### Livreur

- Schéma deliveries/couriers présent.
- Aucun statut opérationnel, code remise, preuve ni carte.

### Admin

- File devis réelle en UI + SQL.
- MFA : composant d’enrôlement TOTP présent; aucune activation démontrée sur un compte réel.
- Suspension SQL présente.
- L’écran des utilisateurs reste générique.

### Agent de zone

- Rôles `zone_agent` dans le schéma et certaines fonctions.
- Pas de parcours/écran opérationnel spécifique vérifié.

## 4. Base de données et sécurité

### Migrations vérifiées

1. `20261111000000_schema.sql` : schéma principal, rôles, partenaires, produits, commandes, paiements, livraisons, groupes, vocal, ordonnances, médias, notifications.
2. `20261111000001_functions.sql` : fonctions utilitaires et dates.
3. `20261111000002_rls.sql` : activation RLS sur les tables publiques et premières politiques.
4. `20261111000100_auth_profiles_rls.sql` : profils, rôles, adresses, membres, catalogue.
5. `20261111000200_public_catalog_policies.sql` : lectures catalogue publiques.
6. `20261111000300_suspend_account_and_revoke_sessions.sql` : suspension/révocation.
7. `20261120000000_audit_account_suspension.sql` : journal suspension.
8. `20261120000100_active_user_rls.sql` : `is_active_user`, rôles, lecture/can_read_order, RLS étendues.
9. `20261121000000_douala_address_suggestions.sql` : suggestions adresse.
10. `20261121000100_fee_quote_config_and_admin_auth.sql` : configuration frais, fraîcheur session admin.
11. `20261121000200_order_fee_quote_statuses.sql` : nouveaux statuts de devis.
12. `20261121000300_order_fee_quote_schema.sql` : tables devis/historique/extensions.
13. `20261121000400_fee_quote_actions.sql` : envoyer/annuler/accepter/refuser/rejeter.
14. `20261121000500_create_fee_quote_order.sql` : création serveur, idempotence, quotas, recalcul prix.
15. `20261121000600_customer_order_tracking.sql` : RPC lecture suivi client.
16. `20261121000700_admin_fee_quote_queue.sql` : RPC file admin.
17. `20261121000800_fee_quote_order_rls.sql` : RLS restrictives sur commandes.
18. `20261121000900_quote_replacement_and_transition_hardening.sql` : réémission, délai remplacement, transition sécurisée search_path vide.
19. `20261121001000_demo_catalog_markers.sql` : colonnes `is_demo`.

Toutes les migrations ont été appliquées avec succès dans la CI locale GitHub du run ci-dessus.

### Sécurité

- RLS activées sur les tables publiques dans la migration initiale.
- `is_active_user()` bloque les profils non actifs.
- Fonctions serveur cherchent les rôles en base.
- Commandes : lecture client propriétaire, partenaire membre, livreur assigné, staff; les politiques sont testées en partie par pgTAP.
- Suspensions : migration, fonction et audit présents.
- MFA : écran/enrôlement TOTP présent, mais aucune activation de projet/admin vérifiée.
- Captcha : Turnstile côté UI, clé test officielle, config Supabase locale dans `config.toml`.
- Limitation tentatives : limites Supabase minimales configurées dans `config.toml`; aucune démonstration des 50 tentatives et aucune politique applicative de brute-force vérifiée.
- Audit : table/politiques et écritures pour suspension/commandes présentes. Lecture sensible admin partiellement prévue mais pas vérifiable bout en bout.
- CSP : nonce sur routes dynamiques, hash statique sur routes publiques, sans `unsafe-inline` dans les tests.
- En-têtes : CSP, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy.

### Prévus mais absents

- Paiement : aucune Edge Function ni webhook.
- Ordonnance : aucun bucket privé/purge J+30.
- Vocal : aucun modèle/transcription/Edge Function.
- Groupe : aucun workflow complet.
- Remboursement : aucun algorithme/plafond/action complète.
- Sauvegarde/restauration : aucun test.
- Surveillance/Sentry/alertes : absent.
- Notifications : aucune preuve e-mail/SMS/push.
- pgTAP ne couvre pas toutes les tables du schéma; les 8 fichiers présents ciblent surtout devis, suivi, RLS, audit auth et marqueurs démo.

## 5. Environnement local

- Le site se lance : oui, le serveur existant répond sur 3000 et le build Webpack peut démarrer.
- Supabase : non relié; `web/.env.local` absent.
- Comptes test : aucun fichier `web/.dev-accounts.txt`.
- Docker/Podman : absent, donc `npm run test:e2e` échoue avant Playwright.
- Données démo : présentes dans JSON mais non chargées dans une base.
- Compte exact vérifié directement dans le JSON : 20 restaurants, 20 pharmacies, 320 produits, 1 fermeture, 4 horaires 24h, fermeture exceptionnelle.
- Gardes-fous scripts : `APP_ENV=development`, nom/projet/ref Supabase, URL correspondante, clé Turnstile test.
- Naviguer librement sans compte reste possible sur les écrans publics, mais les catalogues, rôles, commandes et suivi ne sont pas utilisables.

## 6. Données et import

- Import enseignes par tableur : non trouvé comme workflow de code validé. Le JSON est la seule source démo.
- Photos : aucune image protégée; code visuel initiale/dégradé prévu. Dossier des licences : non vérifié.
- Enseignes démo : fichier unique [enseignes.json](<../web/supabase/dev-data/enseignes.json>), script upsert/seed.
- Script seed : refuse production, vérifie développement, garde les slugs, archive les anciennes lignes référencées.
- 40 enseignes fictives sont déclarées avec le préfixe `TEST -`.
- Les noms n’ont pas été vérifiés sur le web; la non-existence de marque connue n’est pas prouvée.
- Aucun catalogue réel partenaire n’a été fourni.

## 7. Qualité

### Tests exécutés réellement

- Typecheck : succès.
- ESLint : succès.
- Vitest : 13 fichiers, 55 tests.
- Build Turbopack : échec panic Windows; pas un échec TypeScript.
- Build Webpack : succès.
- E2E local : impossible sans Docker/Podman.
- E2E CI : 5 passés, 1 échec dans le cleanup du test admin.
- pgTAP CI : 8 fichiers, tous réussis; 85 résultats agrégés dans les logs.

### Accessibilité

- axe-core est ajouté à l’E2E admin.
- Aucun résultat axe complètement vert localement.
- Focus visible codé dans CSS.
- Zones tactiles 44 px mentionnées dans le brief; toutes les pages n’ont pas été vérifiées.

### Responsive

- Test Playwright passe dans la CI pour 360/390/768 sur les routes enregistrées; cette partie n’est pas responsable de l’échec global.
- Pas de test réel 360/desktop humain de tous les parcours.

### Performance

- Aucun Lighthouse/Core Web Vitals/mesure 4G.
- Aucun cache API réel ni pagination/squelette pour tous les écrans.
- Build Webpack mesure seulement la compilation, pas la performance utilisateur.

### Textes

- FR/EN : test de parité de clés et placeholders présent dans `messages.test.ts`.
- Nom provisoire unique : `Douala Livraison`, preuve [brand.ts](<../web/lib/config/brand.ts>).
- Attributions OSM vers mentions/crédits.
- Textes de développeur encore visibles dans les composants d’absence de configuration : captcha non configuré, catalogue réel non configuré, checkout non configuré.
- Le README contient aussi plusieurs formulations obsolètes ou contradictoires sur l’état du projet.
- Tutoiement partiel selon les composants; aucune validation humaine exhaustive.

### Design

- Inter locale présente dans `public/fonts`, Inter partout selon test.
- Tokens Ciel, thème jour/nuit et service worker présents.
- Fraunces : retirée du code selon recherche; preuve `DECISIONS.md`.
- Navigation, cartes arrondies et composants sont partiels.
- Aucun maillage complet des écrans, aucune implémentation complète du brief Bulles/Nuit néon.

### Dette connue

- Branches longues, nombreux écrans encore génériques.
- Deux serveurs locaux anciens peuvent exister sur le port 3000.
- Tests E2E dépendent de Docker.
- E2E admin test cleanup fragile/non-idempotent.
- README décrit des migrations comme non exécutées alors que la CI les valide.
- Aucun déploiement frontend réel vérifié.

## 8. Ce qui manque pour un premier lancement

| Priorité | Point | Dépendances | Taille | Bloquant test local | Bloquant production |
|---|---|---|---|---|---|
| 1 | Projet Supabase de développement + `.env.local` | Compte Supabase de GIRES | Petit | Oui | Oui |
| 2 | Docker/Podman ou accès à Supabase CI | Autorisation machine | Petit/moyen | Oui pour E2E local | Non |
| 3 | Réparer et rendre vert l’E2E admin | Détails PostgreSQL du cleanup | Petit | Oui pour recette | Oui |
| 4 | Nom commercial, logo, domaine | Décision GIRES | Petit | Non | Oui |
| 5 | Vérifier les 40 noms fictifs | Recherche/web | Petit | Non | Oui pour démo publique |
| 6 | Comptes test client/partenaire/livreur/admin | Projet Supabase | Petit | Oui | Non |
| 7 | MFA admin réellement enrôlé | Supabase Auth MFA | Petit | Non | Oui |
| 8 | Catalogue réel ou validation partenaire | Accord partenaires | Moyen/gros | Non | Oui |
| 9 | Photos/licences | Fourniture GIRES | Moyen | Non | Oui |
| 10 | Tarifs de livraison réels | Décision métier/source officielle | Moyen | Non | Oui |
| 11 | Quartiers/zones réels | Géométrie officieuse ou officielle | Moyen/gros | Non | Oui |
| 12 | Provider paiement | Société/agrégateur/webhooks | Gros | Non | Oui |
| 13 | Partenaire/livreur réellement opérationnel | Contrats/formations | Gros | Non | Oui |
| 14 | RLS complète sur toutes les tables et tests | pgTAP | Moyen/gros | Non | Oui |
| 15 | Ordonnance, vocal, groupe, courses | Périmètre V1.1 | Gros | Non | Selon périmètre |
| 16 | Conditions/CGV/confidentialité | Validation juridique | Moyen/gros | Non | Oui |
| 17 | Sauvegardes/restauration/surveillance | Hébergement/plan payant | Moyen | Non | Oui |

## 9. Décisions et actions pour GIRES

**Urgent**

1. Créer le projet Supabase `livraison-douala-dev`, copier localement URL/anon/service-role, ref projet.
2. Renseigner `.env.local`; ne jamais partager les clés.
3. Décider si Docker/Podman peut être installé ou accepter uniquement la CI comme validation SQL.
4. Valider le nom provisoire `Douala Livraison` ou choisir le nom définitif.
5. Confirmer qu’on veut continuer sur ce projet avec un flux sans paiement.

**Métier**

6. Fournir frais réels par zone, minimum de commande, plage 5000 XAF et local.
7. Fournir géométrie/quartiers officiels ou confirmer limite OSM indicative.
8. Choisir fournisseur Mobile Money et compte marchand.
9. Fournir partenaires valides, restaurants, pharmacies et livreurs.
10. Décider du périmètre de premier lancement : devis sans paiement, puis livraison, ou uniquement test interne.

**Sécurité/conformité**

11. Activer MFA TOTP Supabase pour l’admin.
12. Valider CGV, confidentialité, politique cookies/remboursement/réclamation.
13. Décider de l’hébergement/stockage des données en Europe.
14. Fournir accords partenaires/livreurs/assurance.
15. Valider le cadre pharmacie/ordonnance.

**Contenu**

16. Valider ou remplacer les 40 noms fictifs.
17. Fournir photos réelles ou valider visuels CSS générés.
18. Fournir numéro WhatsApp officiel si besoin futur.
19. Valider le texte du bandeau démo.

## 10. Plan recommandé

### Premier pour pouvoir tester

1. Créer le projet Supabase de développement gratuit.
2. Copier les clés dans `web/.env.local`, sans les publier.
3. Lancer `npm run dev:setup` interactif.
4. Charger les 40 enseignes via `npm run dev:seed`.
5. Créer les 4 comptes test via `npm run dev:accounts`.
6. Démarrer `npm run dev` et vérifier accueil, adresse, restaurants, pharmacie, panier.
7. Réparer l’E2E admin jusqu’à CI verte.
8. Activer MFA admin et faire une recette client/admin minimale.

### Ensuite

9. Compléter les parcours partenaire/livreur avec les écrans S-40 à S-53.
10. Raccorder/mesurer tous les rôles à RLS.
11. Compléter gestion utilisateurs, audit, remboursements, zones.
12. Ajouter paiement, notifications, cartes/traçage seulement après validation métier.
13. Ajouter vocal, groupe, ordonnance et courses comme V1.1.
14. Finaliser textes juridiques, sauvegardes, surveillance et déploiement.

## Commandes de vérification montrées

```text
git status --short --branch
## feat/bloc-b...origin/feat/bloc-b

git log --oneline -30
# 30 derniers commits affichés; dernier: e80585c

git branch -a
# feat/bloc-b, fix/bloc-a, main, remotes correspondants

npm run typecheck
# exit 0

npm run lint
# exit 0

npm test
# 13 fichiers / 55 tests réussis

npm run build
# échec Turbopack Windows: ModuleGraph::from_graphs_inner was canceled

npm run build:webpack
# succès

npm run test:e2e
# échec avant lancement: docker: command not found / podman not found
```

Cette synthèse ne présente aucune fonctionnalité comme terminée sans vérification. Les éléments SQL sont considérés validés uniquement pour les migrations/tests de la CI, pas comme opérés dans un projet réel.
