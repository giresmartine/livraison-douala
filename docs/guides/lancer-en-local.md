# Lancer le site sur son ordinateur

Ce guide crée un projet Supabase **de développement** séparé. Ne choisis jamais un projet utilisé par de vrais clients.

## 1. Créer le projet Supabase de développement

1. Ouvre [supabase.com/dashboard](https://supabase.com/dashboard) et connecte-toi.
2. Clique sur **New project**.
3. Sélectionne ton organisation.
4. Donne exactement le nom `livraison-douala-dev`. Ce nom sert de garde-fou dans les scripts.
5. Dans **Region**, choisis la région disponible la plus proche de Douala. Si plusieurs régions sont proposées, compare leur distance avant de choisir.
6. Génère un mot de passe de base de données unique. Enregistre-le immédiatement dans ton gestionnaire de mots de passe. Ne l'envoie pas dans le chat et ne le mets pas dans un fichier du dépôt.
7. Clique sur **Create new project** et attends que le projet soit prêt.

## 2. Renseigner les clés localement

1. Dans le tableau de bord de ce projet, ouvre **Project Settings → API**.
2. Copie **Project URL**, la clé publique **anon** (ou **publishable**, si le tableau de bord ne propose plus l'ancienne clé anon) et la clé secrète **service_role**.
3. Dans le dépôt, copie `web/.env.example` vers `web/.env.local`.
4. Renseigne les valeurs dans `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL` : Project URL ;
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé publique ;
   - `SUPABASE_SERVICE_ROLE_KEY` : clé `service_role`, uniquement dans ce fichier local ;
   - `SUPABASE_DEV_PROJECT_REF` : référence du projet, visible dans l'URL Supabase ;
   - `SUPABASE_DEV_PROJECT_NAME=livraison-douala-dev` ;
   - conserve `APP_ENV=development`, `AUTHENTICATION_ENABLED=true` et les clés de test Turnstile déjà fournies ;
   - conserve `NEXT_PUBLIC_SITE_URL=http://localhost:3000` et renseigne les versions locales des conditions et de la politique de confidentialité.
5. Enregistre le fichier sans le partager, sans copier les clés dans un ticket et sans les afficher dans un terminal ou une capture.

`.env.local` et `.dev-accounts.txt` sont ignorés par Git. Une clé `service_role` donne un accès administratif complet : ne la place jamais dans un nom `NEXT_PUBLIC_*`, un journal, une capture ou un dépôt.

## 3. Configurer la CAPTCHA de développement

Dans **Authentication → Bot and Abuse Protection**, configure Turnstile uniquement sur ce projet :

- clé de site de test officielle : `1x00000000000000000000AA` (déjà dans `.env.example`) ;
- clé secrète de test officielle : `1x0000000000000000000000000000000AA`.

Ces clés de test ne protègent pas un site réel. Ne les configure jamais sur la production. La confirmation des e-mails de test n'a pas besoin d'un fournisseur : le script crée les comptes avec l'adresse déjà confirmée.

## 4. Appliquer les migrations et préparer les comptes

Depuis le dossier `web`, lance `npm run dev:setup`. La commande :

1. vérifie `APP_ENV=development`, le nom du projet, la correspondance URL/référence et la clé Turnstile de test ;
2. lance `supabase login` pour la connexion interactive ;
3. lie le dépôt au projet dont la référence est dans `.env.local` ;
4. applique les migrations à **ce projet de développement uniquement** ;
5. charge les données fictives de `supabase/dev-data/enseignes.json` ;
6. crée quatre comptes confirmés (`@demo.example.test`) et écrit leurs mots de passe une seule fois dans `web/.dev-accounts.txt`.

La commande `npm run dev:seed` recharge uniquement le catalogue démo, en mettant à jour les éléments par slug. Elle refuse de fonctionner si les garde-fous de développement ne sont pas satisfaits. `npm run dev:accounts` ne recrée pas des mots de passe si le fichier existe déjà.

Ensuite, depuis `web`, lance `npm run dev` et visite [http://localhost:3000/fr](http://localhost:3000/fr). Garde les identifiants de test dans le fichier local ; ils ne sont jamais affichés par les scripts.

## Qui fait quoi ?

**À faire par toi :** créer le projet Supabase de développement, enregistrer son mot de passe dans ton gestionnaire de mots de passe, recopier localement les trois valeurs API et valider la connexion interactive dans le navigateur ou le terminal.

**Fait par les scripts :** vérifier les garde-fous, lier le projet indiqué, appliquer les migrations, charger les données démo et créer les comptes de test. Aucune migration n'est appliquée à un projet de production. La CI GitHub reste la validation reproductible des migrations et de pgTAP ; Docker n'est pas requis sur ton ordinateur.
