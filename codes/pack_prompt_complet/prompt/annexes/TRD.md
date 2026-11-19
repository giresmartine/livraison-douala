# 2. TRD — Technical Requirements Document

## 2.1 Principes

- Chaque choix est justifié par la taille du projet, son budget et son évolution ; pas de technologie ajoutée sans besoin.
- Une seule application web (PWA) avec accès par rôle, pas quatre applications.
- La sécurité est pensée dès la conception : les droits sont appliqués par la base de données (RLS), jamais seulement par l'interface.
- Ce qui peut être mesuré doit l'être : performances, erreurs, délais de livraison.

## 2.2 Architecture générale

| Couche | Composant | Rôle |
|---|---|---|
| Client | PWA Next.js (navigateur, installée sur l'écran d'accueil) | Interface des 4 espaces, hors-ligne partiel |
| Edge | Hébergeur front avec CDN | Distribution, mise en cache, HTTPS |
| Backend | Supabase : PostgreSQL, Auth, Realtime, Storage, Edge Functions | Données, authentification, temps réel, fichiers, logique serveur |
| Services | Agrégateur Mobile Money, WhatsApp, email, transcription, modèle de langage, tuiles de carte | Paiement, notifications, vocal, cartes |
| Observabilité | Suivi d'erreurs, logs, surveillance de disponibilité | Alertes et diagnostic |

## 2.3 Stack et justification

| Besoin | Choix | Pourquoi / points d'attention |
|---|---|---|
| Langage | TypeScript en mode strict | Moins d'erreurs, code plus sûr, bon avec Cursor |
| Frontend | Next.js (App Router) + React | PWA, rendu serveur utile pour la rapidité, routage par rôle. Alternative Expo non retenue pour la V1 car le livrable prioritaire est une PWA |
| Interface | Tailwind CSS + composants shadcn/ui (licence MIT) | Rapidité de développement et cohérence visuelle |
| Langues | next-intl | Français et anglais, fichiers de traduction |
| Données côté client | TanStack Query | Cache, évite les requêtes en double, nouvelles tentatives |
| Formulaires | React Hook Form + Zod | Validation partagée client et serveur |
| PWA | Manifest + service worker (Serwist) | Installation, cache, file d'attente de commande hors-ligne. À tester sur Android et iOS |
| Base et auth | Supabase (PostgreSQL), région Europe | RLS, auth intégrée (hachage géré par Supabase), temps réel, stockage. Aucune région africaine proposée : voir annexe A. Gratuit pour le développement et les tests ; en production le plan Pro (environ 25 dollars par mois) est nécessaire : le plan gratuit met le projet en pause après 7 jours d'inactivité et n'a pas de sauvegardes quotidiennes |
| Logique serveur | Supabase Edge Functions | Secrets côté serveur : paiement, webhooks, IA, notifications |
| Tâches planifiées | pg_cron | Suppression des ordonnances à J+30, relances, clôture des groupes |
| Hébergement front | Vercel (région Paris) ou un autre hébergeur à évaluer | L'offre gratuite de Vercel est réservée à un usage non commercial : en production, plan payant (environ 20 dollars par mois et par utilisateur) ou hébergeur alternatif, à décider avant le lancement |
| Paiement | Agrégateur Mobile Money à choisir (candidats à évaluer : CinetPay, Flutterwave, NotchPay) | Critères : MTN et Orange au Cameroun, frais, délai de vérification de l'entreprise, webhooks signés, environnement de test. Choix confirmé après évaluation |
| Notifications | Web push (VAPID), WhatsApp (liens wa.me en V1, API officielle ensuite), email transactionnel (Resend ou Brevo) | Web push sur iOS seulement si la PWA est installée ; WhatsApp facturé par message envoyé par l'entreprise |
| Cartes | MapLibre ou Leaflet + données OpenStreetMap | Les serveurs de tuiles publics d'OSM ne conviennent pas à un usage intensif : fournisseur de tuiles tiers ou auto-hébergement |
| Vocal | Enregistrement navigateur, transcription (modèle de type Whisper), extraction par modèle de langage (API Claude) | Clés côté serveur uniquement ; qualité à tester sur de vrais audios camerounais ; validation humaine |
| Anti-robots | Cloudflare Turnstile ou hCaptcha | Supporté par l'authentification Supabase |
| Suivi | Sentry (erreurs), logs Supabase, sonde de disponibilité, analytics respectueux après consentement | Alerte en cas de panne nocturne |
| Tests | Vitest, Playwright, tests des politiques RLS | Fonctions critiques automatisées |
| Outils | Cursor ou VS Code, Git/GitHub, ESLint, Prettier, GitHub Actions | Intégration continue |

## 2.4 Organisation du code

- **/app** : routes par espace (client, partenaire, livreur, agent-admin), layouts avec garde de rôle.
- **/components** : composants réutilisables du système de design. **/lib** : clients Supabase, utilitaires, schémas Zod. **/messages** : traductions FR/EN.
- **/supabase** : migrations SQL, politiques RLS, fonctions Edge, jeux de données de test. **/docs** : ces documents.

## 2.5 Fonctions serveur (Edge Functions)

| Fonction | Rôle |
|---|---|
| create-payment | Crée la demande de paiement chez l'agrégateur avec clé d'idempotence |
| payment-webhook | Vérifie la signature, anti-rejeu, met à jour paiement et commande |
| voice-to-order | Reçoit l'audio, transcrit, extrait une proposition, supprime l'audio |
| assign-courier | Propose ou assigne un livreur selon la zone |
| notify | Envoie push, WhatsApp, email selon l'événement |
| refund | Exécute un remboursement avec contrôle de plafond et journal |
| purge-prescriptions | Supprime les ordonnances de plus de 30 jours (planifiée) |

## 2.6 Authentification et sessions

- Email + mot de passe via Supabase Auth ; confirmation par email ; téléphone obligatoire à la commande.
- Limitation des tentatives de connexion, protection anti-robots, messages d'erreur génériques, récupération sécurisée du mot de passe.
- Durée de session définie, renouvellement sécurisé, révocation immédiate des sessions d'un compte suspendu ou supprimé.
- Rôles stockés en base ; aucun contrôle d'accès uniquement dans le navigateur.

## 2.7 Sécurité : exigences

| Domaine | Exigences |
|---|---|
| Secrets | Variables d'environnement, .env dans .gitignore, aucune clé secrète dans le frontend, vérification de l'historique Git, procédure de rotation des clés |
| Base de données | RLS activée sur toutes les tables, politiques précises, validation avant insertion, colonnes limitées dans les requêtes, aucune requête construite par concaténation |
| Fichiers | Taille maximale, vérification du vrai type MIME, renommage sécurisé, bucket privé avec URL signées courtes pour les ordonnances, purge automatique |
| Réseau | HTTPS partout, CORS restreint, protections XSS et CSRF, en-têtes de sécurité |
| Paiement | Aucune donnée de carte stockée, vérification serveur, webhooks signés et anti-rejeu, idempotence |
| Journalisation | Actions sensibles journalisées sans données personnelles inutiles ; erreurs détaillées désactivées en production |
| Dépendances | Mises à jour régulières, analyse de vulnérabilités, aucun script tiers non vérifié |
| Sauvegardes | Sauvegardes automatiques, restauration testée avant le lancement |

## 2.8 Audit des cinq failles de connexion

| Faille | Mesure | Vérification |
|---|---|---|
| 1. Tentatives illimitées | Limitation par IP et par compte, anti-robots | Test de 50 tentatives rapides |
| 2. Messages trop explicites | Message unique pour tout échec d'identification | Comparer email existant et inexistant |
| 3. Vérification dans le navigateur | Droits appliqués par RLS et fonctions serveur | Appels directs à l'API sans interface |
| 4. Mots de passe lisibles | Hachage géré par Supabase Auth, pas de stockage parallèle | Inspection de la base |
| 5. Sessions sans expiration | Durée limitée, révocation, déconnexion des comptes suspendus | Test d'expiration et de suspension |

## 2.9 Performance

| Objectif (proposition) | Moyens |
|---|---|
| Affichage principal en moins de 2,5 s sur 4G moyenne ; interaction en moins de 200 ms | Rendu serveur, découpage du JavaScript par page, polices hébergées et limitées |
| Premier chargement léger (viser environ 170 Ko de JavaScript compressé) | Suppression des dépendances inutiles, scripts tiers chargés après le contenu |
| Pas d'écran blanc | Squelettes de chargement, états vides et d'erreur, interface optimiste avec retour arrière |
| Images légères | WebP ou AVIF, chargement différé, CDN, cache navigateur |
| Requêtes efficaces | Debounce de la recherche (300 ms), pagination, requêtes en parallèle, colonnes utiles seulement, index, pool de connexions, délais maximum sur les API externes |
| Résistance au réseau faible | Panier sauvegardé localement, commande mise en attente et renvoyée au retour du réseau, indicateur d'état |
| Mesure réelle | Core Web Vitals sur utilisateurs, tests sur téléphone peu puissant et connexion lente, optimisation selon les mesures |

## 2.10 Environnements, déploiement et maintenance

- **Développement :** Supabase local (CLI), données fictives. **Test :** projet Supabase séparé + prévisualisation du front, paiement en environnement de test. **Production :** projet dédié, accès restreints.
- Intégration continue : vérification des types, lint, tests, analyse des dépendances avant chaque déploiement. Migrations SQL versionnées, aucune commande destructive en production sans validation.
- Surveillance : alertes d'erreurs et de disponibilité, tableau de bord des commandes, revue hebdomadaire des métriques, plan de restauration testé.
- Documentation technique permettant à un autre développeur de reprendre le projet.
- **Coûts d'infrastructure :** développement et tests gratuits ; en production, environ 45 dollars par mois (Supabase Pro environ 25, hébergement du front environ 20), soit environ 25 000 à 30 000 FCFA selon le taux de change. Décision à prendre avant le lancement (semaine 4).

