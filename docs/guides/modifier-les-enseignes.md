# Modifier les enseignes de démonstration

Toutes les données éditables sont dans `web/supabase/dev-data/enseignes.json`. Le fichier contient les catalogues partagés, les horaires types et les 40 enseignes de démonstration. Les quartiers et coordonnées ne sont pas inventés : les adresses restent vides et le client saisit librement son quartier.

## Changer une enseigne

1. Ouvre `web/supabase/dev-data/enseignes.json`.
2. Dans `partners`, retrouve l'entrée par son `slug`.
3. Modifie `name`, les deux descriptions `fr` et `en`, le type, le minimum (`minimum_order`), ou le profil d'horaires (`hours`).
4. Garde le préfixe `TEST - ` dans le nom pour signaler le caractère fictif.
5. Pour changer ses produits, modifie le catalogue référencé par `catalogue`. Le même profil peut être partagé : les changements s'appliquent alors aux enseignes qui l'utilisent.

## Changer un prix ou une option

Dans `catalogues`, ouvre le profil voulu puis le produit identifié par son `slug`.

- `price` et `price_delta` sont des montants en XAF entiers ; `available` vaut `true` ou `false` ;
- `name.fr` et `name.en` sont tous deux requis ;
- les options sont facultatives et ne modifient que le prix du produit ;
- chaque catalogue doit fournir de 8 à 12 produits ;
- pour les pharmacies, conserve uniquement les articles d'hygiène et de parapharmacie, sans médicament, posologie ni allégation de santé.

Les données ne contiennent ni notes, ni avis, ni frais de livraison, ni délai de livraison. Aucun tarif de livraison n'est simulé.

## Changer les horaires

Les horaires de la semaine se trouvent dans `hours`. Les jours suivent la convention JavaScript : `0` dimanche, `1` lundi, jusqu'à `6` samedi. Les heures utilisent le format `HH:MM`. `all_day` représente une ouverture 24 h/24. Un magasin avec `hours: "closed"` n'a volontairement aucun horaire.

La fermeture exceptionnelle est définie par `exceptional_closure`. Sa durée commence à chaque chargement des données ; pour la désactiver, utilise `null`.

## Ajouter ou supprimer une enseigne

- Pour en ajouter une, ajoute une entrée `partners` avec un `slug` inédit, un type restaurant/pharmacy, un nom `TEST - `, une description bilingue, un catalogue, des horaires et un minimum de commande. Le catalogue doit avoir de 8 à 12 produits.
- Pour la supprimer, enlève son entrée de `partners`. `npm run dev:seed` supprime les anciennes lignes démo identifiées par `is_demo` et `source=development-demo`. Si une commande historique les référence, l'enseigne est fermée et ses produits désactivés pour préserver l'historique.
- Pour ajouter un nouveau catalogue, ajoute une clé dans `catalogues` puis référence-la depuis l'enseigne.

## Recharger et vérifier

Depuis `web`, lance `npm run dev:seed`. La commande refuse de s'exécuter hors du projet explicitement marqué `development`, crée ou met à jour les lignes par slug, supprime ou archive les anciennes lignes démo qui ne sont plus dans la source et affiche le nombre d'enseignes, de produits et leurs noms. Les comptes de test ne sont pas modifiés.

Les données sont fictives et marquées `is_demo=true` dans la base. N'ajoute jamais de données de clients, de médicaments ou de vraies informations commerciales au fichier démo.
