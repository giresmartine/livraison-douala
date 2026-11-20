# Contrôle de l'état actif dans les politiques RLS

## Décision

Les politiques RLS des données de compte et de transaction vérifient `public.is_active_user()`, qui lit l'état courant du profil pour `auth.uid()` à chaque requête. Les vérifications utilisent donc l'état PostgreSQL, et non une revendication ancienne conservée dans un JWT.

La fonction est `SECURITY DEFINER`, stable, qualifie tous ses objets et restreint son `search_path`. Les fonctions de rôle et de participation (`has_role`, `is_staff`, `is_partner_member`, `can_read_order`) imposent elles aussi un compte actif. Les données publiques déjà prévues pour une lecture publique (catalogue actif, médias approuvés et avis visibles) restent publiques ; les chemins d'accès personnel et les écritures sont réservés aux comptes actifs.

## Conséquences

- Une suspension bloque immédiatement les accès RLS aux profils, adresses, commandes, paiements, livraisons, ordonnances, notifications, et autres données personnelles, même si le JWT n'a pas expiré.
- Le contrôle SQL ne remplace pas `requireRole` dans l'application ; les deux couches restent actives.
- Les tests pgTAP des politiques doivent couvrir les utilisateurs actifs et suspendus.
