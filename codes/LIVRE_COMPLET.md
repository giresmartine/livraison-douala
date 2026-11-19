# LIVRE DE CONCEPTION — Plateforme de livraison jour et nuit à Douala

Version 2 — 10 novembre 2026. Nom de marque : à définir (partout, utiliser la constante `BRAND_NAME` lue dans une variable d'environnement publique et dans `settings`).

## 0. Comment lire et appliquer ce livre

### 0.1 Ton rôle
Tu es l'équipe d'ingénierie complète du projet : architecte logiciel senior, développeur full-stack, spécialiste sécurité, designer d'interface, ingénieur performance et ingénieur DevOps. Tu construis un produit commercial, pas une démonstration. Tu travailles avec une seule personne, le fondateur, qui valide chaque étape.

### 0.2 Hiérarchie des documents
1. Ce livre (parties 0 à 10) a priorité absolue.
2. Les annexes (PRD, TRD, App Flow, UX/UI Brief, Backend Schema, Implementation Plan, Décisions, Conformité) complètent ce livre. En cas de contradiction, ce livre l'emporte et tu le signales.
3. Les fichiers SQL de `supabase/migrations` et `supabase/seed.sql` sont la source de vérité du schéma. Ils ont été vérifiés syntaxiquement mais pas exécutés : tu les exécutes sur une base vide, tu corriges ce qui échoue, et tu documentes chaque correction.
4. `design/tokens.css` est la source de vérité des couleurs, polices et espacements.

### 0.3 Modèle de référence
Le fondateur a fourni douze captures d'écran d'une application de livraison grand public comme modèle de parcours. Tu reprends la structure et les gestes (adresse d'abord, accueil à onglets, page enseigne avec bannière, informations, avis, fiche article avec extras, paniers, commande avec suggestions, options de livraison, pourboire, récapitulatif, paiement). Tu ne reprends en aucun cas ses logos, noms, couleurs, illustrations, photos, polices ni textes. Toute l'identité est la nôtre.

### 0.4 Règles absolues
1. Tu lis la partie concernée du livre avant d'écrire du code, tu résumes ce que tu vas faire, et pour toute décision structurante tu attends la validation.
2. Tu travailles un écran à la fois, dans l'ordre de la partie 10. Tu ne modifies pas un écran validé sans demande explicite.
3. Aucun secret dans le code, le dépôt, l'historique Git ou le navigateur. Clés privées côté serveur uniquement.
4. Les droits sont appliqués par la base (RLS) et par des fonctions serveur. Une vérification côté navigateur ne protège rien.
5. Les montants, les frais, les remises et les totaux sont toujours recalculés côté serveur à partir de la base. Le total envoyé par le client est ignoré.
6. Aucune donnée de carte bancaire n'est stockée. Aucun paiement n'est simulé en production. En test, l'environnement de test du prestataire est clairement identifié.
7. Tu ne dis jamais qu'une fonction est terminée si elle n'a pas été testée. Tu ne remplaces jamais une intégration réelle par des données fictives sans le signaler en tête de ta réponse.
8. Aucune commande destructive sur la production. Les migrations sont versionnées et compatibles avec la version précédente du code.
9. Aucune dépendance sans justification (utilité, licence, maintenance, poids). Versions épinglées par le fichier de verrouillage.
10. Aucune photo, aucun logo, aucun texte pris ailleurs sans droit. Les enseignes du fichier de départ sont des prospects, pas des partenaires.
11. Tu n'inventes pas de menus, de prix ni d'avis réels pour une enseigne réelle. Tout contenu d'exemple est marqué `is_placeholder = true` et affiché comme tel dans l'administration, jamais comme un fait en production.
12. Quand une information manque, tu poses la question. Tu ne supposes pas.

### 0.5 Format de chaque réponse de travail
À la fin de chaque tâche : ce qui a été fait, fichiers créés ou modifiés, comment tester, tests exécutés avec résultats, risques restants, prochaine étape proposée. Puis tu t'arrêtes.

### 0.6 Vocabulaire
Enseigne = restaurant, pharmacie, dépôt ou magasin partenaire. Panier = commande en préparation chez une enseigne. Repère = description écrite de l'endroit (carrefour, boutique connue). Garantie 30 min = engagement de délai sur certains packs dans les zones cœur. Code de remise = code à 4 chiffres que le client donne au livreur.

---

## 1. Identité visuelle, typographie et charte de qualité professionnelle

### 1.1 Intention
Une marque locale, chaleureuse et fiable, qui se lit vite sur un téléphone modeste en plein soleil comme à minuit. Le bleu clair vif porte la confiance et la rapidité. Une typographie à empattements donne du caractère et de la chaleur aux titres, une sans empattement très lisible porte l'interface. Rien ne doit ressembler à un gabarit générique.

### 1.2 Couleurs (voir `design/tokens.css`)
| Rôle | Jour | Nuit |
|---|---|---|
| Fond | #F2F9FF | #0A1628 |
| Surface | #FFFFFF | #12233B |
| Surface 2 | #E9F3FC | #16314F |
| Texte | #0B2540 | #EAF4FF |
| Texte secondaire | #5B7894 | #8FB0CC |
| Bordure | #D3E5F4 | #1F3752 |
| Primaire | #0B84E0 (texte blanc) | #2FB0FF (texte #04213A) |
| Primaire doux | #DDF1FF / texte #0A4F8A | #16314F / texte #9AD8FF |
| Succès | #1F6B4A sur #E3F4EA | #8FE0B5 sur #123326 |
| Alerte | #6B4A00 sur #FFF1CC | #FFD98A sur #3A2F10 |
| Erreur | #9A3A2A sur #FFE6E0 | #FFB4A4 sur #3A1A14 |
| Offre / prix barré | #C5341F | #FF8A73 |
Règles : contraste AA minimum partout (vérifier chaque paire avec un test automatisé), jamais de couleur seule pour porter un sens (ajouter icône ou texte). Le thème bascule automatiquement : sombre de 18h30 à 05h30 heure de Douala, clair sinon, avec un choix manuel dans le compte (Auto, Clair, Sombre). Pas de dégradés décoratifs, pas d'ombres portées lourdes : la hiérarchie vient des bordures fines, des fonds et de l'espace.

### 1.3 Typographie
- **Titres et noms d'enseigne : Fraunces (variable, licence OFL).** Graisses 500 à 700, axe optique automatique. Utilisée pour H1, H2, H3, noms d'enseigne, grands chiffres (chrono, code de remise).
- **Texte et interface : Inter (variable, licence OFL).** Graisses 400, 500, 600. Chiffres tabulaires pour tous les prix et horaires (`font-variant-numeric: tabular-nums`).
- Repli : Georgia pour le serif, polices système pour le sans.
- Auto-hébergement obligatoire (aucune requête vers un service de polices tiers). Sous-ensemble latin + latin étendu (accents français), format WOFF2, `font-display: swap`, préchargement des deux fichiers principaux seulement. Budget total des polices : 120 Ko.
- Échelle (rem, base 16 px) : 0,75 / 0,875 / 1 / 1,125 / 1,25 / 1,5 / 1,875 / 2,5. Interligne 1,15 pour les titres, 1,5 pour le texte. Étiquettes en majuscules : 0,75 rem, espacement de lettres 0,06 em.
- Prix : toujours « 4 500 FCFA » avec espace insécable fine entre milliers et avant FCFA. Une fonction unique `formatFcfa` partout.
- Aucun texte sous 12 px, sauf pastilles à 11 px minimum. Le texte doit rester lisible à 200 % de zoom système.

### 1.4 Forme, espace, mouvement
- Espacement sur grille de 4 px (4, 8, 12, 16, 24, 32, 48). Marges d'écran 16 px sur mobile.
- Rayons : 8 (champs, vignettes), 14 (cartes), 20 (feuilles basses), pastille 999.
- Bordure 1 px. Focus visible : anneau 2 px décalé. Cibles tactiles 44 px minimum.
- Mouvement : 150 à 250 ms, courbe `cubic-bezier(0.2, 0, 0, 1)`. Apparition d'écran par fondu et léger glissement ; feuilles basses qui montent ; squelettes de chargement sans balayage lumineux agressif ; respect de `prefers-reduced-motion`.
- Icônes : jeu unique, contour 1,75 px, 20 ou 24 px (Tabler Icons, licence MIT, importées une par une). Aucun emoji dans l'interface.

### 1.5 Images
Photos naturelles, lumière du jour, fond neutre, plats locaux reconnaissables. Logos en carré 512 px. Bannières en 16:9. Articles en 4:3. Quand une photo n'existe pas : bloc teinté avec l'icône de la catégorie, jamais une image d'un autre plat. Voir la partie 3.

### 1.6 Composants (chacun avec états repos, survol, pression, focus, désactivé, chargement, erreur)
Bouton principal, secondaire, texte ; bouton icône carré à contour (barre d'application) ; champ de saisie, zone de texte, sélecteur, case, interrupteur, curseur de quantité (moins, nombre, plus) ; pastille de filtre, onglet souligné, onglet pastille ; carte enseigne (bannière, pastille de délai chevauchante, logo, nom, note, frais, offres) ; ligne article (nom, description, prix, vignette, bouton plus rond) ; carte populaire (carrousel horizontal) ; feuille basse ; barre de panier collante ; ligne d'information avec chevron ; bloc carte (map) ; liste de statuts ; anneau de compte à rebours ; badge (ouvert, garanti, populaire, en attente, payé) ; barre de répartition des avis ; étiquette d'avis ; toast ; modale de confirmation ; squelettes ; états vides illustrés par icône et phrase utile ; page d'erreur.
Chaque composant vit dans `components/ui` avec une API courte, ses variantes typées et un test. Les composants du générateur d'interface par défaut doivent être entièrement restylés : aucun composant ne doit garder son apparence d'origine.

### 1.7 Voix éditoriale
Tutoiement, phrases courtes, concrètes, sans jargon. Exemples : « Où veux-tu être livré ? », « Ouvert jusqu'à minuit », « Dernière commande à 23 h 30 », « Pas encore d'enseigne ici ». Pas de formules génériques d'application (« Bienvenue dans votre expérience »). Toutes les chaînes sont dans `messages/fr.json` et `messages/en.json` ; aucune chaîne en dur dans les composants.

### 1.8 Responsive
Mobile d'abord (360 px). À partir de 768 px : deux colonnes pour les listes. À partir de 1024 px : grille 12 colonnes, page enseigne avec panier collant à droite, liste d'enseignes en trois colonnes, administration en tableaux denses. Largeur maximale du contenu 1200 px.

### 1.9 Charte « aucune trace de génération automatique »
Le produit livré doit être indiscernable du travail d'une équipe expérimentée. Concrètement :
- Interface : aucun composant à l'apparence par défaut, aucune grille de trois cartes identiques répétée, aucun dégradé violet ou bleu décoratif, aucune bannière « héros » générique, aucun texte d'exemple (« Lorem », « Acme », « John Doe », « Welcome »), aucun emoji décoratif, aucune illustration générique en bibliothèque. Les icônes ont toutes la même épaisseur et la même taille par contexte.
- Cohérence : les mêmes espacements, rayons et typographies partout, sans valeur magique : tout passe par les jetons.
- Finitions : favicon, icônes d'installation (192, 512, masquable), image de partage, manifeste, page 404 et 500 dessinées, page hors-ligne dessinée, états vides et d'erreur sur chaque liste, titres de page et descriptions soignés, langue du document correcte, métadonnées de partage par enseigne.
- Code : nom de paquet, auteur, licence et description renseignés ; aucune chaîne « Create Next App » ou équivalent ; aucun commentaire qui raconte ce que fait le code ligne à ligne ; aucun `TODO` sans ticket ; aucun `console.log` ; aucun fichier mort ; aucune mention d'outil ou d'assistant dans le code, les commentaires, les messages de commit, la documentation publique ou les métadonnées ; pas de signature de co-auteur.
- Livraison : en-tête `X-Powered-By` supprimé, cartes de sources non publiées (envoyées seulement à l'outil de suivi d'erreurs), aucune bibliothèque de développement dans le paquet de production, noms de fichiers et de variables en anglais cohérent avec le domaine (`partner`, `order`, `courier`), les fichiers d'instructions de l'assistant de codage restent hors du dépôt (ajoutés à `.git/info/exclude`) et aucun dossier d'assistant n'est déployé.
- Contenu : les textes sont rédigés pour le public de Douala ; toute tournure traduite mot à mot est corrigée ; les deux langues sont relues.

---

## 2. Parcours et spécification écran par écran

### 2.1 Règles communes à tous les écrans
- Chaque écran a un identifiant `S-xx`, une route, des données, des blocs du haut vers le bas, des interactions, des états et des critères d'acceptation. Un fichier `docs/screens/S-xx.md` reprend cette fiche et reste à jour.
- États obligatoires sur chaque écran : chargement (squelettes de la même forme que le contenu), vide (phrase utile + action), erreur réseau (bandeau + réessayer + conservation de la saisie), hors ligne (dernier contenu en cache + indicateur), non autorisé (redirection selon le rôle).
- Barre d'application des écrans client : logo ou adresse de livraison avec flèche, boutons carrés à contour pour recherche, notifications, panier (pastille rouge s'il n'est pas vide) et compte.
- Pas de navigation inférieure sur le site : onglets en haut, comme les grandes applications web de livraison. Sur l'installation PWA, même structure.
- Le panier est unique par enseigne ; ajouter un article d'une autre enseigne propose de vider ou de garder les deux paniers (liste des paniers, S-13).
- Chaque liste d'enseignes affiche toujours : nom, spécialité, heure de fermeture, délai estimé, frais de livraison de la zone, note si disponible.
- Toute action sensible (annuler, rembourser, supprimer) demande une confirmation.

### 2.2 Parcours client

**S-01 · Où veux-tu être livré ?** · `/` sans adresse · Écran d'entrée.
Blocs : logo, sélecteur FR/EN ; titre « Où veux-tu être livré ? » (Fraunces 2 rem) ; phrase d'aide ; champ « Quartier, repère, rue… » ; bouton « Utiliser ma position » ; puces des quartiers fréquents ; adresses récentes ; bouton « Voir les enseignes ».
Logique : géolocalisation navigateur avec explication avant la demande d'autorisation ; sans autorisation, choix par quartier. Le point est converti en quartier et zone par `delivery_quote`. L'adresse est stockée localement (invité) puis dans `addresses` après connexion.
Critères : aucun contenu d'enseigne n'est affiché avant une adresse ; le refus de géolocalisation ne bloque rien.

**S-02 · Confirmer l'adresse** · `/adresse/confirmer` · Carte (MapLibre chargée à la demande) avec repère déplaçable, champ « Repère » obligatoire, champ « Complément », case « Enregistrer comme adresse principale », bouton « Confirmer l'adresse ». Précision affichée. Le repère est obligatoire car peu d'adresses ont un nom de rue.

**S-03 · Aucune enseigne dans la zone** · `/` · Icône de repère barré, phrase « Pas encore d'enseigne ici », explication, bouton WhatsApp « Préviens-moi quand ça ouvre » (enregistre le quartier), liste de quartiers voisins avec le nombre d'enseignes ouvertes.

**S-04 · Accueil** · `/` · Données : `partners_near`, `promotions`, `packs`, pharmacies de garde.
Blocs : barre d'application avec « Livraison · Maintenant » et le quartier avec flèche ; recherche arrondie « Restaurants, pharmacies, plats » ; onglets (Accueil, Courses, Restaurants, Pharmacies, Offres) ; rayons ronds teintés (Repas, Boissons, Pharmacie, Courses, Offres) ; pastilles de filtre (Offres, Ouvert la nuit, Garanti 30 min, Mobile Money) ; bannière d'offre ; « À la une » ; « Ouverts maintenant près de toi » ; « Pharmacies de garde ce soir » ; blocs Commande vocale, Commande de groupe, Courses à la demande.
États : aucune enseigne ouverte → proposer pharmacies de garde et commande vocale. Critères : LCP sous 2,5 s sur 4G moyenne ; filtre appliqué en moins de 300 ms ; l'adresse reste mémorisée.

**S-05 · Restaurants** · `/restaurants` · Liste de cartes enseigne en défilement continu paginé (20 par page), filtres (Ouvert maintenant, Livraison rapide, Offres, Cuisine), tri (Pertinence, Distance, Délai, Note). Mise en cache serveur 60 s par zone.

**S-06 · Pharmacies** · `/pharmacies` · Même structure ; badge « De garde ce soir » uniquement si le calendrier officiel est renseigné en base, sinon « Ouverte jusqu'à X ». Mention fixe : « Les médicaments sont délivrés par la pharmacie selon la réglementation en vigueur. »

**S-07 · Recherche** · `/recherche?q=` · Recherche instantanée avec délai de 300 ms sur enseignes, plats et rayons ; recherche approximative (trigrammes) tolérante aux fautes ; suggestions récentes ; résultats groupés (Enseignes, Plats). Un résultat de plat ouvre directement la fiche article.

**S-08 · Page enseigne (restaurant)** · `/e/[slug]` · Données : enseigne, sections, articles populaires, note.
Blocs : barre d'application ; bannière 16:9 avec retour, cœur favori et bouton « Démarrer une commande groupée » en bas ; nom en Fraunces majuscules ; ligne « 20 - 30 min · cuisine · cuisine » ; ligne « À 2,1 km · Ferme à minuit » ; ligne d'offre (« Frais de livraison offerts dès 10 000 FCFA ») ; ligne « Informations » ; ligne « 4,6 Très bien · Voir les 120 avis » ; ligne « Livrée dans 20 - 30 min · Modifier » ; onglets de sections collants ; « Populaires » en carrousel ; sections avec lignes article (nom en majuscules, description tronquée à deux lignes, prix, vignette à droite avec bouton plus rond) ; barre de panier collante « Voir le panier · n · total ».
Desktop : panier collant à droite. Critères : l'heure de fermeture et la dernière commande sont visibles sans défiler ; un enseigne fermée est consultable mais non commandable avec message « Ouvre à 12 h » ; ISR 60 s avec revalidation à la modification du catalogue.

**S-09 · Page enseigne (pharmacie)** · `/e/[slug]` · Même structure avec : badge de garde, rayons non médicaux (Première nécessité, Hygiène, Bébé), tuile « Mon ordonnance » qui ouvre S-25. Aucun médicament n'est vendu en direct par la plateforme ; seuls les produits marqués `is_medicine = false` sont ajoutables au panier.

**S-10 · Informations** · feuille plein écran · « À propos de », catégories, « Infos plats » (ingrédients, piment, cuisson : contacter l'enseigne via la plateforme), « Lieu » avec carte statique et adresse, horaires par jour avec dernière commande, moyens de paiement acceptés.

**S-11 · Avis** · feuille plein écran · Note moyenne en grand (Fraunces), étoiles, nombre d'avis, barres de répartition de 5 à 1, tri, avis (avatar neutre, étoiles, date relative, texte, étiquettes « Rapide », « Bien chaud », « Bien emballé », « Bon rapport qualité-prix », « Portions généreuses », bouton « Cet avis est-il utile ? »), bouton collant « Retour au menu ». Un avis n'existe qu'après une commande livrée.

**S-12 · Fiche article** · feuille plein écran · Grande photo 4:3 avec cœur et fermeture ; nom ; texte d'offre en rouge ; description ; encadré « Une question sur les ingrédients ou le piment ? Contacte l'enseigne » ; groupes d'options (choix unique ou multiple, obligatoire ou non, prix en plus avec bouton rond) ; curseur de quantité ; bouton « Ajouter pour X FCFA » avec ancien prix barré si offre. Validation des groupes obligatoires avant ajout.

**S-13 · Paniers** · feuille · Une carte par enseigne : nom, corbeille, vignette avec pastille de quantité, total (avec ancien prix barré), nombre d'articles, délai, boutons « Ajouter des articles » et « Afficher le panier ».

**S-14 · Votre commande** · `/panier/[partner]` · En-tête avec fermeture et corbeille ; « Panier » avec lignes et curseur de quantité ; « Envie d'ajouter autre chose ? » en carrousel de suggestions (articles populaires non présents) ; bandeau « Encore X FCFA pour la livraison offerte » ; « Total de la commande » ; bouton « Finaliser la commande ». Minimum de commande de la zone vérifié ici avec message clair.

**S-15 · Options de livraison et adresse** · `/commande/livraison` · « Options de livraison » (Prioritaire avec supplément, Standard avec délai, Programmée avec sélecteur d'heure) ; « Adresse de livraison » avec carte, quartier, repère, bouton Modifier ; champ « Instructions pour le livreur » ; barre « Tu économises un total de X » ; bouton « Continuer ».

**S-16 · Économies, pourboire et don** · `/commande/offres` · Carte d'économies ; « Afficher les offres ou saisir un code » (validation serveur, messages précis : expiré, minimum non atteint, déjà utilisé) ; pourboire (200, 300, 500, 1 000, autre) reversé en totalité au livreur ; don optionnel à une association (désactivé en V1, masqué par un drapeau `settings`).

**S-17 · Récapitulatif** · `/commande/recapitulatif` · Lignes détaillées, sous-total, montant économisé, frais de livraison par zone, supplément nuit ou pluie, frais de service si activés, pourboire, total en gras ; encadré « Code de remise » expliqué ; bouton « Passer au paiement » désactivé tant que les conditions ne sont pas remplies. Le prix affiché vient du serveur.

**S-18 · Paiement** · `/commande/paiement` · Options : MTN Mobile Money, Orange Money, cash à la livraison (réservé aux clients ayant au moins 3 commandes réussies, avec plafond), carte (affichée « Bientôt disponible » en V1). Case CGV et confidentialité obligatoire (version enregistrée dans `legal_acceptances`). Mobile Money : demande de paiement chez l'agrégateur, écran d'attente avec chronomètre, interrogation de l'état toutes les 3 secondes avec repli sur le webhook, délai maximal 5 minutes, possibilité de changer de moyen.

**S-19 · Confirmation** · `/commande/[id]/confirmation` · Coche, « Commande confirmée », code de remise en grand (Fraunces, espacé), arrivée estimée, badge « Garanti 30 min » si éligible, bouton « Suivre ma commande », rappel que le reçu est envoyé par email.

**S-20 · Suivi** · `/commande/[id]` · Carte avec position du livreur (temps réel seulement pendant la course), compte à rebours (anneau) et badge garantie, liste de statuts (Confirmée, En préparation, Livreur en route, Livrée), carte livreur (prénom, véhicule, boutons Appeler et WhatsApp), code de remise rappelé, bouton d'aide. Mise à jour en temps réel avec repli sur interrogation toutes les 15 s.

**S-21 · Commande vocale** · `/vocal` · Grand bouton micro, consentement d'enregistrement, indicateur de niveau, annulation, durée maximale 30 s ; ensuite « Ce que j'ai compris » (transcription modifiable) et « Ma proposition » (articles reconnus avec prix, éléments incertains marqués « À valider ») ; mention « Un agent relit ta commande avant confirmation » ; boutons Corriger et Valider. Audio supprimé après traitement.

**S-22 · Commande de groupe (organisateur)** · `/groupe/nouveau` · Choix de l'enseigne, heure limite, lien à partager (copie, partage WhatsApp), liste des participants avec montant et état (Payé, En attente), barre de progression, total, boutons Partager et Lancer. Règles de la partie annexe PRD (R11).

**S-23 · Commande de groupe (invité)** · `/g/[token]` · Ouvert sans compte pour voir ; connexion pour ajouter et payer sa part ; l'invité ne voit que sa part et le total.

**S-24 · Course à la demande** · `/courses/nouvelle` · Description libre, photo, vocal ; devis (estimation, marge de sécurité de 15 à 20 %, frais de service, total à payer maintenant) ; mention du plafond (20 000 FCFA pour un nouveau client, 50 000 FCFA après 3 commandes) ; liste des exclusions ; paiement avant achat.

**S-25 · Ordonnance** · `/ordonnance/[partner]` · Photo avec guide de cadrage, consentement explicite pour données de santé, mention « visible uniquement par cette pharmacie, supprimée après 30 jours », bouton « Envoyer à la pharmacie ». Envoi par URL signée vers un espace privé.

**S-26 · Suivi d'ordonnance** · `/ordonnance/[id]` · Statuts (Reçue, Validation du pharmacien, Prix confirmé, Livraison en sac scellé), temps indicatif, bouton WhatsApp vers un agent. Après validation : paiement puis suivi classique.

**S-27 · Commandes** · `/commandes` · Liste (en cours en haut, puis historique) avec enseigne, date, total, statut.
**S-28 · Détail d'une commande** · `/commandes/[id]` · Lignes, frais, reçu, boutons « Recommander » (recrée le panier avec disponibilité vérifiée), « Laisser un avis », « Aide ».
**S-29 · Compte** · `/compte` · Profil, adresses, parrainage et points, langue, thème, notifications, aide et réclamation, documents légaux, déconnexion.
**S-30 · Adresses** · `/compte/adresses` · Liste, ajout avec carte, adresse principale.
**S-31 · Préférences** · `/compte/preferences` · Langue FR/EN, thème (Auto, Clair, Sombre), notifications par canal.
**S-32 · Réclamation** · `/aide/reclamation` · Commande concernée, motif (Retard, Article manquant, Mauvais article, Qualité, Autre), description, photo, bouton « Envoyer » et bouton « Écrire sur WhatsApp ». Création d'un ticket visible dans l'espace agent.
**S-33 · Connexion** · `/connexion` · Email, mot de passe, mot de passe oublié, lien vers l'inscription. Protection anti-robots après échecs, limitation de tentatives, message d'erreur identique que l'email existe ou non.
**S-34 · Inscription** · `/inscription` · Nom, email, mot de passe avec indicateur de robustesse, téléphone (obligatoire avant la première commande), confirmation d'âge, acceptation des documents légaux, email de confirmation.
**S-35 · Mot de passe oublié et réinitialisation** · Parcours en deux pages avec jeton à durée courte.
**S-36 · Pages légales** · `/legal/[doc]` · Mentions légales, confidentialité, cookies, CGU, CGV, remboursements ; version et date affichées ; centre de préférences cookies.
**S-37 · Pages système** · 404, 500, hors ligne, maintenance : dessinées avec la voix éditoriale, avec un bouton utile.

### 2.3 Espace partenaire
**S-40 · Commandes** · `/pro` · Nouvelles commandes en haut avec minuteur d'acceptation et son discret, boutons Accepter et Refuser (motif), commandes en préparation avec « Marquer prête », indicateurs du jour et de la semaine. Le numéro du client n'apparaît jamais ; prénom, quartier et contenu seulement.
**S-41 · Détail de commande** · lignes, notes, statut, historique.
**S-42 · Catalogue** · `/pro/catalogue` · Sections, articles, prix, disponibilité en un geste, options, ajout de photo avec case de confirmation des droits, aperçu client.
**S-43 · Horaires et fermetures** · plages par jour, fermeture exceptionnelle, dernière commande.
**S-44 · Relevés** · par semaine, ventes, commissions, paiements.

### 2.4 Espace livreur
**S-50 · Mes courses** · `/livreur` · Statut en ligne, liste des courses assignées avec enseigne, quartier, délai, cash encaissé de la soirée.
**S-51 · Course en cours** · carte, étapes (récupérer, en route), boutons Appeler et WhatsApp, lien d'ouverture de l'itinéraire dans l'application de cartes, envoi de position toutes les 5 à 10 s seulement pendant la course.
**S-52 · Remise et échec** · saisie du code à 4 chiffres (5 essais), confirmation ; procédure client injoignable avec chronomètre de 5 minutes, deux appels et un message, bouton « Déclarer l'échec » ; rappels alcool (âge) et pharmacie (sac scellé).
**S-53 · Gains** · courses, primes, cash à reverser.

### 2.5 Espace agent de zone et administrateur
**S-60 · Tableau de bord** · commandes ce soir, panier moyen, taux de garantie tenue, paiements en attente, dernières commandes.
**S-61 · Commandes et dispatch** · liste et carte, réassignation d'un livreur, filtres par zone et statut, actions de transition via `transition_order`.
**S-62 · Enseignes** · liste des 60 prospects, fiche (statut, contacts, horaires, rayon, position sur carte), assistant d'intégration, import du catalogue CSV avec rapport de validation avant écriture.
**S-63 · Médias** · file de modération des photos (en attente, approuvées, refusées), droits confirmés, remplacement des placeholders.
**S-64 · Zones et tarifs** · dessin des zones sur carte, frais, minimum, suppléments, garantie par zone.
**S-65 · Utilisateurs et rôles** · recherche, suspension, révocation des sessions, attribution de rôles.
**S-66 · Validation des vocaux** · file triée par confiance, transcription, proposition, boutons Corriger et Valider ; moins de 70 % de confiance : relecture obligatoire.
**S-67 · Remboursements** · demandes, plafond de l'agent (5 000 FCFA par remboursement, 20 000 FCFA par jour), validation administrateur au-delà.
**S-68 · Réclamations** · tickets, affectation, réponse, clôture.
**S-69 · Journal d'audit** · lecture seule, filtres par acteur et entité.
**S-70 · Paramètres** · plafonds, délais, drapeaux de fonctionnalités, textes d'offre.
**S-71 · Promotions** · codes, règles, dates, utilisations.

### 2.5 Critères transversaux d'acceptation
Un écran est terminé lorsque : tous ses états existent ; il passe les contrôles d'accessibilité (contrastes, focus, libellés) ; il est visuellement vérifié sur 360 px, 768 px et 1280 px en thème clair et sombre ; ses textes sont en français et en anglais ; il a un test de bout en bout du parcours principal ; ses requêtes ont été examinées (plan d'exécution, absence de requêtes en cascade) ; sa fiche `S-xx.md` est à jour ; une capture de référence est enregistrée pour la détection de régressions visuelles.

---

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

---

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

---

## 7. Performance et montée en charge (1 000 utilisateurs connectés en même temps)

### 7.1 Ce que « 1 000 connectés » veut dire
Mille sessions ouvertes ne sont pas mille requêtes par seconde. Modèle de départ : un utilisateur actif fait une action toutes les 8 à 10 secondes, soit 100 à 125 requêtes par seconde en moyenne, jusqu'à 300 en pointe (match, soirée). Si au moins 80 % des lectures sont servies par le cache (CDN, pages régénérées, cache de proximité), la base reçoit environ 60 requêtes par seconde en pointe. Les commandes sont rares : à 3 à 5 % de conversion, mille connectés produisent quelques dizaines de commandes par dizaine de minutes. L'objectif de conception est 3 000 connectés avant de réarchitecturer, 1 000 avec une marge de 3.

### 7.2 Objectifs mesurables (budget de performance)
Affichage principal en moins de 2,5 s sur 4G moyenne et téléphone modeste ; interaction en moins de 200 ms ; décalage visuel cumulé sous 0,1. JavaScript du premier chargement : viser 170 Ko compressés maximum par route. Temps de réponse des API : p95 sous 800 ms, p99 sous 1,5 s, taux d'erreur sous 1 % à 1 000 utilisateurs simultanés. Requêtes de base fréquentes : p95 sous 50 ms. Disponibilité visée 99,5 % entre 20 h et 3 h.

### 7.3 Couches de cache
1. **CDN** : fichiers statiques et images avec cache immuable d'un an. Pages publiques d'enseigne en régénération incrémentale toutes les 60 s avec revalidation ciblée par étiquette à chaque modification du catalogue.
2. **Cache applicatif** : résultats de `partners_near` par cellule de position et par type, 60 s ; promotions et catégories 5 minutes ; paramètres 60 s.
3. **Navigateur** : requêtes dédoublonnées et mises en cache côté client (durée de fraîcheur courte), pré-chargement au survol ou à l'apparition, stockage hors ligne du panier et du dernier contenu.
Jamais de cache pour : panier, commande, paiement, données personnelles, ordonnances.

### 7.4 Base de données
Pooler de connexions en mode transaction pour les fonctions sans état ; délai maximal par requête (statement timeout) de 5 s ; index géographiques et de tri comme dans le schéma ; vues ou tables agrégées pour les statistiques de l'administration (pas de calcul lourd à la demande sur les tables chaudes) ; pagination par curseur ; sélection des seules colonnes utiles ; écritures groupées pour les notifications ; plan d'exécution des 20 requêtes principales conservé dans la documentation et vérifié dans l'intégration continue. Dimensionnement de départ : plan payant avec sauvegardes ; la taille de calcul est choisie après le test de charge et peut être augmentée sans changement de code. Vérifier les quotas du plan (connexions, temps réel, stockage, bande passante) avant le lancement.

### 7.5 Temps réel
Le temps réel sert seulement : le suivi d'une commande en cours, les tableaux de bord partenaire, livreur et agent. Le catalogue et l'accueil n'utilisent jamais le temps réel. Chaque client ne s'abonne qu'à sa commande active, et se désabonne à la fin. Repli automatique par interrogation toutes les 15 s avec intervalle croissant si le temps réel est indisponible. Objectif : moins de 300 connexions temps réel simultanées pour 1 000 utilisateurs, vérifié contre le quota du plan.

### 7.6 Tâches de fond et files
Notifications, relances, expiration des ordonnances, clôture des groupes, rapprochement des paiements : traités par tâches planifiées et table de file d'attente avec reprises à intervalle croissant, limitation du débit vers WhatsApp et le fournisseur d'emails, idempotence par identifiant d'événement. Jamais de traitement long dans le chemin de réponse à un utilisateur.

### 7.7 Interface
Rendu côté serveur avec flux (Suspense) pour afficher l'enveloppe tout de suite ; découpage du JavaScript par route ; carte et micro chargés à la demande ; listes virtualisées au-delà de 50 éléments ; polices auto-hébergées ; images adaptatives ; aucune bibliothèque de dates, d'animations ou d'icônes importée en entier ; suppression des dépendances inutiles ; interface optimiste pour ajouter au panier et laisser un avis avec retour arrière en cas d'échec ; prévention des doubles envois (bouton désactivé et clé d'idempotence).

### 7.8 Test de charge (obligatoire avant le lancement et avant chaque version majeure)
Outil k6 sur un environnement de test avec des volumes réalistes : 100 enseignes, 5 000 articles, 200 000 commandes d'historique simulées. Scénario : montée de 0 à 1 000 utilisateurs virtuels en 10 minutes, palier de 15 minutes, descente. Répartition : parcours de navigation 70 % (accueil, liste, page enseigne), recherche 10 %, panier et commande 8 %, suivi 7 %, compte 5 %. Seuils d'échec : p95 supérieur à 800 ms, erreurs supérieures à 1 %, mémoire ou connexions de la base saturées, file de notifications croissante. Tests complémentaires : pic brutal de 3 000 utilisateurs, webhook de paiement rejoué 100 fois, panne du prestataire de paiement, temps réel désactivé, base en lecture seule. Résultats archivés dans `docs/performance/` avec la configuration et les décisions de dimensionnement.

### 7.9 Mode dégradé
Si la charge dépasse la capacité : désactiver le vocal, passer le temps réel en interrogation, servir le catalogue depuis le cache périmé acceptable (jusqu'à 10 minutes), limiter la création de nouveaux groupes, afficher un message de forte affluence. Chaque mode est un drapeau dans `settings`, testé.

### 7.10 Observabilité
Suivi d'erreurs, indicateurs de performance réelle (Core Web Vitals) par page et par type d'appareil, journal des requêtes lentes de la base, tableau de bord des commandes par minute, alertes au téléphone du fondateur et de l'agent de nuit, sonde de disponibilité toutes les minutes.

## 8. Gestion du code

### 8.1 Dépôt
Un seul dépôt privé. Structure : `app/` (routes par espace), `components/ui` et `components/features`, `lib/` (clients, utilitaires, schémas), `messages/` (fr, en), `supabase/` (migrations, fonctions, seed, tests), `design/` (jetons), `docs/` (livre, écrans, décisions, performance), `e2e/` (tests de bout en bout), `scripts/` (import de catalogue, outils). Domaines nommés en anglais (`partner`, `order`, `courier`, `zone`).

### 8.2 Branches et commits
Branche principale protégée, branches courtes par fonctionnalité (`feat/S-12-article-sheet`, `fix/order-total-rounding`), fusion par demande d'intégration avec relecture et intégration continue verte obligatoires. Messages au format Conventional Commits avec portée (`feat(order): ...`, `fix(payments): ...`), phrase au présent, en anglais ou en français de façon cohérente, un sujet par commit. Aucune mention d'outil ou de co-auteur automatique.

### 8.3 Demande d'intégration
Modèle obligatoire : objectif, écrans ou parties concernés, captures avant/après (3 largeurs, 2 thèmes), tests ajoutés, impacts sécurité et performance, migrations, plan de retour arrière. Liste de relecture : droits et RLS, validation des entrées, textes FR/EN, accessibilité, états, poids des dépendances, absence de secrets et de journaux de debug.

### 8.4 Intégration continue
À chaque demande : installation propre, vérification des types, lint, format, tests unitaires, tests de base (migrations sur base vide + tests RLS), analyse de secrets, analyse des dépendances, compilation, vérification qu'aucun secret ne figure dans le paquet client, tests de bout en bout sur les parcours critiques, audit d'accessibilité automatisé, vérification du budget de JavaScript. Déploiement de prévisualisation par demande. Mise en production : manuelle, après validation, depuis la branche principale étiquetée.

### 8.5 Environnements et configuration
Développement (Supabase local), test (projet séparé, paiement en environnement de test), production. Variables par environnement ; fichier `.env.example` à jour ; validation de la configuration au démarrage (le serveur refuse de démarrer si une variable manque).

### 8.6 Migrations de base
Fichiers numérotés, jamais modifiés après fusion. Principe « étendre puis contracter » : ajouter d'abord, déployer le code compatible, supprimer ensuite. Chaque migration est testée sur une copie de la production anonymisée avant application. Retour arrière documenté.

### 8.7 Versions et retour arrière
Versionnage sémantique, journal des changements tenu à jour, étiquettes Git, publication des cartes de sources au seul outil de suivi d'erreurs. Retour arrière d'une version du site en une action ; migrations compatibles avec la version précédente.

### 8.8 Qualité du code
TypeScript strict sans `any` injustifié ; fonctions courtes ; fichiers sous 300 lignes ; composants sans logique métier (elle vit dans `lib/` et les fonctions serveur) ; erreurs typées et gérées (pas de blocs vides) ; journaux structurés sans données personnelles ; aucune valeur magique (jetons, constantes nommées) ; commentaires réservés au « pourquoi », jamais au « quoi » ; décisions importantes consignées dans `docs/decisions/` (une page par décision : contexte, choix, alternatives, conséquences).

## 9. Qualité et tests

### 9.1 Pyramide
Tests unitaires (calculs de prix, frais, minimums, plafonds, formatage FCFA, horaires de nuit) ; tests de base (RLS, fonctions, transitions) ; tests d'intégration des routes serveur et des webhooks ; tests de bout en bout (Playwright) ; captures de référence par écran et par thème pour détecter les régressions visuelles ; tests de charge ; tests de sécurité.

### 9.2 Parcours de bout en bout obligatoires
1. Adresse, accueil, page enseigne, ajout d'un article avec options, commande, paiement Mobile Money en test, suivi, livraison avec code. 2. Commande avec livraison offerte et code promo. 3. Enseigne fermée : visible mais non commandable. 4. Zone sans enseigne. 5. Commande vocale avec validation d'un agent. 6. Commande de groupe avec un participant qui ne paie pas. 7. Course à la demande avec dépassement refusé puis accepté. 8. Ordonnance envoyée, validée, supprimée à J+30. 9. Client injoignable (procédure, annulation, remboursement partiel). 10. Retard sur pack garanti et compensation. 11. Remboursement par un agent dans et au-dessus du plafond. 12. Connexion avec 6 tentatives, verrouillage et message générique. 13. Perte de réseau pendant le paiement (aucun doublon). 14. Webhook rejoué (aucun doublon). 15. Changement de langue et de thème.

### 9.3 Appareils et réseaux
Téléphone Android d'entrée de gamme (2 Go de mémoire) ; Chrome Android, Samsung Internet, Safari iOS (installation PWA), Firefox, ordinateur ; réseaux 3G lent, 4G variable, hors ligne, coupure en cours de requête ; écran 360, 412, 768, 1280 px ; zoom système 200 %.

### 9.4 Accessibilité et langue
Contrastes AA, navigation au clavier, ordre de focus, libellés de formulaires, rôles et noms accessibles, annonces des états de chargement et d'erreur, cibles tactiles de 44 px, réduction des animations. Relecture humaine des textes en français et en anglais, sans chaîne manquante (test qui échoue si une clé existe dans une langue et pas dans l'autre).

## 10. Protocole de travail écran par écran

### 10.1 Ordre de construction
1. Fondations : dépôt, Next.js strict, jetons de design, polices, composants de base, configuration validée, CI, Supabase local, migrations, seed, types générés.
2. Authentification, rôles, redirections, tests des cinq failles.
3. Base et RLS avec les tests de sécurité des données.
4. Catalogue : enseignes, horaires, articles, options, médias, import CSV, administration S-62 à S-64 minimale.
5. Adresse d'abord, accueil, listes, page enseigne, informations, avis, fiche article (S-01 à S-12).
6. Paniers, commande, livraison, offres, récapitulatif (S-13 à S-17).
7. Paiement avec l'agrégateur en environnement de test, confirmation, webhooks (S-18, S-19).
8. Espaces partenaire, livreur, agent (S-40 à S-61), suivi (S-20), carte.
9. Compte, historique, avis, réclamation, pages légales (S-27 à S-37).
10. Vocal, groupe, courses, ordonnances (S-21 à S-26), puis performance, test de charge, sécurité, mise en production.
Aucune phase ne commence avant la validation de la précédente.

### 10.2 Boucle sur un écran
1. Tu relis la fiche S-xx et les jetons. 2. Tu proposes en quelques lignes ce que tu vas construire et les questions éventuelles. 3. Tu construis composants, données, états, textes FR/EN. 4. Tu testes (unitaires, bout en bout, accessibilité). 5. Tu produis des captures à 360, 768 et 1280 px, en thème clair et sombre. 6. Tu présentes le résultat avec les risques. 7. Le fondateur valide ou demande des ajustements. 8. Tu enregistres la capture de référence et mets à jour `docs/screens/S-xx.md`.

### 10.3 Demandes d'ajustement
Le fondateur écrit : « S-xx : ce qui ne va pas ; ce que je veux ». Tu reformules en une phrase, tu proposes le changement, tu l'appliques sans toucher aux autres écrans, tu refais les captures et tu notes la modification dans `docs/CHANGELOG_ECRANS.md`. Si le changement touche un composant partagé, tu listes les écrans impactés avant de l'appliquer.

### 10.4 Définition de terminé
Voir la section 2.5 critères transversaux, plus : sécurité relue, performance mesurée, textes relus, aucune trace de génération automatique selon la section 1.9.

---

# ANNEXES

## Annexe A — Décisions prises


Le projet part de zéro : il n'y a pas de code existant à auditer. Toutes les décisions ci-dessous viennent de tes réponses ou de recommandations que tu as validées.

| Sujet | Décision | Statut |
|---|---|---|
| Produit | Livraison jour et nuit à Douala : repas, boissons et essentiels, pharmacie via partenaires, courses à la demande | Validé |
| Piliers | Vocal WhatsApp assisté par IA, commande de groupe avec paiement partagé, garantie 30 min sur certains packs, magasin de la nuit élargi | Validé |
| Premier livrable | Site web installable (PWA), bilingue français et anglais | Validé |
| Espaces V1 | Client, partenaire, livreur, administrateur (plus un rôle agent de zone) | Validé |
| Connexion | Email + mot de passe, téléphone obligatoire à la commande ; Google et mode invité plus tard | Validé |
| Base de données | Supabase (PostgreSQL), région Europe, démarches auprès de l'autorité de protection des données, migration possible plus tard | Validé |
| Paiement | Mobile Money par agrégateur dès la V1 (mise en service dès validation du dossier), cash selon historique, carte plus tard | Validé |
| Livraison | Frais par zones (3 zones) + suppléments nuit et pluie + minimum de commande par zone | Validé |
| Notifications | Notification de l'appli, WhatsApp, email | Validé |
| Carte | OpenStreetMap | Validé |
| Ordonnances | Photos conservées 30 jours puis supprimées automatiquement | Validé |
| Remboursements | Administrateur et agent de zone (plafond, validation admin au-dessus) | Validé |
| Réclamations | Formulaire dans l'appli + WhatsApp | Validé |
| Connexion coupée | Panier sauvegardé et commande mise en attente puis envoyée au retour du réseau | Choix de Claude |
| Style visuel | Base Ciel (bleu clair vivant, thème jour/nuit) + navigation de Bulles (micro au centre) + anneau de suivi de Nuit néon, un seul système de jetons | Choix de Claude, à confirmer |
| Nom, SARL | Nom à définir ; SARL choisie, démarches en cours par un tiers | En cours |
| Cash | Réservé aux clients ayant au moins 3 commandes réussies | Validé |
| Code de remise | Code à 4 chiffres à chaque livraison | Validé |
| Client injoignable | Le livreur attend 5 minutes puis applique la procédure | Validé |
| Garantie 30 min | Activée après 4 à 6 semaines de mesure des délais | Validé |
| Plafonds | Course : 20 000 FCFA (nouveau client), 50 000 FCFA après 3 commandes ; remboursement par un agent : 5 000 FCFA, 20 000 FCFA par jour | Proposé par Claude, à ajuster |
| Nuit | Un agent de zone de nuit valide les commandes vocales et un agent répond au WhatsApp | Validé |
| Infrastructure | Gratuit pour le développement et les tests ; production payante (environ 45 dollars par mois) à décider avant le lancement | À décider |

## Changements depuis la version 1

| Sujet | Avant | Maintenant |
|---|---|---|
| Cash (R2) | Après 2 commandes réussies | Après 3 commandes réussies |
| Code de remise (R17) | Proposition | Obligatoire à chaque livraison |
| Courses (R9) | Plafond de 50 000 FCFA à confirmer | 20 000 FCFA (nouveau client), 50 000 FCFA ensuite, validation admin au-delà |
| Remboursements (R10) | Plafond à définir | 5 000 FCFA par remboursement, 20 000 FCFA par jour et par agent |
| Nuit | Non défini | Agent de zone de nuit : validation des vocaux ; un agent pour le WhatsApp |
| Infrastructure | Gratuit au début | Gratuit en test ; plans payants nécessaires en production (Supabase sans pause ni sauvegardes quotidiennes, hébergement commercial) |
| Style | À choisir | Base Ciel + navigation Bulles + anneau Nuit néon, à confirmer |

---

## Annexe B — PRD (exigences produit)


## 1.1 Vision et problème

La plateforme permet de se faire livrer à Douala, de jour comme de nuit, ce dont on a besoin : un repas d'un restaurant partenaire, des boissons et des essentiels, des produits d'une pharmacie partenaire, ou n'importe quelle course. Elle remplace quatre habitudes actuelles : appeler un revendeur du quartier, sortir soi-même, commander via WhatsApp ou une application peu fiable, ou attendre le lendemain.

**Problèmes résolus :** options réduites la nuit, prix majorés, délais imprévisibles, paiement flou, absence de suivi, et en groupe une seule personne qui avance l'argent.

**Objectifs mesurables :** au moins 50 commandes en 30 jours ; au moins 15 clients qui commandent deux fois ; 80 % des livraisons en moins de 45 minutes dans les zones cœur avant d'activer la garantie ; panier moyen d'au moins 7 000 FCFA (seuils proposés).

## 1.2 Utilisateurs et rôles

| Rôle | Description | Peut | Ne peut pas |
|---|---|---|---|
| Visiteur | Personne non connectée | Voir l'accueil, les rayons, les partenaires ouverts, les prix | Commander ou payer |
| Client | Personne inscrite | Commander, payer, suivre, réclamer, gérer son profil et ses adresses | Voir les données d'un autre client |
| Partenaire | Restaurant, pharmacie ou dépôt | Gérer ses articles, ses horaires, accepter ou refuser, marquer prête, voir ses ventes | Voir le numéro du client, ni les commandes d'un autre partenaire |
| Livreur | Coursier identifié | Voir les courses assignées, changer les statuts, appeler le client pendant la course | Voir les commandes non assignées ou l'historique d'autres livreurs |
| Agent de zone | Responsable local | Suivre les commandes de sa zone, dispatcher, valider les propositions vocales, répondre aux réclamations, rembourser dans son plafond | Modifier les paramètres globaux, rembourser au-dessus du plafond |
| Administrateur | Toi | Tout, avec journal d'audit | Contourner la journalisation |

## 1.3 Fonctionnalités par espace (P1 = V1, P2 = V1.1, P3 = plus tard)

| Espace | P1 (premier mois) | P2 (V1.1) | P3 |
|---|---|---|---|
| Client | Accueil et rayons, recherche et filtres, fiche partenaire ouverte, panier, adresse (quartier, repère, GPS), paiement Mobile Money et cash selon historique, suivi, historique et recommander, profil, réclamation, commande vocale (IA propose, humain valide), langues FR/EN, thème jour/nuit | Commande de groupe avec paiement partagé, courses à la demande, ordonnances par photo, fidélité et parrainage, carte bancaire | Abonnement, livraison programmée, mode B2B |
| Partenaire | Recevoir, accepter ou refuser les commandes, marquer prête, gérer articles, prix, disponibilité et horaires, historique et relevé | Validation des ordonnances (pharmacie), statistiques | Import de catalogue |
| Livreur | Courses assignées, statuts, appel du client, code de remise, preuve par photo pour les courses, cash déclaré | Itinéraire sur carte, historique et gains | Optimisation de tournées |
| Agent et admin | Tableau de bord, dispatch manuel, file de validation des vocaux, partenaires, produits et stock, zones et tarifs, utilisateurs, remboursements, réclamations, journal d'audit, paramètres | Statistiques avancées, promotions, campagnes | Dispatch automatique |

## 1.4 Règles métier

- **R1 Horaires :** un partenaire n'est visible et commandable que pendant ses horaires ; dernière commande 30 minutes avant la fermeture (paramétrable).
- **R2 Paiement :** paiement avant livraison par défaut ; cash réservé aux clients ayant au moins 3 commandes réussies ou aux petits montants (plafond défini par l'admin).
- **R3 Client injoignable :** le livreur appelle 2 fois, écrit sur WhatsApp, attend 5 minutes puis repart. Plat préparé non remboursé ; produit en stock réintégré et remboursé moins la livraison ; après 2 échecs, paiement obligatoire avant livraison.
- **R4 Garantie 30 minutes :** packs étiquetés uniquement, zones 1 et 2, un seul arrêt ; chrono dès la confirmation du paiement ; exclusions : pluie forte, adresse introuvable, client injoignable ; compensation : frais de livraison remboursés + bon d'achat. Activée après 4 à 6 semaines de mesure des délais.
- **R5 Frais de livraison :** 3 zones autour du local (700, 1 000 et 1 500 FCFA, hypothèses), suppléments nuit et pluie (environ 300 FCFA), minimum de commande par zone (3 000, 4 000, 5 000, hypothèses).
- **R6 Arrêts :** au maximum 2 arrêts par commande.
- **R7 Alcool :** vente réservée aux majeurs ; contrôle de l'âge à la livraison ; le livreur peut refuser ; mention explicite à l'inscription.
- **R8 Pharmacie :** la plateforme ne vend aucun médicament, la pharmacie est le vendeur. Ordonnance exigée selon la réglementation en vigueur (à confirmer). Photo de l'ordonnance conservée 30 jours puis supprimée, visible uniquement par la pharmacie concernée et l'admin. Sac scellé remis au destinataire.
- **R9 Courses à la demande :** devis = estimation + marge de sécurité de 15 à 20 % + frais de service ; paiement avant ; plafond par course : 20 000 FCFA pour un nouveau client, 50 000 FCFA après 3 commandes réussies, au-delà validation de l'admin et paiement complet avant l'achat (valeurs à ajuster après les 50 premières commandes) ; aucun dépassement sans accord du client ; photos du ticket et de l'article ; différence rendue en crédit ; liste d'exclusions (produits illégaux ou dangereux, armes, drogues, médicaments hors pharmacie, argent à transporter).
- **R10 Remboursements :** l'agent de zone rembourse jusqu'à 5 000 FCFA par remboursement et 20 000 FCFA par jour (valeurs à ajuster) ; au-dessus, validation de l'admin ; chaque remboursement est journalisé.
- **R11 Groupe :** l'organisateur crée et partage un lien ; chacun ajoute ses articles et paie sa part ; la commande part quand tous ont payé ou à l'heure limite ; les non-payeurs sont exclus ; si l'organisateur annule, tous sont remboursés.
- **R12 Vocal :** l'IA propose, un humain valide avant confirmation ; aucun enregistrement conservé après traitement ; confiance faible = relecture obligatoire.
- **R13 Fidélisation :** les partenaires reçoivent le prénom, la commande et le quartier, pas le numéro complet ; les points de fidélité ne servent que sur la plateforme.
- **R14 Partenaires :** marge ajoutée sur le prix du plat, ou remise de 10 à 15 % pour les petits grilladins ; paiement hebdomadaire (à la commande pendant l'essai).
- **R15 Livreurs :** identifiés (nom, photo) ; accord écrit sur la rémunération, la responsabilité et le non-contournement (livreurs actuellement non rémunérés : à formaliser).
- **R16 Montants :** FCFA, entiers, sans décimales.
- **R17 Code de remise :** un code à 4 chiffres communiqué au client, confirmé par le livreur à chaque livraison (règle validée).
- **R18 Consentement :** acceptation explicite des CGV et de la politique de confidentialité, version enregistrée ; retrait du consentement possible.
- **R19 Suspension :** un compte suspendu perd immédiatement ses sessions.

## 1.5 Cas d'usage

| ID | Acteur | Scénario | Résultat attendu |
|---|---|---|---|
| UC1 | Client | Commande d'un repas chez un restaurant ouvert | Commande payée, partenaire notifié, suivi en direct, livraison |
| UC2 | Client | Commande par message vocal | Proposition de commande, validation humaine, confirmation, paiement |
| UC3 | Client | Commande de groupe pour une soirée | Chacun paie sa part ; commande lancée à l'heure limite |
| UC4 | Client | Produits de pharmacie avec ordonnance | Pharmacie valide, prépare ; remise en sac scellé |
| UC5 | Client | Course à la demande (outils, mall) | Devis, paiement, achat avec preuves, livraison, remboursement de l'écart |
| UC6 | Livreur | Client injoignable | Procédure R3, statut échec, trace dans l'historique |
| UC7 | Système | Retard sur un pack garanti | Compensation automatique proposée à l'agent |
| UC8 | Agent | Remboursement dans son plafond | Remboursement exécuté et journalisé |

## 1.6 Contraintes et objectifs de qualité

- **Réseau :** usage sur téléphones modestes et 4G variable ; chargement rapide, tolérance aux coupures.
- **Disponibilité :** service critique entre 20h et 3h ; surveillance et alerte en cas de panne.
- **Sécurité et données :** conformité à la loi camerounaise sur les données personnelles (voir annexe A) ; secrets jamais côté client.
- **Langues :** interface française et anglaise ; catalogue en français, traduction anglaise facultative.
- **Budget :** 500 000 à 2 000 000 FCFA ; coûts d'infrastructure mensuels à maintenir bas ; livraison du premier mois par une seule personne.
- **Accessibilité :** contrastes AA, zones tactiles d'au moins 44 px, libellés lisibles par lecteur d'écran.

## 1.7 Critères d'acceptation (extraits)

| Fonction | Critères |
|---|---|
| Horaires | Un partenaire fermé n'apparaît pas dans la liste ; sa fiche indique l'heure d'ouverture |
| Commande | Un client connecté avec téléphone renseigné peut payer ; la commande passe de "paiement en attente" à "payée" uniquement après confirmation serveur du paiement |
| Paiement | Un webhook rejoué ne crée pas de double paiement (clé d'idempotence) ; signature invalide = rejet |
| Vocal | Un message vocal produit une proposition modifiable ; rien n'est confirmé sans validation |
| Groupe | Un participant ne voit que sa propre part et le total ; la commande part à l'heure limite avec les parts payées |
| Ordonnances | Une photo n'est lisible que par la pharmacie concernée et l'admin ; elle est supprimée à J+30 |
| Droits | Un client ne peut lire aucune commande d'un autre client, même avec l'identifiant (test RLS) |
| Remboursement | Un agent ne peut pas dépasser son plafond ; l'action est inscrite au journal |

---

## Annexe C — TRD (exigences techniques)


## 2.1 Principes

- Chaque choix est justifié par la taille du projet, son budget et son évolution ; pas de technologie ajoutée sans besoin.
- Une seule application web (PWA) avec accès par rôle, pas quatre applications.
- La sécurité est pensée dès la conception : les droits sont appliqués par la base de données (RLS), jamais seulement par l'interface.
- Ce qui peut être mesuré doit l'être : performances, erreurs, délais de livraison.

## 2.2 Architecture générale

| Couche | Composant | Rôle |
|---|---|---|
| Client | PWA Next.js (navigateur, installée sur l'écran d'accueil) | Interface des 4 espaces, hors-ligne partiel |
| Edge | Hébergeur front avec CDN | Distribution, mise en cache, HTTPS |
| Backend | Supabase : PostgreSQL, Auth, Realtime, Storage, Edge Functions | Données, authentification, temps réel, fichiers, logique serveur |
| Services | Agrégateur Mobile Money, WhatsApp, email, transcription, modèle de langage, tuiles de carte | Paiement, notifications, vocal, cartes |
| Observabilité | Suivi d'erreurs, logs, surveillance de disponibilité | Alertes et diagnostic |

## 2.3 Stack et justification

| Besoin | Choix | Pourquoi / points d'attention |
|---|---|---|
| Langage | TypeScript en mode strict | Moins d'erreurs, code plus sûr, bon avec Cursor |
| Frontend | Next.js (App Router) + React | PWA, rendu serveur utile pour la rapidité, routage par rôle. Alternative Expo non retenue pour la V1 car le livrable prioritaire est une PWA |
| Interface | Tailwind CSS + composants shadcn/ui (licence MIT) | Rapidité de développement et cohérence visuelle |
| Langues | next-intl | Français et anglais, fichiers de traduction |
| Données côté client | TanStack Query | Cache, évite les requêtes en double, nouvelles tentatives |
| Formulaires | React Hook Form + Zod | Validation partagée client et serveur |
| PWA | Manifest + service worker (Serwist) | Installation, cache, file d'attente de commande hors-ligne. À tester sur Android et iOS |
| Base et auth | Supabase (PostgreSQL), région Europe | RLS, auth intégrée (hachage géré par Supabase), temps réel, stockage. Aucune région africaine proposée : voir annexe A. Gratuit pour le développement et les tests ; en production le plan Pro (environ 25 dollars par mois) est nécessaire : le plan gratuit met le projet en pause après 7 jours d'inactivité et n'a pas de sauvegardes quotidiennes |
| Logique serveur | Supabase Edge Functions | Secrets côté serveur : paiement, webhooks, IA, notifications |
| Tâches planifiées | pg_cron | Suppression des ordonnances à J+30, relances, clôture des groupes |
| Hébergement front | Vercel (région Paris) ou un autre hébergeur à évaluer | L'offre gratuite de Vercel est réservée à un usage non commercial : en production, plan payant (environ 20 dollars par mois et par utilisateur) ou hébergeur alternatif, à décider avant le lancement |
| Paiement | Agrégateur Mobile Money à choisir (candidats à évaluer : CinetPay, Flutterwave, NotchPay) | Critères : MTN et Orange au Cameroun, frais, délai de vérification de l'entreprise, webhooks signés, environnement de test. Choix confirmé après évaluation |
| Notifications | Web push (VAPID), WhatsApp (liens wa.me en V1, API officielle ensuite), email transactionnel (Resend ou Brevo) | Web push sur iOS seulement si la PWA est installée ; WhatsApp facturé par message envoyé par l'entreprise |
| Cartes | MapLibre ou Leaflet + données OpenStreetMap | Les serveurs de tuiles publics d'OSM ne conviennent pas à un usage intensif : fournisseur de tuiles tiers ou auto-hébergement |
| Vocal | Enregistrement navigateur, transcription (modèle de type Whisper), extraction par modèle de langage (API Claude) | Clés côté serveur uniquement ; qualité à tester sur de vrais audios camerounais ; validation humaine |
| Anti-robots | Cloudflare Turnstile ou hCaptcha | Supporté par l'authentification Supabase |
| Suivi | Sentry (erreurs), logs Supabase, sonde de disponibilité, analytics respectueux après consentement | Alerte en cas de panne nocturne |
| Tests | Vitest, Playwright, tests des politiques RLS | Fonctions critiques automatisées |
| Outils | Cursor ou VS Code, Git/GitHub, ESLint, Prettier, GitHub Actions | Intégration continue |

## 2.4 Organisation du code

- **/app** : routes par espace (client, partenaire, livreur, agent-admin), layouts avec garde de rôle.
- **/components** : composants réutilisables du système de design. **/lib** : clients Supabase, utilitaires, schémas Zod. **/messages** : traductions FR/EN.
- **/supabase** : migrations SQL, politiques RLS, fonctions Edge, jeux de données de test. **/docs** : ces documents.

## 2.5 Fonctions serveur (Edge Functions)

| Fonction | Rôle |
|---|---|
| create-payment | Crée la demande de paiement chez l'agrégateur avec clé d'idempotence |
| payment-webhook | Vérifie la signature, anti-rejeu, met à jour paiement et commande |
| voice-to-order | Reçoit l'audio, transcrit, extrait une proposition, supprime l'audio |
| assign-courier | Propose ou assigne un livreur selon la zone |
| notify | Envoie push, WhatsApp, email selon l'événement |
| refund | Exécute un remboursement avec contrôle de plafond et journal |
| purge-prescriptions | Supprime les ordonnances de plus de 30 jours (planifiée) |

## 2.6 Authentification et sessions

- Email + mot de passe via Supabase Auth ; confirmation par email ; téléphone obligatoire à la commande.
- Limitation des tentatives de connexion, protection anti-robots, messages d'erreur génériques, récupération sécurisée du mot de passe.
- Durée de session définie, renouvellement sécurisé, révocation immédiate des sessions d'un compte suspendu ou supprimé.
- Rôles stockés en base ; aucun contrôle d'accès uniquement dans le navigateur.

## 2.7 Sécurité : exigences

| Domaine | Exigences |
|---|---|
| Secrets | Variables d'environnement, .env dans .gitignore, aucune clé secrète dans le frontend, vérification de l'historique Git, procédure de rotation des clés |
| Base de données | RLS activée sur toutes les tables, politiques précises, validation avant insertion, colonnes limitées dans les requêtes, aucune requête construite par concaténation |
| Fichiers | Taille maximale, vérification du vrai type MIME, renommage sécurisé, bucket privé avec URL signées courtes pour les ordonnances, purge automatique |
| Réseau | HTTPS partout, CORS restreint, protections XSS et CSRF, en-têtes de sécurité |
| Paiement | Aucune donnée de carte stockée, vérification serveur, webhooks signés et anti-rejeu, idempotence |
| Journalisation | Actions sensibles journalisées sans données personnelles inutiles ; erreurs détaillées désactivées en production |
| Dépendances | Mises à jour régulières, analyse de vulnérabilités, aucun script tiers non vérifié |
| Sauvegardes | Sauvegardes automatiques, restauration testée avant le lancement |

## 2.8 Audit des cinq failles de connexion

| Faille | Mesure | Vérification |
|---|---|---|
| 1. Tentatives illimitées | Limitation par IP et par compte, anti-robots | Test de 50 tentatives rapides |
| 2. Messages trop explicites | Message unique pour tout échec d'identification | Comparer email existant et inexistant |
| 3. Vérification dans le navigateur | Droits appliqués par RLS et fonctions serveur | Appels directs à l'API sans interface |
| 4. Mots de passe lisibles | Hachage géré par Supabase Auth, pas de stockage parallèle | Inspection de la base |
| 5. Sessions sans expiration | Durée limitée, révocation, déconnexion des comptes suspendus | Test d'expiration et de suspension |

## 2.9 Performance

| Objectif (proposition) | Moyens |
|---|---|
| Affichage principal en moins de 2,5 s sur 4G moyenne ; interaction en moins de 200 ms | Rendu serveur, découpage du JavaScript par page, polices hébergées et limitées |
| Premier chargement léger (viser environ 170 Ko de JavaScript compressé) | Suppression des dépendances inutiles, scripts tiers chargés après le contenu |
| Pas d'écran blanc | Squelettes de chargement, états vides et d'erreur, interface optimiste avec retour arrière |
| Images légères | WebP ou AVIF, chargement différé, CDN, cache navigateur |
| Requêtes efficaces | Debounce de la recherche (300 ms), pagination, requêtes en parallèle, colonnes utiles seulement, index, pool de connexions, délais maximum sur les API externes |
| Résistance au réseau faible | Panier sauvegardé localement, commande mise en attente et renvoyée au retour du réseau, indicateur d'état |
| Mesure réelle | Core Web Vitals sur utilisateurs, tests sur téléphone peu puissant et connexion lente, optimisation selon les mesures |

## 2.10 Environnements, déploiement et maintenance

- **Développement :** Supabase local (CLI), données fictives. **Test :** projet Supabase séparé + prévisualisation du front, paiement en environnement de test. **Production :** projet dédié, accès restreints.
- Intégration continue : vérification des types, lint, tests, analyse des dépendances avant chaque déploiement. Migrations SQL versionnées, aucune commande destructive en production sans validation.
- Surveillance : alertes d'erreurs et de disponibilité, tableau de bord des commandes, revue hebdomadaire des métriques, plan de restauration testé.
- Documentation technique permettant à un autre développeur de reprendre le projet.
- **Coûts d'infrastructure :** développement et tests gratuits ; en production, environ 45 dollars par mois (Supabase Pro environ 25, hébergement du front environ 20), soit environ 25 000 à 30 000 FCFA selon le taux de change. Décision à prendre avant le lancement (semaine 4).

---

## Annexe D — App Flow (parcours et statuts)


## 3.1 Redirections selon le rôle après connexion

| Rôle | Page d'arrivée | Accès refusé vers |
|---|---|---|
| Visiteur | Accueil public | Connexion avec retour à la page demandée |
| Client | Accueil client | Accueil client |
| Partenaire | Tableau de bord des commandes du partenaire | Son tableau de bord |
| Livreur | Liste de ses courses | Sa liste de courses |
| Agent de zone | Tableau de bord de sa zone | Son tableau de bord |
| Administrateur | Tableau de bord global | Son tableau de bord |

## 3.2 Parcours client

| Parcours | Étapes (action - page suivante - données enregistrées) |
|---|---|
| Inscription | 1. Email + mot de passe + acceptation CGV - 2. Email de confirmation - 3. Lien validé - 4. Profil : prénom, téléphone, langue - 5. Accueil. Enregistré : profil, version des CGV acceptée |
| Connexion | Email + mot de passe - accueil du rôle. Erreur : message générique ; trop de tentatives : blocage temporaire et message |
| Commande d'un repas | 1. Accueil - 2. Rayon ou partenaire ouvert - 3. Fiche : ajout d'articles - 4. Panier : vérification, minimum de zone - 5. Adresse : quartier, repère, GPS - 6. Paiement : Mobile Money ou cash si autorisé - 7. Confirmation de paiement - 8. Suivi - 9. Livraison, code de remise - 10. Avis. Enregistré : commande, lignes, paiement, historique de statuts |
| Commande vocale | 1. Bouton micro, consentement d'enregistrement - 2. Enregistrement (annulable) - 3. Traitement - 4. Proposition modifiable (ou relecture humaine) - 5. Validation - 6. Suite identique au panier |
| Commande de groupe | 1. Créer le groupe, heure limite - 2. Partager le lien - 3. Chaque invité ajoute et paie sa part - 4. Suivi des paiements - 5. Lancement ou fermeture automatique - 6. Livraison unique |
| Course à la demande | 1. Décrire (texte, photo ou vocal) - 2. Devis avec frais - 3. Paiement - 4. Achat avec photos - 5. Validation d'un éventuel dépassement - 6. Livraison - 7. Remboursement de la différence |
| Ordonnance | 1. Choisir une pharmacie (de garde la nuit) - 2. Photo de l'ordonnance, consentement - 3. Validation par le pharmacien - 4. Prix confirmé - 5. Paiement - 6. Livraison en sac scellé |
| Réclamation | Formulaire dans la commande (motif, photo) ou bouton WhatsApp ; suivi du ticket dans l'appli |
| Déconnexion | Bouton compte - session révoquée - accueil public |

## 3.3 Parcours partenaire, livreur, agent et administrateur

| Espace | Parcours |
|---|---|
| Partenaire | Nouvelle commande (notification sonore) - accepter ou refuser (motif) - préparation - marquer prête - remise au livreur. Gérer ses articles et horaires. Consulter son relevé hebdomadaire |
| Livreur | Course proposée - accepter - récupérer chez le partenaire - en route - appel client si besoin - saisie du code de remise - livrée, ou procédure d'échec (R3). Pour une course : photos du ticket et de l'article |
| Agent de zone | Voir les commandes de sa zone - réassigner un livreur - traiter une réclamation - rembourser dans son plafond |
| Administrateur | Tableau de bord - gestion des partenaires, produits, zones et tarifs - utilisateurs et suspensions - remboursements au-dessus du plafond - journal d'audit - paramètres |

## 3.4 États de l'interface

| État | Comportement |
|---|---|
| Chargement | Squelettes dédiés à chaque liste, jamais d'écran blanc |
| Vide | Message utile et action proposée (par exemple : aucun restaurant ouvert, voir les boissons) |
| Erreur réseau | Bandeau, réessai automatique, panier conservé |
| Erreur serveur | Message simple sans détail technique ; incident enregistré |
| Confirmation | Confirmation avant action sensible (annuler, rembourser, supprimer) |
| Hors ligne | Indicateur ; la commande est mise en file d'attente et envoyée au retour du réseau avec un identifiant unique pour éviter les doublons |

## 3.5 Statuts d'une commande

| Statut | Déclencheur | Acteur | Statut suivant |
|---|---|---|---|
| draft | Panier en cours | Client | pending_payment |
| pending_payment | Validation du panier | Client | paid ou cancelled |
| paid | Confirmation serveur du paiement ou cash accepté | Système | accepted ou cancelled |
| accepted | Partenaire accepte | Partenaire | preparing ou cancelled |
| preparing | Préparation lancée | Partenaire | ready |
| ready | Commande prête | Partenaire | courier_assigned |
| courier_assigned | Livreur assigné | Agent, système | picked_up |
| picked_up | Récupérée | Livreur | on_the_way |
| on_the_way | En route | Livreur | delivered ou failed_delivery |
| delivered | Code de remise confirmé | Livreur | (fin) ou refund_requested |
| failed_delivery | Procédure R3 terminée | Livreur | refunded partiel ou (fin) |
| cancelled / refunded | Annulation ou remboursement | Client, agent, admin | (fin) |

---

## Annexe E — UX/UI Design Brief (version 1.1, la partie 1 de ce livre prévaut sur la typographie et les couleurs)


## 4.1 Identité visuelle

Direction retenue : **Ciel**, une interface claire, vive et rassurante, avec un bleu clair vivant, des cartes arrondies et un gros bouton micro au premier plan. Le thème bascule automatiquement entre **clair en journée** et **sombre le soir**. Ton : proche, simple, jamais condescendant. L'interface doit sembler cohérente d'un écran à l'autre : mêmes espacements, mêmes composants, mêmes règles.

## 4.2 Jetons de design

| Élément | Mode jour | Mode nuit |
|---|---|---|
| Fond | #F2F9FF | #0A1628 |
| Surface (cartes) | #FFFFFF | #12233B |
| Texte principal | #0B2540 | #EAF4FF |
| Texte secondaire | #5B7894 | #8FB0CC |
| Couleur principale (boutons) | #0B84E0, texte blanc | #2FB0FF, texte #04213A |
| Pastille douce | #DDF1FF, texte #0A4F8A | #16314F, texte #9AD8FF |
| Bordures | #D3E5F4 | #1F3752 |
| Mise en avant (garantie) | #FFF1CC, texte #6B4A00 | #3A2F10, texte #FFD98A |

| Thème | Spécification |
|---|---|
| Typographie | Une seule famille sans empattement, version variable hébergée localement (par exemple Inter, licence ouverte), avec repli sur la police système ; deux graisses (400 et 500) |
| Tailles | 12, 14, 16, 20, 24 et 32 px ; corps de texte 14 à 16 px ; jamais en dessous de 12 px |
| Espacements | Échelle de 4 px (4, 8, 12, 16, 24, 32) ; marges d'écran de 14 à 16 px |
| Arrondis | 8 px (champs), 14 à 16 px (cartes), 999 px (boutons et pastilles) |
| Ombres | Aucune par défaut ; hiérarchie par fines bordures et fonds |
| Animations | 150 à 250 ms, simples (apparition, glissement) ; respect du réglage "réduire les animations" |

## 4.3 Composants réutilisables

- Boutons (principal, secondaire, texte), champs, sélecteurs, interrupteurs, pastilles de catégorie, badges ("Garanti 30 min", "Payé", "En attente").
- Cartes (pack, partenaire, article, commande, participant), listes avec lignes séparées, barre de recherche avec micro, barre de navigation inférieure.
- Fenêtres modales et feuilles du bas, notifications éphémères (toasts), squelettes, états vides, tableaux de bord et tableaux de données pour l'admin.
- Chronomètre de garantie, ligne de statut, carte (suivi), sélecteur de langue et de thème.

## 4.4 Écrans à concevoir

| Espace | Écrans |
|---|---|
| Public et client | Accueil, rayon, fiche partenaire, fiche pack, recherche, panier, adresse, paiement, confirmation, suivi, historique, détail commande, commande vocale, groupe (création, partage, suivi), course à la demande, ordonnance, profil, adresses, réclamation, connexion, inscription, mot de passe oublié, pages juridiques |
| Partenaire | Commandes en cours, détail commande, articles, horaires, historique et relevé |
| Livreur | Mes courses, détail de course, remise, échec de livraison, preuves |
| Agent et admin | Tableau de bord, commandes et dispatch, partenaires, produits et stock, zones et tarifs, utilisateurs, remboursements, réclamations, journal d'audit, paramètres |

## 4.5 Choix de style

Cinq directions ont été dessinées pour l'accueil, la page partenaire, le panier, le suivi et le groupe : **Ciel** (validé par défaut), **Nuit néon** (sombre, micro géant), **Marché** (grosses tuiles colorées), **Minimal** (noir et blanc, typographique) et **Bulles** (pastel, micro central). Un mélange est possible à condition de conserver un seul système de jetons. **Choix retenu par défaut :** base Ciel, navigation centrale de Bulles (micro au milieu de la barre du bas), anneau de compte à rebours de Nuit néon pour le suivi, avec un seul système de jetons ; à confirmer ou modifier.

## 4.6 Responsive, accessibilité et légèreté

- Mobile d'abord (largeur de 360 px), adaptation tablette, tableaux de bord optimisés pour ordinateur.
- Contrastes AA, zones tactiles d'au moins 44 px, étiquettes pour lecteurs d'écran, navigation au clavier sur l'admin.
- Conception pour connexion faible : images légères, pas de vidéo automatique, mode économie de données envisageable.

---

## Annexe F — Backend Schema (description ; le SQL de l'annexe H prévaut)


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

---

## Annexe G — Implementation Plan (la partie 10 de ce livre prévaut sur l'ordre)


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

---

## Annexe H — Schéma SQL complet

Fichiers dans `supabase/migrations`. Les trois fichiers ci-dessous sont reproduits pour que ce livre soit autonome.

### 0001_schema.sql

```sql
-- Schéma principal de la plateforme de livraison (Supabase / PostgreSQL 15+)
-- Convention : montants en FCFA (entiers), dates en timestamptz, fuseau d'affichage Africa/Douala.

create extension if not exists postgis;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ===== Types =====
create type public.user_role as enum ('client', 'partner', 'courier', 'zone_agent', 'admin');
create type public.partner_type as enum ('restaurant', 'pharmacy', 'depot', 'own_stock', 'supermarket', 'other');
create type public.partner_status as enum ('prospect', 'onboarding', 'active', 'paused', 'closed');
create type public.order_status as enum ('draft', 'pending_payment', 'paid', 'accepted', 'preparing', 'ready', 'courier_assigned', 'picked_up', 'on_the_way', 'delivered', 'failed_delivery', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type public.payment_method as enum ('mobile_money_mtn', 'mobile_money_orange', 'cash', 'card');
create type public.order_source as enum ('web', 'voice', 'group', 'errand', 'prescription');
create type public.refund_status as enum ('requested', 'approved', 'rejected', 'paid');
create type public.group_status as enum ('open', 'locked', 'launched', 'cancelled');
create type public.voice_status as enum ('received', 'proposed', 'validated', 'rejected');
create type public.prescription_status as enum ('sent', 'validated', 'rejected', 'expired');
create type public.ticket_status as enum ('open', 'pending', 'resolved');
create type public.media_status as enum ('pending', 'approved', 'rejected');

-- ===== Utilitaires =====
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ===== Identité =====
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  language text not null default 'fr' check (language in ('fr', 'en')),
  is_adult_confirmed boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  loyalty_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.user_role not null,
  scope_id uuid,
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, role, scope_id)
);

-- ===== Géographie =====
create table public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  delivery_fee integer not null check (delivery_fee >= 0),
  min_order integer not null default 0 check (min_order >= 0),
  night_surcharge integer not null default 0,
  rain_surcharge integer not null default 0,
  guarantee_enabled boolean not null default false,
  geom geography (multipolygon, 4326),
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  zone_id uuid references public.zones (id) on delete set null,
  geo geography (point, 4326),
  created_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  neighborhood_id uuid references public.neighborhoods (id),
  landmark text not null,
  details text,
  geo geography (point, 4326),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== Partenaires =====
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type public.partner_type not null,
  name text not null,
  description jsonb not null default '{}'::jsonb,
  cuisine_tags text[] not null default '{}',
  phone text,
  neighborhood_id uuid references public.neighborhoods (id),
  address_text text,
  geo geography (point, 4326),
  delivery_radius_m integer not null default 4000 check (delivery_radius_m > 0),
  avg_prep_minutes integer not null default 15 check (avg_prep_minutes >= 0),
  min_order integer check (min_order >= 0),
  status public.partner_status not null default 'prospect',
  commission_model text not null default 'markup' check (commission_model in ('markup', 'discount', 'percent')),
  commission_value integer not null default 0,
  rating_avg numeric (2, 1),
  rating_count integer not null default 0,
  logo_path text,
  cover_path text,
  is_placeholder boolean not null default false,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partner_members (
  partner_id uuid not null references public.partners (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (partner_id, user_id)
);

-- weekday : 0 = dimanche ... 6 = samedi. Si closes_at <= opens_at, la plage se termine le lendemain.
create table public.partner_hours (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  last_order_before_close integer not null default 30 check (last_order_before_close >= 0)
);

create table public.partner_closures (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at)
);

-- ===== Catalogue =====
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name jsonb not null,
  icon text,
  sort integer not null default 0
);

create table public.menu_sections (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  name jsonb not null,
  sort integer not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  section_id uuid references public.menu_sections (id) on delete set null,
  category_id uuid references public.categories (id),
  slug text not null,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price integer not null check (price >= 0),
  compare_at_price integer check (compare_at_price >= 0),
  is_available boolean not null default true,
  is_popular boolean not null default false,
  requires_age_check boolean not null default false,
  is_medicine boolean not null default false,
  prep_minutes integer,
  image_path text,
  is_placeholder boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, slug)
);

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name jsonb not null,
  min_select integer not null default 0,
  max_select integer not null default 1,
  sort integer not null default 0,
  check (max_select >= min_select)
);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups (id) on delete cascade,
  name jsonb not null,
  price_delta integer not null default 0,
  is_available boolean not null default true,
  sort integer not null default 0
);

create table public.packs (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price integer not null check (price >= 0),
  guarantee_eligible boolean not null default false,
  single_stop boolean not null default true,
  image_path text,
  active boolean not null default true
);

create table public.pack_items (
  pack_id uuid not null references public.packs (id) on delete cascade,
  product_id uuid not null references public.products (id),
  qty integer not null default 1 check (qty > 0),
  primary key (pack_id, product_id)
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('partner_logo', 'partner_cover', 'product', 'pack', 'banner')),
  owner_id uuid not null,
  path text not null,
  width integer,
  height integer,
  blurhash text,
  alt jsonb not null default '{}'::jsonb,
  status public.media_status not null default 'pending',
  uploaded_by uuid references public.profiles (id),
  rights_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  kind text not null check (kind in ('percent', 'amount', 'free_delivery', 'bogo')),
  value integer not null default 0,
  min_order integer not null default 0,
  partner_id uuid references public.partners (id) on delete cascade,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  used_count integer not null default 0,
  active boolean not null default true
);

-- ===== Commandes =====
create table public.group_orders (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id),
  partner_id uuid references public.partners (id),
  deadline timestamptz not null,
  status public.group_status not null default 'open',
  link_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.group_orders (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  share_amount integer not null default 0 check (share_amount >= 0),
  paid boolean not null default false,
  primary key (group_id, user_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity,
  customer_id uuid not null references public.profiles (id),
  address_id uuid references public.addresses (id),
  zone_id uuid references public.zones (id),
  partner_id uuid references public.partners (id),
  status public.order_status not null default 'draft',
  source public.order_source not null default 'web',
  subtotal integer not null default 0 check (subtotal >= 0),
  discount_total integer not null default 0 check (discount_total >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  surcharges integer not null default 0 check (surcharges >= 0),
  service_fee integer not null default 0 check (service_fee >= 0),
  tip integer not null default 0 check (tip >= 0),
  total integer not null default 0 check (total >= 0),
  payment_method public.payment_method,
  guarantee_deadline timestamptz,
  group_order_id uuid references public.group_orders (id),
  delivery_option text not null default 'standard' check (delivery_option in ('standard', 'priority', 'scheduled')),
  scheduled_for timestamptz,
  courier_note text,
  idempotency_key text unique,
  placed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_secrets (
  order_id uuid primary key references public.orders (id) on delete cascade,
  handover_code text not null,
  handover_attempts integer not null default 0
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id),
  partner_id uuid references public.partners (id),
  name_snapshot text not null,
  unit_price integer not null check (unit_price >= 0),
  qty integer not null check (qty > 0),
  options jsonb not null default '[]'::jsonb,
  line_total integer not null check (line_total >= 0)
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  changed_by uuid references public.profiles (id),
  reason text,
  created_at timestamptz not null default now()
);

create table public.order_transitions (
  from_status public.order_status not null,
  to_status public.order_status not null,
  role public.user_role not null,
  primary key (from_status, to_status, role)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  provider text not null,
  provider_ref text,
  method public.payment_method not null,
  amount integer not null check (amount >= 0),
  status public.payment_status not null default 'pending',
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payload jsonb not null,
  verified boolean not null default false,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  amount integer not null check (amount > 0),
  reason text not null,
  status public.refund_status not null default 'requested',
  requested_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.couriers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  zone_id uuid references public.zones (id),
  vehicle text,
  is_active boolean not null default true,
  id_verified boolean not null default false,
  current_geo geography (point, 4326),
  last_seen_at timestamptz
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  courier_id uuid references public.couriers (user_id),
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  failure_reason text,
  cash_collected integer not null default 0 check (cash_collected >= 0)
);

create table public.voice_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  transcript text,
  proposal jsonb,
  confidence numeric (4, 3),
  status public.voice_status not null default 'received',
  validated_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  partner_id uuid not null references public.partners (id),
  file_path text not null,
  status public.prescription_status not null default 'sent',
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create table public.errands (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  description text not null,
  estimate integer not null check (estimate >= 0),
  cap integer not null check (cap > 0),
  actual_amount integer check (actual_amount >= 0),
  receipt_path text,
  item_photo_path text
);

-- ===== Relation client =====
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  partner_id uuid not null references public.partners (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  tags text[] not null default '{}',
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  points integer not null,
  reason text not null,
  order_id uuid references public.orders (id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('push', 'whatsapp', 'email')),
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id),
  subject text not null,
  message text not null,
  status public.ticket_status not null default 'open',
  assigned_to uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  ip_hash text
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ===== Index =====
create index idx_addresses_user on public.addresses (user_id);
create index idx_neighborhoods_zone on public.neighborhoods (zone_id);
create index idx_zones_geom on public.zones using gist (geom);
create index idx_partners_geo on public.partners using gist (geo);
create index idx_partners_status_type on public.partners (status, type);
create index idx_partners_name_trgm on public.partners using gin (name gin_trgm_ops);
create index idx_partner_hours_partner on public.partner_hours (partner_id, weekday);
create index idx_closures_partner on public.partner_closures (partner_id, starts_at);
create index idx_sections_partner on public.menu_sections (partner_id, sort);
create index idx_products_partner on public.products (partner_id, is_available);
create index idx_products_name_trgm on public.products using gin ((name ->> 'fr') gin_trgm_ops);
create index idx_options_group on public.options (group_id);
create index idx_orders_customer on public.orders (customer_id, created_at desc);
create index idx_orders_status_zone on public.orders (status, zone_id);
create index idx_orders_partner on public.orders (partner_id, created_at desc);
create index idx_order_items_order on public.order_items (order_id);
create index idx_order_items_partner on public.order_items (partner_id);
create index idx_history_order on public.order_status_history (order_id, created_at);
create index idx_payments_order on public.payments (order_id);
create index idx_deliveries_courier on public.deliveries (courier_id);
create index idx_reviews_partner on public.reviews (partner_id, created_at desc);
create index idx_notifications_user on public.notifications (user_id, created_at desc);
create index idx_prescriptions_expiry on public.prescriptions (expires_at) where status <> 'expired';
create index idx_tickets_status on public.support_tickets (status, created_at desc);
create index idx_audit_entity on public.audit_logs (entity, entity_id);

-- ===== updated_at =====
do $$
declare t text;
begin
  for t in select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
    group by table_name
  loop
    execute format('create trigger trg_%s_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;
```

### 0002_functions.sql

```sql
-- Fonctions métier : rôles, horaires, proximité, tarification, transitions de commande.

create or replace function public.has_role(r public.user_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = r);
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'zone_agent'));
$$;

create or replace function public.is_partner_member(p_partner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.partner_members pm where pm.partner_id = p_partner and pm.user_id = auth.uid());
$$;

create or replace function public.can_read_order(p_order uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff()
    or exists (select 1 from public.orders o where o.id = p_order and o.customer_id = auth.uid())
    or exists (select 1 from public.order_items oi where oi.order_id = p_order and public.is_partner_member(oi.partner_id))
    or exists (select 1 from public.deliveries d where d.order_id = p_order and d.courier_id = auth.uid());
$$;

-- Ouverture d'une enseigne à un instant donné (fuseau Africa/Douala).
create or replace function public.is_open_now(p_partner uuid, p_at timestamptz default now()) returns boolean
language plpgsql stable set search_path = public as $$
declare
  t timestamp := p_at at time zone 'Africa/Douala';
  wd smallint := extract(dow from t)::smallint;
  prev smallint := ((extract(dow from t)::int + 6) % 7)::smallint;
  tm time := t::time;
  ok boolean;
begin
  if exists (select 1 from public.partner_closures c where c.partner_id = p_partner and p_at >= c.starts_at and p_at < c.ends_at) then
    return false;
  end if;
  select exists (
    select 1 from public.partner_hours h
    where h.partner_id = p_partner
      and (
        (h.weekday = wd and ((h.closes_at > h.opens_at and tm >= h.opens_at and tm < h.closes_at)
                          or (h.closes_at <= h.opens_at and tm >= h.opens_at)))
        or (h.weekday = prev and h.closes_at <= h.opens_at and tm < h.closes_at)
      )
  ) into ok;
  return coalesce(ok, false);
end $$;

-- Enseignes qui livrent à un point donné, classées : ouvertes d'abord, puis par distance.
create or replace function public.partners_near(
  p_lat double precision,
  p_lng double precision,
  p_type public.partner_type default null,
  p_limit integer default 60
) returns table (
  id uuid, slug text, name text, type public.partner_type, distance_m double precision,
  logo_path text, cover_path text, rating_avg numeric, rating_count integer,
  avg_prep_minutes integer, is_open boolean
)
language sql stable set search_path = public, extensions as $$
  with pt as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g)
  select p.id, p.slug, p.name, p.type, st_distance(p.geo, pt.g), p.logo_path, p.cover_path,
         p.rating_avg, p.rating_count, p.avg_prep_minutes, public.is_open_now(p.id)
  from public.partners p, pt
  where p.status = 'active'
    and (p_type is null or p.type = p_type)
    and st_dwithin(p.geo, pt.g, p.delivery_radius_m)
  order by public.is_open_now(p.id) desc, st_distance(p.geo, pt.g) asc
  limit least(p_limit, 100);
$$;

-- Tarification de livraison selon la zone qui couvre l'adresse.
create or replace function public.delivery_quote(p_lat double precision, p_lng double precision)
returns table (zone_id uuid, zone_name text, delivery_fee integer, min_order integer, night_surcharge integer, rain_surcharge integer, guarantee_enabled boolean)
language sql stable set search_path = public, extensions as $$
  select z.id, z.name, z.delivery_fee, z.min_order, z.night_surcharge, z.rain_surcharge, z.guarantee_enabled
  from public.zones z
  where z.active and st_covers(z.geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
  order by z.sort
  limit 1;
$$;

-- Transitions autorisées par rôle. Les passages draft -> pending_payment -> paid sont réservés au service (webhook de paiement).
insert into public.order_transitions (from_status, to_status, role) values
  ('pending_payment', 'cancelled', 'client'),
  ('paid', 'accepted', 'partner'), ('paid', 'cancelled', 'partner'),
  ('accepted', 'preparing', 'partner'), ('accepted', 'cancelled', 'partner'),
  ('preparing', 'ready', 'partner'),
  ('courier_assigned', 'picked_up', 'courier'), ('picked_up', 'on_the_way', 'courier'),
  ('on_the_way', 'delivered', 'courier'), ('on_the_way', 'failed_delivery', 'courier'),
  ('paid', 'cancelled', 'zone_agent'), ('ready', 'courier_assigned', 'zone_agent'),
  ('picked_up', 'on_the_way', 'zone_agent'), ('on_the_way', 'failed_delivery', 'zone_agent'),
  ('delivered', 'refunded', 'zone_agent'), ('failed_delivery', 'refunded', 'zone_agent'),
  ('paid', 'accepted', 'admin'), ('accepted', 'preparing', 'admin'), ('preparing', 'ready', 'admin'),
  ('ready', 'courier_assigned', 'admin'), ('courier_assigned', 'picked_up', 'admin'),
  ('picked_up', 'on_the_way', 'admin'), ('on_the_way', 'delivered', 'admin'), ('on_the_way', 'failed_delivery', 'admin'),
  ('paid', 'cancelled', 'admin'), ('accepted', 'cancelled', 'admin'), ('delivered', 'refunded', 'admin'), ('failed_delivery', 'refunded', 'admin')
on conflict do nothing;

create or replace function public.transition_order(p_order uuid, p_to public.order_status, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  cur public.order_status;
  allowed boolean;
begin
  select status into cur from public.orders where id = p_order for update;
  if cur is null then
    raise exception 'order_not_found';
  end if;
  if not public.can_read_order(p_order) then
    raise exception 'forbidden';
  end if;
  select exists (
    select 1 from public.order_transitions t
    join public.user_roles ur on ur.role = t.role and ur.user_id = auth.uid()
    where t.from_status = cur and t.to_status = p_to
  ) into allowed;
  if not allowed then
    raise exception 'transition_not_allowed';
  end if;
  update public.orders set status = p_to where id = p_order;
  insert into public.order_status_history (order_id, status, changed_by, reason) values (p_order, p_to, auth.uid(), p_reason);
  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
    values (auth.uid(), 'order.transition', 'orders', p_order::text, jsonb_build_object('status', cur), jsonb_build_object('status', p_to));
end $$;

-- Vérification du code de remise sans jamais le renvoyer au livreur.
create or replace function public.confirm_handover(p_order uuid, p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  secret public.order_secrets;
begin
  if not exists (select 1 from public.deliveries d where d.order_id = p_order and d.courier_id = auth.uid()) and not public.is_staff() then
    raise exception 'forbidden';
  end if;
  select * into secret from public.order_secrets where order_id = p_order for update;
  if secret.order_id is null or secret.handover_attempts >= 5 then
    return false;
  end if;
  if secret.handover_code = p_code then
    perform public.transition_order(p_order, 'delivered', 'code_ok');
    return true;
  end if;
  update public.order_secrets set handover_attempts = handover_attempts + 1 where order_id = p_order;
  return false;
end $$;

-- Marque les ordonnances expirées et renvoie les chemins de fichiers à supprimer dans le stockage.
create or replace function public.expire_prescriptions() returns setof text
language sql security definer set search_path = public as $$
  update public.prescriptions set status = 'expired'
  where expires_at < now() and status <> 'expired'
  returning file_path;
$$;

-- Création automatique du profil et du rôle client à l'inscription.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  insert into public.user_roles (user_id, role) values (new.id, 'client');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Moyenne des avis par enseigne.
create or replace function public.refresh_partner_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  pid uuid := coalesce(new.partner_id, old.partner_id);
begin
  update public.partners p set
    rating_avg = (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.partner_id = pid and r.is_visible),
    rating_count = (select count(*) from public.reviews r where r.partner_id = pid and r.is_visible)
  where p.id = pid;
  return null;
end $$;

create trigger trg_reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_partner_rating();
```

### 0003_rls.sql

```sql
-- Sécurité au niveau des lignes : RLS activée sur toutes les tables, politiques minimales et explicites.

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Identité
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and status = 'active');
create policy roles_select on public.user_roles for select using (user_id = auth.uid() or public.has_role('admin'));
create policy roles_admin on public.user_roles for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- Géographie et catalogue publics en lecture
create policy zones_read on public.zones for select using (active or public.is_staff());
create policy zones_write on public.zones for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy neighborhoods_read on public.neighborhoods for select using (true);
create policy neighborhoods_write on public.neighborhoods for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy categories_read on public.categories for select using (true);
create policy categories_write on public.categories for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy addresses_owner on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy partners_read on public.partners for select using (status = 'active' or public.is_staff() or public.is_partner_member(id));
create policy partners_update on public.partners for update using (public.is_partner_member(id) or public.has_role('admin')) with check (public.is_partner_member(id) or public.has_role('admin'));
create policy partners_admin on public.partners for insert with check (public.has_role('admin'));
create policy members_read on public.partner_members for select using (user_id = auth.uid() or public.has_role('admin'));
create policy members_admin on public.partner_members for all using (public.has_role('admin')) with check (public.has_role('admin'));

create policy hours_read on public.partner_hours for select using (true);
create policy hours_write on public.partner_hours for all using (public.is_partner_member(partner_id) or public.has_role('admin')) with check (public.is_partner_member(partner_id) or public.has_role('admin'));
create policy closures_read on public.partner_closures for select using (true);
create policy closures_write on public.partner_closures for all using (public.is_partner_member(partner_id) or public.has_role('admin')) with check (public.is_partner_member(partner_id) or public.has_role('admin'));
create policy sections_read on public.menu_sections for select using (true);
create policy sections_write on public.menu_sections for all using (public.is_partner_member(partner_id) or public.has_role('admin')) with check (public.is_partner_member(partner_id) or public.has_role('admin'));
create policy products_read on public.products for select using (true);
create policy products_write on public.products for all using (public.is_partner_member(partner_id) or public.has_role('admin')) with check (public.is_partner_member(partner_id) or public.has_role('admin'));
create policy option_groups_read on public.option_groups for select using (true);
create policy option_groups_write on public.option_groups for all
  using (exists (select 1 from public.products p where p.id = product_id and (public.is_partner_member(p.partner_id) or public.has_role('admin'))))
  with check (exists (select 1 from public.products p where p.id = product_id and (public.is_partner_member(p.partner_id) or public.has_role('admin'))));
create policy options_read on public.options for select using (true);
create policy options_write on public.options for all
  using (exists (select 1 from public.option_groups g join public.products p on p.id = g.product_id where g.id = group_id and (public.is_partner_member(p.partner_id) or public.has_role('admin'))))
  with check (exists (select 1 from public.option_groups g join public.products p on p.id = g.product_id where g.id = group_id and (public.is_partner_member(p.partner_id) or public.has_role('admin'))));
create policy packs_read on public.packs for select using (active or public.is_staff());
create policy packs_write on public.packs for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy pack_items_read on public.pack_items for select using (true);
create policy pack_items_write on public.pack_items for all using (public.has_role('admin')) with check (public.has_role('admin'));
create policy media_read on public.media for select using (status = 'approved' or uploaded_by = auth.uid() or public.is_staff());
create policy media_insert on public.media for insert with check (uploaded_by = auth.uid() and rights_confirmed);
create policy media_moderate on public.media for update using (public.is_staff()) with check (public.is_staff());
create policy promotions_read on public.promotions for select using (active or public.is_staff());
create policy promotions_write on public.promotions for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- Commandes : lecture par les personnes concernées, écriture contrôlée
create policy orders_select on public.orders for select using (public.can_read_order(id));
create policy orders_insert on public.orders for insert with check (customer_id = auth.uid() and status = 'draft');
create policy orders_update_draft on public.orders for update using (customer_id = auth.uid() and status = 'draft') with check (customer_id = auth.uid() and status = 'draft');
create policy order_items_select on public.order_items for select using (public.can_read_order(order_id));
create policy order_items_write on public.order_items for all
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid() and o.status = 'draft'))
  with check (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid() and o.status = 'draft'));
create policy secrets_select on public.order_secrets for select using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy history_select on public.order_status_history for select using (public.can_read_order(order_id));
create policy transitions_read on public.order_transitions for select using (public.is_staff());
create policy payments_select on public.payments for select using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()) or public.is_staff());
create policy refunds_select on public.refunds for select using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()) or public.is_staff());
create policy payment_events_admin on public.payment_events for select using (public.has_role('admin'));
create policy deliveries_select on public.deliveries for select using (courier_id = auth.uid() or public.can_read_order(order_id));
create policy couriers_select on public.couriers for select using (user_id = auth.uid() or public.is_staff());
create policy couriers_self_update on public.couriers for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy errands_select on public.errands for select using (public.can_read_order(order_id));

-- Groupes
create policy groups_select on public.group_orders for select using (organizer_id = auth.uid() or public.is_staff() or exists (select 1 from public.group_members m where m.group_id = id and m.user_id = auth.uid()));
create policy groups_insert on public.group_orders for insert with check (organizer_id = auth.uid());
create policy groups_update on public.group_orders for update using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());
create policy group_members_select on public.group_members for select using (user_id = auth.uid() or exists (select 1 from public.group_orders g where g.id = group_id and g.organizer_id = auth.uid()) or public.is_staff());

-- Vocal, ordonnances, relation client
create policy voice_select on public.voice_requests for select using (user_id = auth.uid() or public.is_staff());
create policy voice_insert on public.voice_requests for insert with check (user_id = auth.uid());
create policy voice_validate on public.voice_requests for update using (public.is_staff()) with check (public.is_staff());
create policy prescriptions_select on public.prescriptions for select using (customer_id = auth.uid() or public.is_partner_member(partner_id) or public.has_role('admin'));
create policy prescriptions_insert on public.prescriptions for insert with check (customer_id = auth.uid());
create policy prescriptions_partner_update on public.prescriptions for update using (public.is_partner_member(partner_id)) with check (public.is_partner_member(partner_id));
create policy reviews_read on public.reviews for select using (is_visible or customer_id = auth.uid() or public.is_staff());
create policy reviews_insert on public.reviews for insert with check (customer_id = auth.uid() and exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid() and o.status = 'delivered'));
create policy loyalty_select on public.loyalty_ledger for select using (user_id = auth.uid() or public.is_staff());
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy push_owner on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tickets_select on public.support_tickets for select using (user_id = auth.uid() or public.is_staff());
create policy tickets_insert on public.support_tickets for insert with check (user_id = auth.uid());
create policy tickets_staff_update on public.support_tickets for update using (public.is_staff()) with check (public.is_staff());
create policy legal_select on public.legal_acceptances for select using (user_id = auth.uid());
create policy legal_insert on public.legal_acceptances for insert with check (user_id = auth.uid());
create policy audit_admin on public.audit_logs for select using (public.has_role('admin'));
create policy settings_admin on public.settings for all using (public.has_role('admin')) with check (public.has_role('admin'));
```

### Données de départ

`supabase/seed.sql` : 3 zones, quartiers, 6 catégories et 60 enseignes en statut prospect (restaurants et pharmacies de Douala issus de Google Maps le 5 novembre 2026, non vérifiés).


---

## Annexe I — Conformité, risques, journal des décisions


## A.1 Conformité juridique à faire valider

> Ces éléments ne constituent pas un avis juridique. Plusieurs informations viennent de la presse et peuvent avoir évolué : à confirmer avec un avocat ou l'administration compétente avant le lancement.

| Sujet | Point connu ou à vérifier | Action |
|---|---|---|
| Données personnelles | La loi camerounaise de décembre 2024 sur la protection des données est entrée en vigueur le 23 juin 2026 : consentement explicite, transparence, sécurité. Le transfert de données vers l'étranger est soumis à l'autorisation de l'autorité de protection des données. Sanctions élevées possibles | Avis d'un juriste spécialisé ; démarches de l'autorité avant le lancement ; minimiser les données |
| Hébergement | Supabase ne propose pas de région africaine d'après la liste consultée : base en Europe, migration prévue | Documenter le transfert ; prévoir la migration |
| Entreprise | SARL à immatriculer par le guichet unique (RCCM, NIU). Montants, capital et notaire à confirmer | Retour des questions posées au CFCE |
| Alcool | Autorisation de vente à emporter éventuellement requise ; mineurs interdits ; règles de publicité des plateformes | Vérifier auprès de la mairie ou d'un conseiller |
| Pharmacie | Depuis le 1er juillet 2024, ordonnance annoncée pour tous les médicaments, liste de produits sans ordonnance annoncée ultérieurement ; vente réservée aux pharmaciens | Confirmer le régime actuel avec l'Ordre des pharmaciens ; pharmacie partenaire obligatoire |
| Paiements | Encaissement Mobile Money par une société : agrégateur agréé, vérification de l'entreprise | Choisir l'agrégateur après évaluation |
| Documents du site | Mentions légales, politique de confidentialité, cookies et consentement, CGU, CGV, politique d'annulation et de remboursement, information sur les prix et frais, procédure de réclamation, droits des personnes (accès, rectification, effacement), durées de conservation, coordonnées du responsable | Rédaction puis validation par un juriste ; versionner chaque document |
| Livreurs | Statut, responsabilité, assurance, accord de non-contournement | Contrat simple validé par un juriste |

## A.2 Risques principaux

| Risque | Parade |
|---|---|
| Surcharge d'une seule personne sur le premier mois | Périmètre V1 resserré, V1.1 après validation ; associé ou responsable des opérations |
| Mise en service du paiement retardée par l'enregistrement de l'entreprise | Secours manuel et cash cadré, SARL en priorité |
| Transfert de données à l'étranger | Avis juridique, démarches, minimisation, migration prévue |
| Livreurs non rémunérés moins fiables | Prime symbolique, accord écrit, passage à une rémunération dès le volume |
| Qualité du vocal | Validation humaine, tests réels, repli sur le panier classique |
| Dépendance à WhatsApp | Liens wa.me en V1, canaux de secours, API plus tard |
| Contournement par restaurants et livreurs | Numéro masqué, fidélité sur la plateforme, accords écrits |
| Panne la nuit | Surveillance et alertes, sauvegardes testées, plan de repli manuel |
| Infrastructure gratuite en production | Mise en pause et absence de sauvegardes : passer aux plans payants avant le lancement |
| Un seul agent de nuit | Horaires limités au départ, fiche de procédures, formation, remplaçant désigné |

## A.3 Journal des décisions

| ID | Décision | Raison |
|---|---|---|
| D-01 | PWA Next.js + Supabase en TypeScript strict | Livrable prioritaire web, maîtrise de Supabase, rapidité |
| D-02 | Une seule application avec rôles | Un mois, une personne : pas quatre applications |
| D-03 | RLS sur toutes les tables | Les droits ne reposent jamais sur l'interface |
| D-04 | Paiement par agrégateur, aucune donnée de carte | Sécurité et conformité |
| D-05 | Base Supabase en Europe, migration prévue | Aucune région africaine disponible ; délai du premier mois |
| D-06 | Vocal : l'IA propose, un humain valide | Fiabilité avant automatisation |
| D-07 | Frais par zones | Simple, ajustable, base d'un futur calcul GPS |
| D-08 | Hors-ligne : panier sauvegardé et commande en file d'attente | Réseau variable à Douala |
| D-09 | Ordonnances supprimées à 30 jours | Données de santé : conservation minimale |
| D-10 | Cash après 3 commandes réussies, code de remise à chaque livraison | Réduire la fraude et les impayés |
| D-11 | Plafonds : courses 20 000 / 50 000 FCFA, remboursements 5 000 FCFA (20 000 par jour) | Limiter l'argent manipulé ; à ajuster après 50 commandes |
| D-12 | Un agent de zone de nuit valide les vocaux ; un agent répond au WhatsApp | Validation humaine du vocal en V1 |
| D-13 | Gratuit en test, plans payants en production | Pause et absence de sauvegardes sur l'offre gratuite ; usage commercial |
| D-14 | Style : Ciel + navigation Bulles + anneau Nuit néon | Cohérence, micro mis en avant ; à confirmer |

## A.4 Questions ouvertes

- Confirmation du style retenu par défaut (partie 4.5).
- Nom de la marque, domaines .com et .cm, comptes sociaux, enregistrement de la marque à l'OAPI.
- Choix de l'agrégateur de paiement après évaluation et délai de vérification de l'entreprise.
- Montants réels : frais par zone, minimums, plafond des courses, plafond de remboursement des agents.
- Liste des quartiers par zone et position exacte du local.
- Rémunération et accord écrit des livreurs.
- Partenaires : au moins 1 pharmacie, 2 restaurants de nuit et 1 dépôt confirmés.
- Avis juridique sur les données, l'alcool, les ordonnances et les CGV.
- Décision d'infrastructure de production (plans payants ou alternatives) avant le lancement.
- Recrutement, horaires et formation de l'agent de zone de nuit.

---

## Annexe J — Jetons de design (design/tokens.css)

```css
/* Jetons de design — thème jour par défaut, thème nuit automatique selon l'heure (classe .theme-night sur <html>). */
:root {
  --font-display: "Fraunces Variable", "Fraunces", "Iowan Old Style", Georgia, "Times New Roman", serif;
  --font-text: "Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  --color-bg: #f2f9ff;
  --color-surface: #ffffff;
  --color-surface-2: #e9f3fc;
  --color-text: #0b2540;
  --color-text-muted: #5b7894;
  --color-border: #d3e5f4;
  --color-primary: #0b84e0;
  --color-primary-contrast: #ffffff;
  --color-primary-soft: #ddf1ff;
  --color-primary-soft-text: #0a4f8a;
  --color-success: #1f6b4a;
  --color-success-soft: #e3f4ea;
  --color-warning: #6b4a00;
  --color-warning-soft: #fff1cc;
  --color-danger: #9a3a2a;
  --color-danger-soft: #ffe6e0;
  --color-offer: #c5341f;

  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-pill: 999px;

  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px;

  --text-xs: 0.75rem; --text-sm: 0.875rem; --text-md: 1rem; --text-lg: 1.125rem;
  --text-xl: 1.25rem; --text-2xl: 1.5rem; --text-3xl: 1.875rem; --text-4xl: 2.5rem;

  --duration-fast: 150ms; --duration-base: 220ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --focus-ring: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-primary);
}

.theme-night {
  --color-bg: #0a1628;
  --color-surface: #12233b;
  --color-surface-2: #16314f;
  --color-text: #eaf4ff;
  --color-text-muted: #8fb0cc;
  --color-border: #1f3752;
  --color-primary: #2fb0ff;
  --color-primary-contrast: #04213a;
  --color-primary-soft: #16314f;
  --color-primary-soft-text: #9ad8ff;
  --color-success: #8fe0b5;
  --color-success-soft: #123326;
  --color-warning: #ffd98a;
  --color-warning-soft: #3a2f10;
  --color-danger: #ffb4a4;
  --color-danger-soft: #3a1a14;
  --color-offer: #ff8a73;
}

html { font-family: var(--font-text); color: var(--color-text); background: var(--color-bg); font-size: 16px; -webkit-text-size-adjust: 100%; }
h1, h2, h3, .display { font-family: var(--font-display); font-weight: 600; letter-spacing: -0.01em; line-height: 1.15; }
.num { font-variant-numeric: tabular-nums lining-nums; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
```

