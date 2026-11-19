# 6. IMPLEMENTATION PLAN

> **Règle de passage :** on ne passe jamais à la phase suivante tant que les critères de validation de la phase en cours ne sont pas remplis. Toute modification est progressive et vérifiable ; les fonctions précédentes sont retestées après chaque changement.

## 6.1 Phases

| Phase | Tâches principales | Livrables | Critères de validation |
|---|---|---|---|
| 0 Préparation | Nom, SARL (CFCE), SIM dédiée, comptes, partenaires, livreurs, accord écrit livreurs, décision d'infrastructure de production | Documents validés, nom vérifié | Ce dossier approuvé |
| 1 Fondations | Dépôt Git, projet Next.js strict, Supabase (dev, test, prod), CI, .env et secrets | Squelette qui déploie | Déploiement automatique ; aucun secret dans Git |
| 2 Authentification et rôles | Inscription, connexion, confirmation, récupération, rôles, redirections | Auth complète | Audit des 5 failles passé |
| 3 Sécurisation de la base | Schéma, RLS, tests des politiques, journal d'audit | Base protégée | Tests RLS verts ; accès croisés impossibles |
| 4 Catalogue et partenaires | Partenaires, horaires, produits, packs, zones et tarifs, espace partenaire | Catalogue exploitable | Un partenaire fermé n'apparaît pas |
| 5 Client : commande | Accueil, panier, adresse, calcul des frais, récapitulatif, mode hors-ligne | Commande jusqu'au paiement | Parcours testé sur téléphone modeste |
| 6 Paiement | Agrégateur en test, webhooks signés, idempotence, cash cadré, secours manuel | Paiement en test | Pas de double paiement ; mise en service réelle après validation du dossier |
| 7 Livreur et suivi | Espace livreur, statuts, code de remise, suivi client en temps réel, échec de livraison | Livraison de bout en bout | 10 livraisons test réussies |
| 8 Agent et admin | Dispatch, remboursements avec plafond, réclamations, tableau de bord, paramètres | Back-office | Plafond respecté ; journal complet |
| 9 Vocal | Enregistrement, transcription, proposition, validation, suppression audio | Commande vocale assistée | 100 vocaux testés ; mesure d'erreurs |
| 10 Groupe | Création, lien, parts, paiements, clôture | Commande de groupe | Scénarios d'abandon testés |
| 11 Pharmacie et ordonnances | Partenaire pharmacie, envoi sécurisé, validation, purge J+30 | Rayon pharmacie | Cadre réglementaire confirmé, purge testée |
| 12 Courses à la demande | Devis, plafonds, preuves, remboursement de l'écart | Service de courses | Plafonds et exclusions appliqués |
| 13 Performance | Mesures, optimisation, images, cache, requêtes | Rapport de mesures | Objectifs de la section 2.9 atteints |
| 14 Tests | Parcours, droits, formulaires, paiements en test, RLS, erreurs réseau, sessions, responsive, accessibilité, sécurité | Rapport de tests | Aucun défaut bloquant |
| 15 Préparation et lancement | Pages juridiques, consentement, sauvegardes testées, surveillance, lancement doux | Production | Liste de contrôle de l'annexe A complète |

## 6.2 Calendrier du premier mois (V1)

> Tenir toutes ces phases en un mois, seul, est très serré. Le calendrier priorise le chemin critique : commande, paiement et livraison. Le vocal complètement fiabilisé, le groupe, les ordonnances et les courses sont prévus en V1.1 dès que la V1 est solide.

| Semaine | Objectifs |
|---|---|
| 1 | Phases 0, 1, 2 : cadre, fondations, authentification, rôles ; début du schéma et des RLS |
| 2 | Phases 3, 4, 5 : sécurisation, catalogue, partenaires, panier et adresse ; démarrage du paiement en test |
| 3 | Phases 6, 7, 8 : paiement en test, espaces livreur et admin, suivi en temps réel |
| 4 | Phases 14, 15 en version V1 : tests avec proches et livreurs, pages juridiques, infrastructure de production et sauvegardes testées, lancement doux de 50 clients |
| V1.1 | Phases 9 à 12 puis 13 : vocal, groupe, ordonnances, courses, optimisation |

