# 3. APP FLOW — Parcours et navigation

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

