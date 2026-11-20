# CSP pour les pages statiques et dynamiques Next.js

## Contexte

Next.js inclut des scripts inline de transport RSC dans le HTML, en plus du script de démarrage du thème. Un hash uniquement écrit à la main ne resterait pas fiable lorsque le rendu change. Un nonce dans le layout partagé rendrait les pages publiques statiques dynamiques.

## Décision

- Les routes publiques pré-rendues (`/fr`, `/en`, `/ecrans`, `/restaurants`, `/pharmacies`) utilisent une CSP avec des hash SHA-256 générés automatiquement à partir de leur HTML par un pré-build. Le build final vérifie que tous les scripts inline correspondent aux hash calculés avant d'accepter sa sortie.
- Les routes dynamiques reçoivent un nonce aléatoire dans le proxy. La CSP est transmise à Next.js pour l'ajouter aux scripts de rendu, puis renvoyée au navigateur. Ces routes n'autorisent pas `unsafe-inline`.
- Le script du thème est un fichier JavaScript local bloquant dans le `<head>` : il s'exécute avant le rendu du contenu, reste autorisé par `script-src 'self'` et n'exige ni nonce global ni hash manuel.
- Les en-têtes communs refusent les objets et les iframes, limitent l'origine de connexion à Supabase configuré, et désactivent la caméra, le micro et les paiements.

## Conséquences

- Le build exécute un pré-build pour calculer les hash, puis un build final. La commande reste `npm run build`; les pages statiques doivent rester classées SSG dans la sortie du build.
- La vérification finale échoue si le HTML du second build diverge des hash du pré-build, plutôt que de publier une CSP incomplète.
- Aucun `unsafe-inline` n'est utilisé par la politique produite pour les routes statiques ni dynamiques.

## Plan de repli

Si le pré-build ne peut plus calculer des hash stables, ne pas introduire de nonce dans le layout statique. La solution de repli autorisée est `script-src 'self' 'unsafe-inline'` seulement sur les pages publiques statiques sans formulaire ni donnée personnelle; la page d'accueil, qui contient le formulaire d'adresse, doit conserver la CSP par hash ou faire l'objet d'une décision produit distincte.
