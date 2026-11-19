# 4. UX/UI DESIGN BRIEF

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

