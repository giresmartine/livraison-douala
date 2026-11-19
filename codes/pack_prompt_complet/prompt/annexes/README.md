# Dossier de référence — plateforme de livraison jour et nuit à Douala (v1.1)

Ces documents sont la source de vérité du projet. À placer dans le dossier `/docs` à la racine du dépôt.

## Contenu

| Fichier | Rôle |
|---|---|
| `DECISIONS.md` | Décisions prises, changements depuis la v1 |
| `PRD.md` | Exigences produit : rôles, fonctionnalités, règles métier, cas d'usage, critères d'acceptation |
| `TRD.md` | Exigences techniques : architecture, stack justifiée, sécurité, performance, environnements |
| `APP_FLOW.md` | Parcours, redirections, états de l'interface, statuts de commande |
| `UX_UI_DESIGN_BRIEF.md` | Identité visuelle, jetons de design, composants, écrans |
| `BACKEND_SCHEMA.md` | Tables, relations, politiques RLS, données sensibles, sauvegardes |
| `IMPLEMENTATION_PLAN.md` | Phases, critères de passage, calendrier du premier mois |
| `ANNEXE_CONFORMITE_RISQUES.md` | Conformité juridique, risques, journal des décisions, questions ouvertes |
| `AGENT_RULES.md` | Règles impératives pour l'agent IA (à copier dans `.cursor/rules`) |
| `CURSOR_PROMPTS_SEMAINE_1.md` | Invites prêtes à coller pour la première semaine |

## Comment s'en servir avec Cursor

1. Copie le dossier `docs` à la racine du projet.
2. Copie le contenu de `AGENT_RULES.md` dans `.cursor/rules` (ou le fichier de règles de ton projet).
3. Commence par l'invite 0 de `CURSOR_PROMPTS_SEMAINE_1.md` : l'agent lit tout, résume, pose ses questions, et ne code pas.
4. Avance invite par invite. Ne passe à la suivante que lorsque les critères de validation sont remplis.
5. Quand une décision change, mets à jour les documents concernés et ajoute une ligne au journal des décisions.

## Avertissements

- Les chiffres marqués « hypothèse » sont à remplacer par des mesures réelles.
- Les points juridiques ne constituent pas un avis juridique : à faire valider (données personnelles, alcool, ordonnances, CGV).
- Le nom de la marque n'est pas encore défini : la documentation parle de « la plateforme ».
