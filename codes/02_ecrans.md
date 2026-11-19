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
