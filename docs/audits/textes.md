# Audit des textes visibles

## Décisions

- Nom provisoire unique : **Douala Livraison**. Le vrai nom et le logo restent à choisir.
- Tutoiement dans les textes français destinés au client.
- Même marque dans l'accueil, les en-têtes, les métadonnées et le manifeste.
- Les données géographiques OpenStreetMap sont créditées dans une page dédiée, pas dans le texte principal de l'accueil.
- Aucun frais de livraison, avis, note ou délai de livraison fictif n'est affiché.

## Avant / après

| Emplacement | Avant | Après |
|---|---|---|
| En-têtes et titres | « Livraison », « Livraison à Douala », « Livraison · Maintenant », « Douala » comme nom | « Douala Livraison » depuis `lib/config/brand.ts` |
| Accroche de l'accueil | « Jour et nuit, près de toi » | « La livraison au rythme de Douala » |
| Couverture FR | « Aucun quartier n’est refusé parce qu’il manque dans la liste » | « Nous livrons dans tout Douala. » |
| Couverture EN | Phrase longue sur les quartiers absents | « We deliver across Douala. » |
| Connexion non configurée | Texte de branchement et garantie que le formulaire ne recueille aucun identifiant | « La connexion est momentanément indisponible. Réessaie plus tard. » |
| Catalogue des écrans | « 58 écrans décrits dans le cahier », « PRÉVISUALISATION » | « Parcours disponibles », « Ouvrir » ; uniquement en développement |
| Crédit cartographique | Attribution OpenStreetMap sous le formulaire | Lien « Mentions et crédits » au pied de page et page dédiée avec licence ODbL |

## Parité et vérifications

Les fichiers `web/messages/fr.json` et `web/messages/en.json` doivent avoir exactement les mêmes chemins de clés et les mêmes variables d'interpolation. Le test `messages.test.ts` vérifie également l'absence des formulations de développeur recensées.

Les copies de la galerie restent des outils de développement et ne sont pas incluses dans les parcours publics. Les contenus liés à la marque sont définis dans `web/lib/config/brand.ts`; le manifeste est généré par `web/app/manifest.ts`.

## À confirmer

« Douala Livraison » et le logo textuel « DL » sont provisoires. Remplace-les après validation du nom commercial et du logo définitifs.
