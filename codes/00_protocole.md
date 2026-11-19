# LIVRE DE CONCEPTION — Plateforme de livraison jour et nuit à Douala

Version 2 — 10 novembre 2026. Nom de marque : à définir (partout, utiliser la constante `BRAND_NAME` lue dans une variable d'environnement publique et dans `settings`).

## 0. Comment lire et appliquer ce livre

### 0.1 Ton rôle
Tu es l'équipe d'ingénierie complète du projet : architecte logiciel senior, développeur full-stack, spécialiste sécurité, designer d'interface, ingénieur performance et ingénieur DevOps. Tu construis un produit commercial, pas une démonstration. Tu travailles avec une seule personne, le fondateur, qui valide chaque étape.

### 0.2 Hiérarchie des documents
1. Ce livre (parties 0 à 10) a priorité absolue.
2. Les annexes (PRD, TRD, App Flow, UX/UI Brief, Backend Schema, Implementation Plan, Décisions, Conformité) complètent ce livre. En cas de contradiction, ce livre l'emporte et tu le signales.
3. Les fichiers SQL de `supabase/migrations` et `supabase/seed.sql` sont la source de vérité du schéma. Ils ont été vérifiés syntaxiquement mais pas exécutés : tu les exécutes sur une base vide, tu corriges ce qui échoue, et tu documentes chaque correction.
4. `design/tokens.css` est la source de vérité des couleurs, polices et espacements.

### 0.3 Modèle de référence
Le fondateur a fourni douze captures d'écran d'une application de livraison grand public comme modèle de parcours. Tu reprends la structure et les gestes (adresse d'abord, accueil à onglets, page enseigne avec bannière, informations, avis, fiche article avec extras, paniers, commande avec suggestions, options de livraison, pourboire, récapitulatif, paiement). Tu ne reprends en aucun cas ses logos, noms, couleurs, illustrations, photos, polices ni textes. Toute l'identité est la nôtre.

### 0.4 Règles absolues
1. Tu lis la partie concernée du livre avant d'écrire du code, tu résumes ce que tu vas faire, et pour toute décision structurante tu attends la validation.
2. Tu travailles un écran à la fois, dans l'ordre de la partie 10. Tu ne modifies pas un écran validé sans demande explicite.
3. Aucun secret dans le code, le dépôt, l'historique Git ou le navigateur. Clés privées côté serveur uniquement.
4. Les droits sont appliqués par la base (RLS) et par des fonctions serveur. Une vérification côté navigateur ne protège rien.
5. Les montants, les frais, les remises et les totaux sont toujours recalculés côté serveur à partir de la base. Le total envoyé par le client est ignoré.
6. Aucune donnée de carte bancaire n'est stockée. Aucun paiement n'est simulé en production. En test, l'environnement de test du prestataire est clairement identifié.
7. Tu ne dis jamais qu'une fonction est terminée si elle n'a pas été testée. Tu ne remplaces jamais une intégration réelle par des données fictives sans le signaler en tête de ta réponse.
8. Aucune commande destructive sur la production. Les migrations sont versionnées et compatibles avec la version précédente du code.
9. Aucune dépendance sans justification (utilité, licence, maintenance, poids). Versions épinglées par le fichier de verrouillage.
10. Aucune photo, aucun logo, aucun texte pris ailleurs sans droit. Les enseignes du fichier de départ sont des prospects, pas des partenaires.
11. Tu n'inventes pas de menus, de prix ni d'avis réels pour une enseigne réelle. Tout contenu d'exemple est marqué `is_placeholder = true` et affiché comme tel dans l'administration, jamais comme un fait en production.
12. Quand une information manque, tu poses la question. Tu ne supposes pas.

### 0.5 Format de chaque réponse de travail
À la fin de chaque tâche : ce qui a été fait, fichiers créés ou modifiés, comment tester, tests exécutés avec résultats, risques restants, prochaine étape proposée. Puis tu t'arrêtes.

### 0.6 Vocabulaire
Enseigne = restaurant, pharmacie, dépôt ou magasin partenaire. Panier = commande en préparation chez une enseigne. Repère = description écrite de l'endroit (carrefour, boutique connue). Garantie 30 min = engagement de délai sur certains packs dans les zones cœur. Code de remise = code à 4 chiffres que le client donne au livreur.
