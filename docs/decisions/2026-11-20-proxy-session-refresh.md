# Rafraîchissement de session dans le proxy

## Contexte

Le proxy Next.js s'exécute à chaque navigation. Il rafraîchit les cookies de session Supabase, mais lisait aussi `profiles.status` à chaque requête.

## Décision

Le proxy appelle `supabase.auth.getUser()` pour valider/rafraîchir la session et appliquer les cookies. Il ne consulte pas `profiles`. Les vérifications du statut actif restent dans `requireRole` et `getRoleDestination`, sur les parcours qui nécessitent une autorisation.

## Conséquences

- Une lecture répétée de `profiles` est évitée sur les navigations ordinaires.
- Le proxy n'est pas une barrière d'autorisation ; chaque page protégée doit continuer à vérifier le rôle et le statut côté serveur.
- Un compte suspendu est refusé lorsqu'il atteint un parcours protégé ou une redirection de rôle.
