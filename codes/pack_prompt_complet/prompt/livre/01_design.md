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
- Livraison : en-tête `X-Powered-By` supprimé, cartes de sources non publiées (envoyées seulement à l'outil de suivi d'erreurs), aucune bibliothèque de développement dans le paquet de production, noms de fichiers et de variables en anglais cohérent avec le domaine (`partner`, `order`, `courier`), pas de fichiers `.cursor`, `.vscode` ou de dossiers d'assistant dans le dépôt de production.
- Contenu : les textes sont rédigés pour le public de Douala ; toute tournure traduite mot à mot est corrigée ; les deux langues sont relues.
