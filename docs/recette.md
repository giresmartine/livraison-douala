# Recette manuelle du site

À faire dans le projet Supabase de développement uniquement, après avoir suivi [le guide de lancement local](./guides/lancer-en-local.md). Les mots de passe sont dans `web/.dev-accounts.txt`. Les enseignes, produits et comptes sont fictifs.

Pour chaque ligne, coche le résultat observé. Si un résultat échoue, note le navigateur, la langue et la taille de l'écran.

| Fait | Écran | Action | Résultat attendu |
|---|---|---|---|
| [ ] | Accueil FR | Ouvrir `/fr` sans compte | Accueil client, « Douala Livraison » et données démo visibles ; aucun lien de galerie dans l'en-tête |
| [ ] | Accueil FR | Saisir un quartier libre et un repère | La saisie libre reste possible même sans suggestion |
| [ ] | Accueil FR | Autoriser le GPS dans Douala | La position est acceptée ; le quartier et le repère restent demandés |
| [ ] | Accueil FR | Tester une position en dehors de Douala | Le GPS est refusé pour la zone ; la saisie manuelle reste disponible |
| [ ] | Accueil FR | Cliquer « Mentions et crédits » | La page indique OpenStreetMap et la licence ODbL |
| [ ] | Accueil EN | Ouvrir `/en` et changer de langue | L'anglais s'affiche ; les mêmes fonctions et informations sont présentes |
| [ ] | Restaurants | Ouvrir la liste sans compte | 20 établissements fictifs sont visibles |
| [ ] | Pharmacies | Ouvrir la liste sans compte | 20 établissements fictifs sont visibles ; seuls des produits d'hygiène et de parapharmacie apparaissent |
| [ ] | Recherche | Rechercher le nom d'une enseigne puis un produit | Des résultats correspondants apparaissent |
| [ ] | Liste restaurants | Repérer `TEST - Démalou Grill` | L'établissement est signalé fermé et ne peut pas être commandé |
| [ ] | Liste restaurants | Ouvrir `TEST - Kambori Maison` | Le minimum de commande est visible |
| [ ] | Produit | Ajouter un article avec et sans option | Le total du panier évolue selon le prix affiché |
| [ ] | Panier | Essayer un panier sous le minimum de `TEST - Kambori Maison` | L'envoi est bloqué et le minimum restant est expliqué |
| [ ] | Pharmacie | Commander un article d'hygiène/parapharmacie | Le panier accepte l'article, sans médicament ni posologie |
| [ ] | Connexion | Ouvrir `/fr/connexion` sans session | Le formulaire de connexion s'affiche ; aucune donnée de compte n'est demandée avant validation |
| [ ] | Inscription | Créer un compte client de recette | Les champs et consentements requis sont visibles en français puis en anglais |
| [ ] | Connexion client | Utiliser le compte client de test | La session s'ouvre et le client accède à ses écrans |
| [ ] | Commande | Envoyer un panier valide | La commande est créée sans paiement ; les frais de livraison restent « à confirmer » |
| [ ] | Suivi client | Ouvrir le suivi d'une commande en attente | Les articles et l'adresse de la commande sont affichés au propriétaire |
| [ ] | Suivi devis | Faire fixer un montant par l'admin puis revenir au client | Le montant et l'échéance du devis sont affichés |
| [ ] | Suivi devis | Accepter un devis valide | L'action aboutit et la version/valeur acceptée est enregistrée |
| [ ] | Suivi devis | Refuser un devis | La commande est annulée avec le motif attendu |
| [ ] | Suivi devis | Laisser expirer un devis de 30 minutes | Après expiration, le devis ne peut plus être accepté |
| [ ] | Suivi commande | Faire annuler un devis par l'admin pour réémission | Le client voit « Nous préparons un nouveau devis » |
| [ ] | Suivi commande | Ne pas recevoir de devis pendant le délai configuré (120 min par défaut) | La commande est annulée et le client peut recommencer |
| [ ] | Compte client | Annuler une commande admissible | Le statut et le motif d'annulation sont compréhensibles |
| [ ] | File admin | Se connecter avec le compte admin | La file de devis s'affiche ; les lectures sensibles sont journalisées |
| [ ] | File admin | Fixer les frais avec une session fraîche | Le devis est envoyé et le compte à rebours de 30 min démarre à cet instant |
| [ ] | File admin | Attendre plus de 15 min puis tenter une action sensible | La re-vérification est demandée ; le montant saisi est conservé |
| [ ] | File admin | Annuler puis réémettre un devis | La version augmente, l'ancien devis reste dans l'historique et le client voit l'attente de remplacement |
| [ ] | File admin | Tenter une action sans MFA après activation MFA | L'action est refusée tant que la session n'est pas AAL2 |
| [ ] | Partenaire | Se connecter avec le compte partenaire de test | Seul l'établissement lié au compte est accessible ; données client non nécessaires masquées |
| [ ] | Livreur | Se connecter avec le compte livreur de test | Seules les courses qui lui sont affectées sont accessibles |
| [ ] | Suspension | Suspendre un compte avec un administrateur | Le compte suspendu ne peut plus effectuer d'action protégée ; l'audit est présent |
| [ ] | Galerie locale | En développement avec `NEXT_PUBLIC_SHOW_SCREEN_GALLERY=true`, ouvrir `/fr/ecrans` | La galerie et ses parcours s'affichent ; l'authentification des écrans protégés reste active |
| [ ] | Galerie production | En production, ouvrir `/fr/ecrans` | La page répond 404 |
| [ ] | Mobile | Répéter accueil, recherche et panier à 360 px | Aucun débordement horizontal ; commandes accessibles au toucher |
| [ ] | Bureau | Répéter les parcours principaux sur écran large | Le contenu reste lisible et aligné |
| [ ] | Thème | Tester thème jour puis nuit | Les textes, boutons, cartes et états restent lisibles |
| [ ] | Accessibilité | Naviguer au clavier sur connexion, panier et devis | Le focus est visible et l'ordre de tabulation est cohérent |

La vérification SQL et pgTAP est exécutée par GitHub Actions, pas sur cet ordinateur sans Docker. La CI doit être verte avant de considérer les migrations comme validées.

## Captures

Les captures vérifiables seront ajoutées dans `docs/captures/` après le premier démarrage sur le projet de développement. Aucune capture n'est incluse pour l'instant : l'URL et les clés Supabase ne sont pas encore configurées localement.
