## 3. Images des enseignes, fiches produits et catalogue

### 3.1 Principes
Les 60 enseignes du fichier de départ sont des prospects tirés de Google Maps. Aucune photo n'a été importée et aucune ne doit être copiée depuis une carte en ligne, un réseau social ou une application concurrente. Les images viennent de trois sources seulement : fournies par l'enseigne avec accord écrit (un message WhatsApp conservé suffit), prises par notre équipe lors d'une séance, ou libres de droits avec licence archivée. Aucune image générée par IA ne représente un plat réel d'une enseigne réelle. Chaque image a un champ `rights_confirmed`, un auteur, une date et un statut de modération.

### 3.2 Formats et variantes
| Type | Ratio | Original minimal | Variantes générées (largeur) |
|---|---|---|---|
| Logo | 1:1 | 512 × 512 | 64, 128, 256 |
| Bannière d'enseigne | 16:9 | 1600 × 900 | 480, 800, 1200, 1600 |
| Article | 4:3 | 1200 × 900 | 240, 480, 720, 1080 |
| Pack | 4:3 | 1200 × 900 | 240, 480, 720, 1080 |
| Bannière d'offre | 5:2 | 1600 × 640 | 800, 1200, 1600 |
Formats de sortie : AVIF puis WebP, avec repli JPEG. Poids cibles : vignette d'article sous 25 Ko, bannière sous 120 Ko. Un bloc flou (blurhash) de 20 à 30 caractères est stocké avec chaque image et affiché pendant le chargement.

### 3.3 Chaîne de traitement
1. Téléversement depuis le navigateur par URL signée vers un espace privé `media-incoming` (taille maximale 8 Mo, types image/jpeg, image/png, image/webp).
2. Traitement serveur dans un gestionnaire de routes d'exécution Node : vérification du vrai type par les premiers octets (pas l'extension), suppression des métadonnées EXIF dont la position GPS, correction d'orientation, recadrage au ratio, génération des variantes avec la bibliothèque `sharp`, calcul du blurhash.
3. Écriture des variantes dans l'espace public `media-public` avec nom haché immuable `partners/{slug}/{type}-{hash}-{largeur}.{ext}` et en-tête de cache d'un an `immutable`.
4. Création de la ligne `media` en statut `pending`. Un agent approuve (S-63). Seules les images `approved` sont servies.
5. Mise à jour de `partners.logo_path`, `cover_path` ou `products.image_path` et revalidation ciblée de la page de l'enseigne.
6. Suppression des anciennes variantes après remplacement, et des originaux privés après 30 jours.

### 3.4 Affichage
Composant unique `MediaImage` : balise `picture` avec `srcset` et attribut `sizes` exact par contexte, bloc flou de départ, chargement différé sauf l'image principale de l'écran (priorité haute et préchargement), dimensions réservées pour éviter les décalages. Sans image : bloc teinté avec l'icône de la catégorie (jamais d'image d'un autre plat). Budget : moins de 400 Ko d'images pour le premier écran d'une liste.

### 3.5 Fiche produit standard (contenu)
- Nom : 60 caractères maximum, sans majuscules intégrales dans la base (la mise en majuscules est un style d'affichage).
- Description : 140 caractères maximum, ingrédients principaux, piment ou cuisson si pertinent.
- Prix : entier en FCFA. Ancien prix facultatif pour afficher une offre.
- Photo 4:3 avec texte alternatif en français et en anglais.
- Groupes d'options : obligatoires ou non, choix unique ou multiple, prix en plus (piment supplémentaire, plantains, sauce à part, taille).
- Indicateurs : populaire, disponible, contrôle d'âge (alcool), médicament (interdit à la vente directe).
- Temps de préparation propre à l'article si différent de celui de l'enseigne.

### 3.6 Import du catalogue par enseigne
Fichier CSV, séparateur point-virgule, encodage UTF-8, une ligne par article ou par option. Colonnes : `partner_slug; section_fr; section_en; product_slug; name_fr; name_en; description_fr; description_en; price_fcfa; compare_at_price_fcfa; available; popular; age_check; prep_minutes; option_group_fr; option_group_en; option_min; option_max; option_name_fr; option_name_en; option_price_delta; image_filename`.
Validation avant écriture (mode essai à blanc) : enseigne connue, prix entier positif, longueurs respectées, doublons de `product_slug`, groupes d'options cohérents (max supérieur ou égal à min), image présente dans le lot, médicament refusé en vente directe. Rapport téléchargeable des erreurs ligne par ligne. L'import crée les articles en `is_placeholder = true` jusqu'à validation humaine.

### 3.7 Séance photo et collecte
Priorité aux 10 premières enseignes, 8 articles chacun (80 photos), puis extension. Consignes : lumière du jour près d'une fenêtre, fond uni, plat propre, angle de 45 degrés pour les plats creux, vue du dessus pour les assiettes plates, format paysage, trois prises par plat. Chaque enseigne signe ou confirme par message : « J'autorise l'usage des photos de mon établissement et de mes plats sur la plateforme ». L'équipe conserve ce message dans la fiche enseigne.

### 3.8 Données de départ
`supabase/seed.sql` crée 3 zones, les quartiers repérés, 6 catégories et 60 enseignes en statut `prospect` avec `is_placeholder = true` et la source. Une enseigne ne devient `active` qu'après accord, horaires confirmés, position sur la carte, rayon de livraison et au moins 5 articles validés.

## 4. Cartes, adresses et suivi

### 4.1 Cartes
MapLibre GL JS (licence BSD), chargé uniquement sur les écrans qui en ont besoin par import dynamique (jamais sur l'accueil). Fond de carte : fichier de tuiles vectorielles Protomaps (PMTiles) extrait pour le Cameroun et hébergé sur le CDN, ce qui évite un coût par requête et ne dépend pas d'un service tiers ; alternative : fournisseur de tuiles avec clé restreinte au domaine. Les serveurs de tuiles publics d'OpenStreetMap ne doivent pas être utilisés en production à cause de leur politique d'usage. Attribution OpenStreetMap visible sur chaque carte.

### 4.2 Adresses et zones
Une adresse = quartier + repère écrit + position GPS + complément. Le quartier et la zone sont déterminés par point-dans-polygone avec PostGIS à partir des polygones de zone dessinés dans l'administration (S-64) et importables en GeoJSON. Aucun appel à un service externe de géocodage inverse. La recherche d'adresse en saisie libre est une amélioration ultérieure (Photon ou équivalent, décision à valider).

### 4.3 Proximité des enseignes
Fonction `partners_near(lat, lng, type, limit)` : filtre par rayon de livraison propre à l'enseigne avec index géographique, ouvertes d'abord, puis distance. Le résultat est mis en cache 60 s par cellule de position arrondie (environ 100 m) et par type. Le délai affiché = temps de préparation moyen de l'enseigne + temps de trajet estimé par la distance (vitesse moyenne moto en ville configurable dans `settings`).

### 4.4 Suivi en temps réel
Pendant une course seulement, l'application du livreur envoie sa position toutes les 5 à 10 s par diffusion temps réel (pas d'écriture en base à chaque envoi) ; la base reçoit une position toutes les 30 s. Le client abonné à sa commande reçoit les positions, les interpole pour fluidifier et masque la position quand la course est terminée. La position du livreur n'est conservée que 7 jours. Consentement explicite du livreur et information claire.

### 4.5 Repli et économie de données
Si la carte échoue, afficher l'adresse et le quartier en texte avec bouton d'ouverture dans l'application de cartes du téléphone. Les écrans de liste n'affichent aucune carte. Les cartes statiques (informations d'enseigne) sont des images pré-générées mises en cache.
