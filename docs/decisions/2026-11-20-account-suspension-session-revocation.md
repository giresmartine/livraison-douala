# Révocation des sessions lors d'une suspension

## Décision

La suspension est réservée à un administrateur authentifié, actif, et exécutée par un module serveur. L'identifiant de cible doit être un UUID valide et l'administrateur ne peut pas se suspendre lui-même. La clé `SUPABASE_SERVICE_ROLE_KEY` n'est jamais importée par le navigateur. Le module appelle une fonction PostgreSQL `SECURITY DEFINER`, dont l'exécution est limitée au rôle `service_role`; celle-ci verrouille et met à jour le profil, écrit dans `audit_logs` l'acteur, la cible, l'action et les états avant/après, puis supprime toutes les sessions Supabase associées dans `auth.sessions`, dans la même transaction.

## Conséquences

- L'état du compte et la révocation des sessions de rafraîchissement sont appliqués atomiquement.
- Les JWT d'accès déjà émis restent valides jusqu'à leur expiration, comme avec la révocation globale standard de Supabase; les parcours protégés doivent continuer à vérifier le statut `profiles.status`.
- Les migrations doivent être appliquées avant d'activer cette action et le secret de service doit exister uniquement dans l'environnement serveur.
