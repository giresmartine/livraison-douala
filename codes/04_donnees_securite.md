## 5. Base de données

### 5.1 Fichiers
`supabase/migrations/0001_schema.sql` (types, tables, index, déclencheurs de date de mise à jour), `0002_functions.sql` (rôles, ouverture, proximité, tarification, transitions de commande, code de remise, expiration des ordonnances, création de profil, moyenne des avis), `0003_rls.sql` (RLS activée sur toutes les tables et politiques), `supabase/seed.sql` (données de départ). Ordre d'application : 0001, 0002, 0003, seed. La syntaxe a été vérifiée par un analyseur SQL ; l'exécution réelle reste à faire et à documenter.

### 5.2 Règles de conception
- Une seule source de vérité par donnée, pas de colonnes dupliquées. Copie volontaire des noms et prix dans `order_items` pour garder l'historique exact.
- Les écritures sensibles passent par des fonctions ou des routes serveur, jamais par une écriture directe du client : paiements, remboursements, transitions de commande, code de remise, journal d'audit.
- Les montants sont des entiers FCFA. Aucune valeur flottante pour l'argent.
- Les statuts de commande suivent la machine à états de `order_transitions`. Les passages `draft` vers `pending_payment` vers `paid` sont réservés au service après vérification du paiement.
- Types TypeScript générés depuis la base à chaque migration (`supabase gen types`) et commités.
- Chaque requête fréquente est examinée avec son plan d'exécution ; les index du schéma couvrent les parcours principaux ; pas de requêtes en cascade (N+1).
- Sauvegardes quotidiennes (plan payant), copie chiffrée hors plateforme chaque semaine, restauration testée avant le lancement puis chaque trimestre.

### 5.3 Tests de sécurité des données (obligatoires)
Un client ne lit pas la commande, l'adresse, le profil ni le paiement d'un autre client. Un partenaire ne voit que les commandes qui contiennent ses articles et jamais le téléphone du client. Un livreur ne voit que ses courses. Une ordonnance n'est lisible que par son client, la pharmacie concernée et l'administrateur. Un client ne peut ni changer son rôle ni son statut. Un agent ne peut pas dépasser son plafond de remboursement. Un code de remise est bloqué après 5 essais. Aucun accès anonyme aux tables sensibles. Ces tests tournent dans l'intégration continue sur une base vide.

## 6. Sécurité complète

### 6.1 Principe
Défense en profondeur : navigateur, bordure réseau, application, fonctions serveur, base de données. Chaque couche suppose que la précédente peut échouer.

### 6.2 Authentification et sessions
Supabase Auth (email et mot de passe, hachage géré par le service). Confirmation par email obligatoire. Mot de passe minimal 10 caractères avec vérification contre les mots de passe courants. Limitation de tentatives (5 en 15 minutes par compte et par adresse IP) avec anti-robots Cloudflare Turnstile ou hCaptcha après échecs. Message d'erreur identique que le compte existe ou non. Sessions à durée limitée avec renouvellement, révocation immédiate à la suspension, déconnexion sur tous les appareils possible. Vérification du rôle sur chaque route serveur, jamais seulement dans l'interface.

### 6.3 Les cinq failles de connexion (audit obligatoire avant de terminer l'authentification)
Tentatives illimitées, messages d'erreur trop explicites, vérification uniquement dans le navigateur, mots de passe lisibles, sessions sans expiration. Chaque point a un test automatisé.

### 6.4 En-têtes et navigateur
Politique de sécurité du contenu stricte avec nonce par requête, sans `unsafe-inline` ni `unsafe-eval` ; HSTS avec préchargement ; `X-Content-Type-Options: nosniff` ; `Referrer-Policy: strict-origin-when-cross-origin` ; `Permissions-Policy` n'autorisant que géolocalisation, microphone et caméra pour notre origine ; cadres interdits (`frame-ancestors 'none'`) ; cookies `HttpOnly`, `Secure`, `SameSite=Lax` ; CORS limité à notre domaine ; aucune clé secrète dans le paquet envoyé au navigateur (contrôle automatique à la compilation).

### 6.5 Entrées et injections
Validation de toute entrée avec Zod côté serveur (le client n'est qu'un confort). Requêtes uniquement paramétrées ou par fonctions de base ; jamais de SQL construit par concaténation. Échappement par défaut du rendu ; tout texte riche éventuel passe par un assainisseur. Aucun appel serveur vers une adresse fournie par l'utilisateur (pas de requête sortante pilotée par l'utilisateur). Protection contre l'attribution de masse : les champs modifiables sont listés explicitement.

### 6.6 Limitation de débit (par IP et par compte)
Connexion et inscription : 5 par 15 minutes. Recherche : 60 par minute. Création de panier et d'adresse : 30 par minute. Placement de commande : 20 par heure. Envoi de vocal : 10 par heure. Envoi d'ordonnance : 10 par heure. Demande de code promo : 10 par minute. Réponse 429 avec en-tête de délai. Stockage des compteurs dans un service à faible latence situé en Europe (mesurer la latence depuis Douala).

### 6.7 Paiements
Un agrégateur Mobile Money agréé, choisi après évaluation. Montants recalculés serveur. Webhooks : signature vérifiée, horodatage et identifiant d'événement uniques stockés (`payment_events`) pour interdire le rejeu, traitement idempotent. Clé d'idempotence par tentative de paiement et par commande. Le statut `paid` n'est posé qu'après confirmation de l'agrégateur. Rapprochement quotidien automatique entre paiements et commandes. Cash : plafond et ancienneté du client, reversement du livreur suivi.

### 6.8 Fichiers et données sensibles
Ordonnances : espace privé chiffré au repos, URL signées de 60 secondes, accès journalisé, suppression automatique à 30 jours par tâche planifiée appelant `expire_prescriptions` puis suppression des fichiers par l'API de stockage. Vocaux : supprimés après traitement. Photos : types vérifiés, métadonnées supprimées. Téléphone du client masqué aux partenaires. Journaux sans données personnelles inutiles.

### 6.9 Chaîne d'approvisionnement
Fichier de verrouillage commité, versions épinglées, mise à jour automatique des dépendances par petites demandes de fusion, analyse des vulnérabilités à chaque intégration, aucune dépendance sans maintenance récente, interdiction des scripts d'installation inconnus, scripts tiers uniquement depuis des hôtes autorisés par la politique de contenu, aucune bibliothèque chargée depuis un réseau de diffusion non maîtrisé.

### 6.10 Secrets
Variables d'environnement par environnement (développement, test, production). Fichier `.env.example` sans valeur. `.env` ignoré par Git. Analyse de secrets avant chaque commit (gitleaks) et dans l'intégration continue. Rotation documentée des clés (base, agrégateur, messagerie, intelligence artificielle, cartes) et procédure en cas de fuite : révoquer, remplacer, purger l'historique si nécessaire, journaliser.

### 6.11 Journalisation, détection, incident
Journal d'audit pour toute action sensible (rôle, remboursement, transition, modification de zone ou de prix, accès aux ordonnances). Alertes sur pics d'erreurs, échecs de connexion, webhooks rejetés, 429 massifs. Procédure d'incident écrite : confinement, analyse, correction, information des personnes et de l'autorité dans les délais légaux (à confirmer avec le juriste), retour d'expérience.

### 6.12 Protection des données (Cameroun)
La loi camerounaise de décembre 2024 sur la protection des données personnelles est entrée en vigueur le 23 juin 2026 : consentement explicite, transparence, sécurité, et autorisation de l'autorité pour les transferts vers l'étranger. Notre base est en Europe : démarche à faire avant le lancement, avec avis d'un juriste spécialisé. Minimisation des données, durées de conservation écrites, registre des traitements, droits d'accès, de rectification et d'effacement traités par un parcours dédié, consentement cookies avec catégories (nécessaires, mesure d'audience facultative). Ces points ne constituent pas un avis juridique.
