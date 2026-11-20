# Livraison à Douala

Application web progressive bilingue pour une plateforme de livraison à Douala. Le développement suit les documents de conception du dossier `docs/` et avance écran par écran.

## État

- Le catalogue bilingue présente les 58 écrans définis dans les documents : client/public, partenaire, livreur et opérations.
- Ces écrans partagent maintenant une mise en page responsive conforme à la direction Ciel, avec la navigation mobile centrale de la maquette. La recherche d'accueil ouvre le parcours de recherche ; les écrans métier non connectés restent clairement des prévisualisations.
- Les routes de connexion, inscription, récupération et réinitialisation sont maintenant connectées au code Supabase Auth côté serveur ; elles restent désactivées tant que les variables, versions légales et migration ne sont pas configurées.
- Les listes de restaurants/pharmacies, horaires, menus, options, recherche de plats et panier lisent les données Supabase réelles. En l’absence de configuration ou de données vérifiées, aucun commerce ni produit d’exemple n’est inventé.
- Le panier est conservé sur l’appareil, limité à une enseigne et affiche seulement le sous-total des articles. Il ne crée pas de commande et ne constitue pas un devis.
- La plupart des autres vues métier restent des prévisualisations génériques, pas des parcours prêts à l’usage. Elles seront remplacées par étapes conformément au plan du dossier.
- La saisie initiale de l’adresse et la demande de position GPS restent facultatives ; le GPS n’est demandé qu’après une action explicite.
- La couverture par quartier, le géocodage, les devis/frais, les commandes, les paiements et les services externes ne sont pas connectés. Le passage en caisse est donc volontairement bloqué.
- Les écrans sensibles ne sont pas prêts pour la production tant que les migrations, les rôles et les autorisations du projet réel n’ont pas été appliqués et vérifiés.
- Aucun déploiement public, dépôt GitHub distant, projet Supabase réel ou prestataire de paiement n'est encore configuré.
- Les migrations Supabase sont versionnées dans `supabase/migrations/`, mais n’ont pas été exécutées et doivent être validées avant tout déploiement.
- `20261111000100_auth_profiles_rls.sql` ferme les tables par défaut ; `20261111000200_public_catalog_policies.sql` accorde seulement les lectures publiques nécessaires au catalogue vérifié. Les tests de politiques RLS restent à exécuter sur un projet Supabase réel.

Pour activer l’authentification en développement, configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, les versions de CGU/confidentialité après validation de leurs textes et `AUTHENTICATION_ENABLED=true` dans `.env.local`, puis applique les migrations et configure les emails de confirmation dans Supabase. N’expose jamais `SUPABASE_SERVICE_ROLE_KEY` dans le navigateur.

## Développement local

Prérequis : Node.js 22.12 ou plus récent et npm.

```bash
npm ci
npm run dev
```

Le site est servi à `http://localhost:3000` et redirige vers `/fr`. La version anglaise est accessible sur `/en`.

Les variables de `.env.example` sont optionnelles pour cet écran. Copie ce fichier vers `.env.local` si tu souhaites définir le nom de marque. La clé `SUPABASE_SERVICE_ROLE_KEY`, lorsqu’elle sera utilisée, doit rester exclusivement côté serveur.

### Polices locales

Inter (texte) et Fraunces (titres) proviennent des paquets `@fontsource-variable/inter` et `@fontsource-variable/fraunces`. Seuls les deux fichiers WOFF2 latins sont livrés et préchargés localement (115 560 octets au total) ; leurs licences OFL sont conservées dans `public/fonts/`.

### Tests navigateur avec authentification

`npm run test:e2e` démarre une instance Supabase locale si nécessaire, provisionne des comptes fictifs client/partenaire/livreur/admin et lance l'application avec Supabase Auth réellement activé. Les parcours sensibles sont visités par un compte du rôle autorisé ; un test vérifie également qu'un client ne peut pas ouvrir un écran partenaire. Aucun mécanisme de contournement de `requireRole` n'est utilisé. Docker doit être disponible pour démarrer Supabase ; la pile démarrée par la commande est arrêtée à la fin.

## Vérifications

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Les tests SQL, les tests de politiques RLS et les tests navigateur devront être exécutés après l’installation/configuration de Supabase CLI, Docker et Playwright.
