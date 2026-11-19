# Invites de départ pour Cursor — semaine 1

Colle les invites une par une, dans l'ordre. Chaque invite se termine par un STOP : ne passe à la suivante que lorsque les critères de validation sont remplis.

## Invite 0 — Contexte (à coller en premier)

```
Lis intégralement le dossier /docs (README, DECISIONS, PRD, TRD, APP_FLOW, UX_UI_DESIGN_BRIEF, BACKEND_SCHEMA, IMPLEMENTATION_PLAN, ANNEXE_CONFORMITE_RISQUES) et AGENT_RULES.md.
Ne code rien pour l'instant.
Réponds avec :
1. Un résumé du projet en 10 lignes.
2. La liste des décisions techniques que tu comprends.
3. Les ambiguïtés ou contradictions que tu as trouvées entre les documents.
4. Ton plan pour la semaine 1 (phases 1 à 4 de IMPLEMENTATION_PLAN).
5. Tes questions.
STOP : attends ma validation.
```

## Invite 1 — Jour 1 : fondations (phase 1)

```
Réalise la phase 1 de IMPLEMENTATION_PLAN.
- Initialise un projet Next.js (App Router) en TypeScript strict, avec Tailwind CSS, shadcn/ui, next-intl (fr, en), ESLint, Prettier.
- Crée l'arborescence décrite dans TRD.md section 2.4.
- Prépare .env.example, .gitignore (avec .env), un fichier de configuration des variables d'environnement validé avec Zod.
- Initialise Supabase (CLI) avec les dossiers supabase/migrations et supabase/functions.
- Ajoute une intégration continue GitHub Actions : vérification des types, lint, tests.
- Ajoute le manifest PWA minimal.
Critères de validation : le projet démarre en local, la CI passe, aucun secret dans le dépôt, la page d'accueil s'affiche en français et en anglais.
STOP : montre-moi l'arborescence et les commandes pour tester.
```

## Invite 2 — Jour 2 : authentification (phase 2)

```
Réalise la phase 2 de IMPLEMENTATION_PLAN avec Supabase Auth.
- Inscription et connexion par email et mot de passe, confirmation par email, mot de passe oublié.
- Création automatique d'un profil à l'inscription (profiles) et attribution du rôle client (user_roles).
- Anti-robots (Cloudflare Turnstile ou hCaptcha), limitation des tentatives, messages d'erreur génériques identiques que l'email existe ou non.
- Sessions avec durée limitée, déconnexion, révocation des sessions d'un compte suspendu.
- Pages en français et en anglais avec états de chargement, d'erreur et de confirmation.
Critères de validation : l'audit des 5 failles de TRD.md section 2.8 est passé, chaque point avec un test ou une vérification documentée.
STOP : liste-moi les tests exécutés et leurs résultats.
```

## Invite 3 — Jour 3 : schéma et sécurité de la base (phases 3 et 4, début)

```
Écris les migrations SQL des tables de la première vague de BACKEND_SCHEMA : profiles, user_roles, zones, neighborhoods, addresses, partners, partner_members, partner_hours, categories, products, orders, order_items, order_status_history, payments, payment_events, audit_logs, settings, legal_acceptances.
- Types enum, contraintes, index, clés étrangères conformes au schéma.
- Active la RLS sur toutes les tables et écris les politiques de BACKEND_SCHEMA section 5.3.
- Ajoute des données de démonstration clairement fictives (seed) : 3 zones, 5 quartiers, 3 partenaires avec horaires, 15 produits.
- Écris des tests des politiques RLS : un client ne lit jamais la commande d'un autre, un partenaire ne voit pas le téléphone du client, etc.
Critères de validation : toutes les migrations s'appliquent sur une base vide, tous les tests RLS passent.
STOP : montre-moi les politiques et les résultats des tests.
```

## Invite 4 — Jour 4 : rôles, espaces et redirections

```
Implémente les quatre espaces (client, partenaire, livreur, agent/admin) dans une seule application.
- Garde de rôle côté serveur (middleware et vérifications dans les fonctions serveur) ; redirections de APP_FLOW.md section 3.1.
- Layouts par espace avec navigation, thème jour/nuit automatique selon l'heure, jetons de design de UX_UI_DESIGN_BRIEF.md.
- Écrans vides mais navigables, avec squelettes de chargement.
Critères de validation : chaque rôle arrive sur sa bonne page, un rôle ne peut pas ouvrir l'espace d'un autre, y compris en tapant l'adresse à la main ou en appelant l'API directement.
STOP : montre-moi la matrice rôle par page testée.
```

## Invite 5 — Jour 5 : audit de la semaine

```
Fais un audit complet de la semaine :
1. Rejoue l'audit des 5 failles de connexion avec résultats.
2. Teste les politiques RLS et tente des accès croisés entre rôles.
3. Vérifie qu'aucun secret n'est dans le dépôt ni dans l'historique Git.
4. Mesure une base de performance (Lighthouse) sur la page d'accueil en simulation 4G lente.
5. Liste ce qui reste à faire pour la phase 4 (catalogue et partenaires), les risques, et les écarts avec les documents.
6. Mets à jour le journal des décisions.
Rédige un rapport clair.
STOP : n'ajoute aucune fonctionnalité avant ma validation.
```

## Invite de revue de sécurité (à réutiliser)

```
Fais une revue de sécurité des changements récents : secrets, RLS, validation des entrées, droits côté serveur, gestion des erreurs, journalisation. Liste chaque problème avec sa gravité, sa correction proposée et ce qu'il faut tester. Ne corrige rien avant mon accord.
```

## Invite de mise à jour de la documentation (à réutiliser)

```
Compare le code actuel avec /docs. Liste les écarts, propose les mises à jour des documents concernés et ajoute les décisions prises au journal des décisions. Ne modifie le code qu'après mon accord.
```
