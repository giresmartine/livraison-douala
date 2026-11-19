# 5. BACKEND SCHEMA

Conventions : clés primaires **uuid**, dates en **timestamptz** (fuseau Africa/Douala à l'affichage), montants en **integer** (FCFA), statuts en **enum**, **created_at** et **updated_at** sur chaque table. Les noms sont donnés en anglais pour le code.

## 5.1 Tables

| Table | Colonnes principales | Relations et notes |
|---|---|---|
| profiles | id (= auth user), full_name, phone, language, is_adult_confirmed, status | 1-1 avec le compte d'authentification |
| user_roles | user_id, role (client, partner, courier, zone_agent, admin), scope_id | Un utilisateur peut cumuler des rôles |
| zones | id, name, delivery_fee, min_order, night_surcharge, rain_surcharge, guarantee_enabled | Zones 1 à 3 autour du local |
| neighborhoods | id, name, zone_id, lat, lng | Quartier rattaché à une zone |
| addresses | id, user_id, neighborhood_id, landmark, lat, lng, is_default | Repère obligatoire |
| partners | id, type (restaurant, pharmacy, depot, own_stock), name, phone, neighborhood_id, status, commission_model | Le stock propre est un partenaire interne |
| partner_members | partner_id, user_id | Qui gère quel partenaire |
| partner_hours | partner_id, weekday, opens_at, closes_at, last_order_before_close | Plusieurs plages par jour |
| categories | id, slug, name_fr, name_en, sort | Rayons |
| products | id, partner_id, category_id, name (json fr/en), description, price, is_available, requires_age_check, is_medicine, image_path | Prix entier |
| packs / pack_items | pack_id, name, price, guarantee_eligible, single_stop ; pack_id, product_id, qty | Packs à un seul arrêt |
| orders | id, customer_id, address_id, zone_id, status, subtotal, delivery_fee, surcharges, total, payment_method, handover_code, guarantee_deadline, group_order_id, source (web, voice, group, errand) | Idempotency key unique |
| order_items | id, order_id, product_id, partner_id, name_snapshot, unit_price, qty | Copie du prix à la commande |
| order_status_history | id, order_id, status, changed_by, reason, created_at | Journal des statuts |
| payments | id, order_id, provider, provider_ref, amount, status, idempotency_key, raw_event_id | Jamais de données de carte |
| payment_events | id, provider_event_id (unique), payload, verified, received_at | Anti-rejeu des webhooks |
| refunds | id, order_id, amount, reason, approved_by, status | Plafond selon le rôle |
| couriers | user_id, zone_id, vehicle, is_active, id_verified | Livreurs identifiés |
| deliveries | id, order_id, courier_id, assigned_at, picked_up_at, delivered_at, failure_reason, cash_collected | Une livraison par commande |
| group_orders / group_members | id, organizer_id, deadline, status, link_token ; group_id, user_id, share_amount, paid | Lien à jeton aléatoire |
| voice_requests | id, user_id, transcript, proposal (json), confidence, status, validated_by | Audio supprimé après traitement |
| prescriptions | id, order_id, partner_id, file_path, status, expires_at | Suppression à J+30 ; bucket privé |
| errands | id, order_id, description, estimate, cap, actual_amount, receipt_path, item_photo_path | Plafond par course |
| promo_codes / loyalty_ledger | code, rule, uses ; user_id, points, reason | Fidélité et parrainage |
| notifications | id, user_id, channel, event, status, sent_at | Push, WhatsApp, email |
| support_tickets | id, user_id, order_id, subject, message, status, assigned_to | Réclamations |
| legal_acceptances | user_id, document, version, accepted_at, ip_hash | Preuve de consentement |
| audit_logs | id, actor_id, action, entity, entity_id, before, after, created_at | Actions sensibles |
| settings | key, value | Plafonds, délais, paramètres globaux |

## 5.2 Relations et contraintes essentielles

- orders.customer_id vers profiles ; order_items.order_id vers orders (suppression en cascade interdite, annulation par statut) ; payments.order_id et deliveries.order_id uniques par commande active.
- Contraintes : montants positifs, quantité supérieure à 0, au plus 2 partenaires par commande, statut valide selon la machine à états, un seul paiement réussi par commande.
- Index : orders (customer_id, created_at), orders (status, zone_id), products (partner_id, is_available), partner_hours (partner_id, weekday), payment_events (provider_event_id), order_status_history (order_id).

## 5.3 Sécurité RLS : qui peut faire quoi

| Table | Lecture | Écriture |
|---|---|---|
| profiles | Soi-même ; admin ; agent pour sa zone (champs limités) | Soi-même (hors rôle et statut) ; admin |
| orders, order_items | Client propriétaire ; partenaire concerné (sans téléphone) ; livreur assigné ; agent de la zone ; admin | Client à la création ; changements de statut par fonctions serveur selon le rôle |
| payments, refunds | Client propriétaire (lecture) ; admin et agent selon plafond | Fonctions serveur uniquement |
| products, partners (publics) | Tous, si partenaire actif et ouvert | Partenaire propriétaire ; admin |
| prescriptions | Pharmacie concernée ; admin ; client propriétaire | Client à l'envoi ; pharmacie pour le statut |
| group_orders | Organisateur et membres (leur part) | Organisateur ; membres pour leur part |
| support_tickets | Auteur ; agent de la zone ; admin | Auteur ; agent ; admin |
| audit_logs, settings | Admin | Admin (audit : écriture par serveur uniquement) |

## 5.4 Données sensibles, conservation et sauvegardes

| Donnée | Sensibilité | Règle |
|---|---|---|
| Ordonnances (photos) | Très élevée (santé) | Bucket privé, URL signées courtes, suppression à 30 jours, accès journalisé |
| Enregistrements vocaux | Élevée | Supprimés après traitement ; seul le texte de proposition est conservé |
| Téléphone, adresses | Élevée | Visibles seulement par les rôles nécessaires ; numéro masqué aux partenaires |
| Paiements | Élevée | Références du prestataire seulement, jamais de données de carte |
| Journaux | Moyenne | Sans données personnelles inutiles ; durée de conservation définie |

**Sauvegardes :** sauvegardes automatiques de la base, copie chiffrée régulière hors de la plateforme, restauration testée avant le lancement puis chaque trimestre. Les ordonnances et les vocaux ne sont pas sauvegardés au-delà de leur durée de conservation.

