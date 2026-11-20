# Flux de commande « frais à confirmer »

Ce plan et son implémentation ont été validés par GIRES le 21 novembre 2026. Le flux ne comporte ni paiement, ni acceptation par le partenaire, ni préparation. Il s'arrête après la décision du client sur le devis.

## Parcours et statuts

| État | Déclencheur | Règles | Transition permise |
|---|---|---|---|
| `pending_fee_quote` | Envoi du récapitulatif par un client authentifié | Prix des lignes recalculés côté serveur ; frais nuls ; `quote_requested_at` renseigné ; aucun `quote_expires_at` avant l'envoi du devis | Admin authentifié récemment : `awaiting_customer_confirmation`. Client : `cancelled` / `customer_cancelled`. Expiration paresseuse après 120 min sans devis : `cancelled` / `quote_not_provided`. |
| `awaiting_customer_confirmation` | Admin fixe et envoie un devis | `delivery_fee` entier XAF ≤ plafond configuré ; total recalculé ; `quote_version` incrémenté ; démarrage de l'échéance 30 min à `quote_expires_at` ; devis immuable | Client propriétaire présentant le total et la version affichés : `quote_accepted`, ou `cancelled` / `quote_declined`. Expiration contrôlée par la base lors de chaque acceptation : `cancelled` / `quote_expired`. Admin : annulation / `quote_replaced`, puis réémission en version suivante. |
| `quote_accepted` | Acceptation validée par la base | Aucun paiement, transmission au partenaire ou démarrage de livraison dans ce bloc | Terminal dans ce périmètre. |
| `cancelled` | Annulation, refus ou expiration | `cancel_reason` distingue `customer_cancelled`, `quote_declined`, `quote_expired`, `quote_not_provided` et `quote_replaced` | Terminal, sauf réémission admin qui journalise l'annulation puis crée un nouveau devis en `awaiting_customer_confirmation` avec version incrémentée. |

Les transitions du cycle de commande historique passent par `public.transition_order()` et une ligne autorisée de `order_transitions`. Le flux de devis utilise exclusivement `send_order_fee_quote()`, `cancel_order_fee_quote()` et `accept_order_fee_quote()` ; l'ancienne fonction générique refuse ces statuts pour éviter de contourner les contrôles de frais, session et version. Chaque action écrit `order_status_history` et `audit_logs` avec acteur, statut antérieur, statut nouveau et horodatage. L'envoi du devis est atomique : frais/version et transition réussissent ensemble ou sont tous annulés. L'acceptation compare à la base le montant et la version présentés au client.

## Paramètres opérationnels

Une ligne de configuration modifiable sans déploiement porte les valeurs initiales validées :

| Clé | Valeur initiale | Règle en cas d'absence |
|---|---:|---|
| Plafond de `delivery_fee` | 5 000 XAF | Refuser l'envoi du devis |
| Délai d'acceptation d'un devis | 1 800 s (30 min) | Refuser l'envoi du devis |
| Délai sans devis | 7 200 s (120 min) | Ne pas annuler automatiquement ; signaler l'erreur opérationnelle |
| Commandes de devis simultanément en attente par client | 3 | Refuser la création |
| Soumissions par compte sur une heure glissante | 10 | Refuser la création |
| Âge maximal de réauthentification admin | 900 s (15 min) | Refuser la fixation, l'annulation et la réémission |
| AAL minimum pour actions devis admin | `aal2` si le compte a un facteur MFA vérifié ; sinon `aal1` avec AMR récent | Refuser l'action |

Les autres composantes (`service_fee`, `surcharges`, pourboire) sont désactivées et ne sont ni saisissables ni incluses dans le devis. Les montants sont des entiers XAF ; le total est égal au sous-total des lignes plus `delivery_fee`. Toutes les contraintes bloquent les montants négatifs et les totaux incohérents.

### Réauthentification admin vérifiée

Le JWT d'accès Supabase expose `aal` et `amr`; la documentation des claims distingue `auth_time` dans l'ID token, pas dans le payload AccessTokenClaims GoTrue. Chaque élément `amr` contient méthode et timestamp d'authentification. GoTrue calcule les AMR depuis les enregistrements AMR de la session et sérialise leur `updated_at`, triés du plus récent au plus ancien ; le renouvellement du jeton ne rafraîchit pas cet horodatage. Le contrôle utilise le timestamp AMR le plus récent, jamais `iat`, et échoue si le tableau, la méthode ou le timestamp manque, est futur ou dépasse la fenêtre configurée. Si MFA est activé pour l'administrateur, `aal` doit aussi valoir `aal2`.

La fonction détecte l'enrôlement via un facteur `auth.mfa_factors` au statut `verified` : l'admin doit alors présenter `aal2`. Sans facteur vérifié, un AMR récent avec `aal1` est accepté ; l'activation MFA et l'enrôlement des administrateurs restent à faire dans Supabase Auth pour rendre l'exigence `aal2` applicable.

Sources vérifiées le 21 novembre 2026 :

- [Référence des claims JWT Supabase](https://supabase.com/docs/guides/auth/jwt-fields)
- [Documentation MFA Supabase](https://supabase.com/docs/guides/auth/auth-mfa)
- [Structure des claims AccessToken GoTrue](https://github.com/supabase/auth/blob/master/internal/tokens/service.go)
- [Calcul des AMR depuis les timestamps de session GoTrue](https://github.com/supabase/auth/blob/master/internal/models/sessions.go)

Les tests SQL doivent couvrir AMR frais, 16 minutes, absent, `iat` frais avec AMR absent/ancien, `aal` insuffisant et configuration absente. La fraîcheur AMR est également testée contre un renouvellement de JWT simulé où `iat` avance mais l'AMR reste inchangé.

## Écrans existants

Aucun code écran supplémentaire :

- **S-17 — Récapitulatif** (`/commande/recapitulatif`) : articles, adresse/quartier, sous-total, frais « Confirmés avant tout paiement », bouton « Envoyer ma commande » et message « Aucun paiement maintenant ».
- **S-20 — Suivi** (`/commande/apercu/suivi`) : état « En attente des frais de livraison » et frise « Commande envoyée → Frais confirmés → Ton accord ». Realtime si disponible, sinon actualisation périodique ; notifications dans l'application uniquement.
- **S-28 — Détail commande** (`/commandes/apercu`) : devis XAF, version, échéance, accepter/refuser avec confirmation, états expiré/annulé/déjà traité.
- **S-61 — Commandes et dispatch** (`/ops/commandes`) : file dédiée de devis en attente, triée du plus ancien, durée d'attente et détail limité au besoin de traitement. La lecture sensible par un admin passe par une fonction journalisée.

Les vues client et partenaire n'exposent que les colonnes nécessaires. La vue partenaire fournit ses lignes et le quartier seulement ; aucun téléphone, adresse, instructions ni identifiant client n'est dans une vue/table lisible par le partenaire. Le livreur n'obtient ces données que par une fonction après assignation et pendant une course active. Les accès admin aux données de commande/adresse sont journalisés dans `audit_logs`.

## Schéma RLS cible

| Acteur | Commandes et lignes | Adresse / contact | Écriture |
|---|---|---|---|
| Client actif | Ses commandes seulement | Sa propre adresse ; son détail de commande | Création par fonction serveur ; transitions autorisées par RPC ; aucun UPDATE direct |
| Partenaire actif | Lignes de ses établissements, avant et après acceptation | Quartier seulement, sans téléphone/adresse complète | Aucune action sur ce flux |
| Livreur actif | Commandes qui lui sont assignées | Adresse complète et téléphone seulement si la course assignée est active | Aucun accès avant assignation |
| Admin actif | Liste minimale et détail via RPC audité | Via RPC audité | Devis/transitions via fonctions SECURITY DEFINER avec `search_path = ''`, contrôle rôle + fraîcheur AMR + AAL |
| Compte suspendu | Aucun accès | Aucun accès | Aucun accès |

Toutes les politiques et fonctions vérifient `is_active_user()`. Les privilèges directs ne doivent pas permettre de contourner les RPC ni d'accéder aux données cachées. Les politiques RLS sont testées en pgTAP en succès et en échec pour chaque rôle, y compris partenaire A contre commande de partenaire B.

## Création côté serveur

Une Server Action valide la requête avec le schéma Zod partagé, récupère l'utilisateur avec Supabase Auth et appelle une fonction transactionnelle. Le serveur lit l'adresse à Douala (quartier libre S-01 autorisé), le partenaire actif et ouvert, le catalogue disponible et les options. Il recalcule prix, libellés, options et lignes ; les prix du navigateur sont ignorés. Une commande multi-partenaire, un panier vide, une quantité hors limites, un produit non disponible, un compte suspendu/non connecté ou les quotas dépassés sont refusés avec une erreur client générique. Aucun identifiant personnel ni détail de panier n'est écrit dans les logs.

La clé d'idempotence est unique par utilisateur : une répétition retourne la commande déjà créée, y compris après un retour réseau, sans créer de doublon.

## Expiration et notifications

Pas de dépendance à `pg_cron`. La base vérifie l'expiration à chaque acceptation et, à la lecture des files/détails, traite les commandes dépassant les 30/120 minutes. Le compte à rebours navigateur est purement indicatif. Une tâche planifiée pourra accélérer les mises à jour d'état ultérieurement, sans devenir la seule protection.

La notification de ce bloc reste dans l'application (état, frise, indicateur). Email et SMS sont hors périmètre.

## Tests et validation

- pgTAP : contraintes et somme XAF, statuts et transitions permises/refusées, motifs d'annulation, expiration 30/120 min, devis immuable/version, configuration manquante, plafonds, idempotence, MFA/AMR, RLS de chaque rôle et comptes suspendus.
- Unitaires : prix falsifiés, double envoi, panier invalide, partenaire fermé, non authentifié, limites 3/10, montant hors plafond, session admin stale et réponse d'erreur générique.
- E2E : client envoie → admin chiffre → client accepte ; refus ; expiration ; écran S-61 ; rôles réels de test issus uniquement de fixtures `TEST -`. Tests de parité FR/EN et axe/Playwright sur 360/1280 px, jour/nuit.
- Captures de chaque état livré aux tailles mobile/bureau et thèmes jour/nuit, enregistrées dans `docs/captures/`.
- Validation des migrations et pgTAP exclusivement par le workflow GitHub Actions : `supabase start`, application/reset local des migrations, puis `supabase test db`. Docker n'étant pas installé sur ce poste, aucun résultat local SQL ne sera prétendu. Aucune migration n'est appliquée à un projet Supabase réel.

## Risques et actions GIRES

- Activer le fournisseur MFA dans Supabase Auth, enrôler chaque compte admin avec un facteur vérifié, et s'assurer que le JWT d'action admin présente `aal2`. Les actions restent bloquées tant que la valeur d'AAL requise est absente.
- Choisir plus tard si des notifications email/SMS sont nécessaires.
- La limite GPS S-01 est indicative/provisoire ; elle ne produit ni zone ni tarif.
- Aucun paiement, partenaire notifié ou traitement de commande ne suit `quote_accepted` dans ce bloc.
