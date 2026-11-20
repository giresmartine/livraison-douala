# Protection CAPTCHA pour Supabase Auth

## Décision

- Utiliser Turnstile avec la protection CAPTCHA native de Supabase Auth.
- Le navigateur charge le widget avec `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; le jeton est transmis aux actions serveur et aux méthodes Supabase Auth de connexion, inscription et récupération de mot de passe.
- Le secret n'est jamais lu par l'application Next.js. Pour Supabase local seulement, `supabase/config.toml` utilise la clé secrète de test officielle Cloudflare, qui accepte uniquement les jetons factices.
- Le rate limit local est explicite : 10 inscriptions/connexions par adresse IP sur cinq minutes, 3 emails par heure et 10 vérifications de jeton sur cinq minutes.

## Conséquences

- Une action ne contacte pas Supabase sans jeton CAPTCHA; les réponses d'échec restent génériques.
- Le widget est bloqué si la clé publique manque ou si le script ne se charge pas.
- La CSP n'autorise `challenges.cloudflare.com` que sur les routes dynamiques lorsque la clé publique Turnstile est configurée.

## Configuration du vrai projet

Les clés de test ne doivent pas être déployées. Sur le vrai projet, créer un widget Turnstile avec les domaines de production, configurer sa clé publique comme `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, puis activer CAPTCHA dans Supabase Auth avec le fournisseur Turnstile et y saisir le vrai secret. Ne jamais mettre ce secret dans `.env.example`, dans le dépôt ou dans les variables publiques Next.js. Régler aussi les limites de débit du projet Supabase de production.
