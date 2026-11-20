# Annexe A — Conformité, risques, décisions, questions

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
| Limite de Douala à confirmer par une source officielle avant le lancement | Action : GIRES confirme la limite auprès d’une source officielle avant le lancement. En attendant, géorepérage OSM indicatif et provisoire, tampon de 2,5 km, sans blocage des adresses manuelles ; attribution ODbL affichée. |

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
| D-15 | Le proxy rafraîchit la session sans lire `profiles` à chaque navigation | Réduire les requêtes ; le statut reste contrôlé par `requireRole` et `getRoleDestination` |
| D-16 | La saisie manuelle à Douala reste acceptée quelle que soit la position GPS ; le GPS utilise le polygone indicatif OSM avec un tampon de 2,5 km et un seuil de 50 km pour proposer l’écran de zone indisponible | Réduire les faux refus ; GIRES confirme la limite officielle avant le lancement |

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
