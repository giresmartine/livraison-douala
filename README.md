# Livraison à Douala

Application web bilingue (français/anglais) pour une plateforme de livraison à Douala. Le code de l'application se trouve dans [`web/`](./web/), et les documents produit et techniques de référence dans [`docs/`](./docs/).

## Lancer le site

Prérequis : Node.js 22.12 ou plus récent et npm.

```powershell
cd web
npm ci
npm run dev
```

Ouvre ensuite [http://localhost:3000/fr](http://localhost:3000/fr). La version anglaise est accessible sur `/en`; `/fr/ecrans` présente le catalogue des 58 écrans.

## État du projet

Les écrans partagent le système visuel Ciel, une navigation adaptée au mobile et des parcours de prévisualisation. Le catalogue et le panier peuvent lire les données Supabase quand un projet est configuré. Aucune enseigne n'est présentée comme partenaire sans activation vérifiée.

Ce dépôt n'est pas encore prêt pour une exploitation réelle : l'instance Supabase, ses migrations et politiques RLS, les partenaires, les textes juridiques, les prestataires de paiement et le déploiement doivent être configurés et validés. En attendant, les commandes et paiements réels restent bloqués ; aucune donnée de démonstration n'est présentée comme réelle.

Consulte [`web/README.md`](./web/README.md) pour les variables d'environnement, les commandes de vérification et les limites fonctionnelles actuelles. Ne place aucune clé privée dans Git ni dans une variable `NEXT_PUBLIC_*`.
