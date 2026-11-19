# Règles de travail pour l'agent IA

Tu travailles sur une plateforme de livraison jour et nuit à Douala (PWA Next.js + Supabase). Les documents de `/docs` sont la source de vérité. En cas de contradiction entre une demande et ces documents, signale-le et demande une décision avant d'agir.

## Avant de coder

1. Lis les documents concernés de `/docs` avant toute modification.
2. Résume ce que tu comprends et ce que tu vas faire ; attends la validation pour les changements importants.
3. Si une information manque ou est ambiguë, pose la question au lieu de supposer.

## Règles impératives

1. TypeScript en mode strict, aucun `any` sans justification écrite.
2. Une seule application avec accès par rôle ; ne crée pas plusieurs systèmes pour le même problème.
3. Composants réutilisables, pas de duplication ; respecte le système de design (`UX_UI_DESIGN_BRIEF.md`).
4. Aucune dépendance superflue ; vérifie provenance, licence et compatibilité avant d'en ajouter une.
5. Aucun secret dans le frontend ni dans Git ; variables d'environnement, `.env` dans `.gitignore`, `.env.example` à jour.
6. Les droits sont appliqués par la base (RLS) et les fonctions serveur, jamais seulement par l'interface.
7. Ne contourne jamais une règle de sécurité pour gagner du temps.
8. Ne simule jamais un paiement réel : environnement de test clairement identifié.
9. Ne prétends jamais qu'une fonction est terminée si elle n'a pas été testée.
10. Ne remplace pas une intégration réelle par des données fictives sans le signaler.
11. Modifications progressives et vérifiables ; après chaque changement, vérifie que les fonctions existantes marchent toujours.
12. Migrations SQL versionnées dans `/supabase/migrations` ; aucune commande destructive sur la production sans validation explicite.
13. Documente chaque décision technique importante dans `ANNEXE_CONFORMITE_RISQUES.md` (journal des décisions).
14. Signale les risques avant toute opération destructive ou irréversible.

## Sécurité (non négociable)

- Authentification : limitation des tentatives, anti-robots, messages d'erreur génériques, sessions avec expiration et révocation, mots de passe jamais stockés (Supabase Auth).
- Base de données : RLS sur toutes les tables, validation avant insertion, colonnes limitées dans les requêtes.
- Fichiers : taille maximale, vrai type MIME, renommage sûr, bucket privé et URL signées pour les ordonnances, purge à 30 jours.
- Paiement : aucune donnée de carte, vérification serveur, webhooks signés et anti-rejeu, clés d'idempotence.
- Données personnelles : minimiser, journaliser les accès sensibles, respecter les durées de conservation.

## Performance

- Objectifs de `TRD.md` section 2.9 : affichage principal en moins de 2,5 s sur 4G moyenne, premier chargement léger.
- Squelettes de chargement, états vides et d'erreur, jamais d'écran blanc.
- Pagination, debounce de la recherche, requêtes en parallèle, index, pas de requêtes N+1.
- Résistance au réseau faible : panier sauvegardé, commande mise en attente avec identifiant unique.

## Langue et conventions

- Code, noms de tables et de variables en anglais ; textes de l'interface en français et en anglais via `next-intl`.
- Montants en FCFA entiers ; dates en `timestamptz`, affichées en fuseau Africa/Douala.
- Messages de commit clairs, une fonctionnalité par branche.

## Fin de chaque tâche

Indique : ce qui a été fait, les fichiers modifiés, comment le tester, les tests exécutés, les risques restants. Puis arrête-toi et attends la validation.
