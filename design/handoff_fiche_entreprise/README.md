# Handoff — Recours France, fiche entreprise SEO-first

## Ce qu'est cette page

La **fiche entreprise publique** de Recours France : `recoursfrance.fr/entreprise/<slug>`. Une landing page SEO dynamique, générée par entreprise, qui répond à une seule intention de recherche :

> « J'ai un problème avec cette entreprise. Est-ce que d'autres consommateurs rencontrent la même chose, et que puis-je faire ? »

Requêtes cibles : `<entreprise> avis`, `<entreprise> problème`, `<entreprise> remboursement`, `<entreprise> remboursement refusé`, `<entreprise> litige`, `<entreprise> réclamation`, `<entreprise> commande non reçue`, `<entreprise> SAV`, `problème livraison <entreprise>`, `recours <entreprise>`.

Positionnement : **observatoire français des problèmes rencontrés par les consommateurs avec les entreprises.**

### Priorité de contenu, non négociable

```
problèmes → signalements → statistiques → démarches → informations entreprise
```

et **jamais** `SIREN → dirigeants → CA → données administratives`. Les données légales et financières sont reléguées après tout le contenu consommateur, et volontairement compactes : cette page n'est pas un annuaire d'entreprises.

### Ce que Recours France n'est pas (et que l'interface ne doit jamais laisser croire)

- ni un service de l'État, ni un tribunal, ni un cabinet d'avocats, ni un médiateur de la consommation ;
- la plateforme **ne transmet pas** les réclamations aux professionnels, **ne recueille pas** leurs réponses par un canal privé, **n'intervient pas** dans le règlement du litige ;
- elle ne constate pas une résolution : **c'est l'auteur du signalement qui la déclare** ;
- les démarches proposées sont des informations générales et des parcours prédéfinis, pas une consultation juridique personnalisée.

### Vocabulaire imposé

| Écrire | Ne jamais écrire |
| --- | --- |
| 184 signalements publiés | 184 litiges confirmés |
| Résolu selon le consommateur | Résolu / Litige résolu |
| Résolution déclarée par l'auteur le 17 août 2026 | Recours France a résolu le litige |
| Le consommateur indique / déclare / selon son signalement | L'entreprise a refusé / a fauté |
| Déclaration du consommateur, non vérifiée par Recours France | Témoignage vérifié |
| Réponse de l'entreprise — Entreprise vérifiée | Réponse officielle |

Toute formulation qui présenterait une déclaration d'utilisateur comme un fait établi est un défaut bloquant, pas un détail de copy.

## À propos du fichier de design

`Recours France - Fiche entreprise.dc.html` est une **référence de design réalisée en HTML** : un prototype qui montre l'apparence, la hiérarchie et le comportement attendus — **pas du code de production à copier tel quel**. Recréez l'écran dans l'environnement cible avec ses conventions.

Le fichier s'ouvre par double-clic dans un navigateur ; `support.js` doit rester à côté de lui. Les filtres, le tri et les deux états de la fiche sont réellement fonctionnels dans le prototype : manipulez-les avant de coder.

Stack recommandée si rien n'existe : **Next.js App Router + TypeScript, rendu serveur**. Le contenu principal (signalements, statistiques, texte éditorial) doit être présent dans le HTML initial, sans JavaScript : c'est une exigence SEO, pas une préférence.

## Fidélité

**Haute fidélité.** Couleurs, typographie, espacements et hiérarchie sont définitifs. Le copy français est validé : le reprendre **verbatim**, avertissements et mentions de portée compris. Les paragraphes éditoriaux du prototype sont des gabarits rédactionnels réels — ils indiquent le ton, la longueur et le niveau de précision attendus par entreprise.

**L'entreprise du prototype est fictive** (Prixnet SA, SIREN 784 512 306, Bordeaux) et tous les signalements, montants, dates et chiffres financiers sont inventés. C'est volontaire : attribuer des signalements fictifs à une entreprise réelle expose à un risque de dénigrement. Ne reprenez aucune de ces valeurs en production.

## Système de design

### Couleurs

| Rôle | Hex |
| --- | --- |
| Bleu institutionnel — titres, liens, action principale, filets forts | `#1B3FA0` |
| Bleu profond — bandeaux, CTA final, survol du bouton | `#12256B` |
| Bleu clair — badges de catégorie, pastilles, fonds d'accent | `#E7EEFF` |
| Bleu de survol des liens | `#2E5FE0` |
| Fond page | `#FFFFFF` |
| Fond de section alterné | `#F8FAFD` |
| Fond de la zone de démonstration mobile | `#EEF1F7` |
| Bordure de bloc | `#D7DCE5` |
| Filet neutre | `#E4E9F2` |
| Filet de ligne interne | `#EEF1F7` |
| Texte principal | `#14161C` |
| Texte secondaire | `#4A515F` |
| Texte tertiaire, sources, mentions | `#5F6673` |
| Vert — résolu selon le consommateur | `#1B7A4B` sur `#EDF6F0`, bordure `#BFE0CD` |
| Ambre — problème en cours | `#8A5200` sur `#FBF3E8` |
| Rouge — réservé aux alertes réelles | `#A32A22` sur `#FBEEEC` |
| Neutre — badge secondaire, filtre inactif | `#4A515F` sur `#F2F4F8` |
| Barres et graphiques | `#1B3FA0`, `#4A72D8`, `#94AAE6` |
| Sur fond bleu — texte / atténué | `#DDE7FF` / `#B9CCFF` |
| Filet de citation du consommateur | `#C6D2EA` (3 px, à gauche) |

Règles : **aucun arrondi** (`border-radius: 0`), aucune ombre portée, aucun dégradé, aucune illustration décorative. Le vert n'apparaît que pour une résolution déclarée, l'ambre que pour un problème en cours. Pas d'étoiles, pas de note globale, pas de gamification.

### Typographie

- Famille : **Public Sans** (Google Fonts), graisses 400/500/600/700, fallback `"Helvetica Neue", Helvetica, Arial, sans-serif`. En production, auto-hébergez la police avec `font-display: swap` (LCP).
- H1 unique : 38 px, 700, `letter-spacing: -0.032em`, `line-height: 1.14`, `text-wrap: pretty`.
- H2 de section : 27 px, 700, `-0.022em`. H2 secondaire (maillage, guides, entreprise) : 21–23 px.
- H3 de signalement : 20 px, 700, `-0.015em`, `line-height: 1.32` — c'est le porteur de longue traîne.
- H3 éditorial : 20 px, 700. H4 (réponse d'entreprise) : 15 px, 700.
- Corps éditorial : **15,5 px**, `line-height: 1.75`, `max-width: 820px`. Corps courant : 14,5–15 px, `line-height: 1.65–1.7`.
- Chiffres clés : 34 px (compteur principal), 25 px (parts), 19 px (mobile), 700, `font-variant-numeric: tabular-nums`.
- Badges : 11,5 px, 700. Mentions de portée et sources : 11,5–12,5 px.
- Liens : soulignés, `text-underline-offset: 3px`.

### Grille et rythme

- Conteneur : `max-width: 1200px; margin: 0 auto; padding: 0 32px`.
- Hero : `minmax(0,1fr) minmax(290px,340px)`, `gap: 48px` — texte à gauche, panneau de statistiques à droite.
- Éditorial : `minmax(0,1fr) minmax(270px,330px)`, `gap: 48px` — prose à gauche, encarts pratiques à droite.
- Listes en deux colonnes : `repeat(auto-fit, minmax(min(100%,340px),1fr))`, `gap: 0 40px`. La forme `min(100%, …)` évite les colonnes fantômes.
- Sections ouvertes par un filet `1px solid #1B3FA0`, lignes séparées par `1px solid #EEF1F7`. Les signalements et les filtres sont dans un bloc encadré `1px solid #D7DCE5`.
- `min-width: 0` sur tout enfant de grille contenant du texte long.

## Structure de la page, dans l'ordre

1. **Bandeau d'indépendance** (`#12256B`, 12 px) : « Recours France est une plateforme indépendante. Ni un service de l'État, ni un tribunal, ni un avocat, ni un médiateur de la consommation. » La mention « Maquette — entreprise et signalements fictifs » est à retirer en production.
2. **En-tête de site** : logotype (carré 38 px `#1B3FA0`, monogramme « RF ») + nom + baseline « Observatoire des problèmes consommateurs » ; **champ de recherche d'entreprise** ; liens « Vos droits », « Comment ça marche » ; bouton « Signaler un problème ».
3. **Breadcrumb** (`#F8FAFD`) : Accueil › Entreprises › Commerce en ligne › `<Entreprise>`. À exposer en `BreadcrumbList`.
4. **Hero** — colonne gauche : logo 58 px, raison sociale, secteur et ville, badge « Fiche non revendiquée » (ou « Fiche revendiquée » si elle l'est), **H1 unique**, sous-titre couvrant remboursement / livraison / retour / SAV / marketplace, CTA principal « Signaler un problème avec `<Entreprise>` », CTA secondaire « Voir les signalements », mention « Publication gratuite · quelques minutes ». Colonne droite : compteur **184 signalements publiés** en blanc sur `#1B3FA0` avec « 12 derniers mois · dont 41 signalés résolus », puis les 4 motifs principaux cliquables, puis l'avertissement de portée.
5. **Sommaire sticky** (`position: sticky; top: 0`) : 7 ancres + « Signaler mon problème → » à droite.
6. **Quel problème rencontrez-vous avec `<Entreprise>` ?** — 9 catégories en liste deux colonnes, chacune un lien avec son compteur. Pas de grandes cartes.
7. **Problèmes les plus signalés** — 5 barres horizontales de 10 px (libellé cliquable, `N signalements — X %`) + avertissement de portée ; colonne latérale « Ce que signalent les consommateurs » (3 parts en pourcentage, nombre de signalements résolus).
8. **Signalements concernant `<Entreprise>`** — le cœur de la page. Bloc encadré : barre de filtres **catégorie** (7), barre de filtres **statut** (4) + **tri** (Plus récents / Plus consultés / Problèmes similaires), ligne de résultats, puis les signalements, puis « Voir les 184 signalements » et « Les signalements sont publiés après modération. »
9. **CTA intermédiaire** — bloc `#E7EEFF` bordé bleu : « Vous rencontrez une situation similaire ? » + « Signaler mon problème ».
10. **Que faire en cas de problème avec `<Entreprise>` ?** — 7 H3 éditoriaux : contacter pour une réclamation, remboursement non reçu, commande non reçue, vendeur Marketplace, SAV et garantie, médiateur compétent (encadré avec 4 lignes + date de vérification), SignalConso. Colonne latérale : « L'ordre des démarches » (5 étapes numérotées), « Contacter `<Entreprise>` » (5 lignes), « Sources et vérification ».
11. **Évolution des signalements** — histogramme 12 mois, hauteur 190 px, les 3 derniers mois en bleu franc, axe ouvert par un filet bleu, avertissement de portée sous le graphique (« une hausse peut refléter la notoriété de la plateforme autant qu'une évolution réelle »).
12. **Problèmes fréquents avec `<Entreprise>`** (maillage interne, 5 liens avec compteurs) et **Guides pouvant vous aider** (6 liens), côte à côte.
13. **Informations sur `<Entreprise>`** (`#F8FAFD`) : 10 lignes légales en deux colonnes, puis **Informations financières** (4 lignes + « Voir les informations détaillées ») et **Événements récents** (4 lignes datées et sourcées), puis **Autres entreprises consultées** (5 puces discrètes).
14. **Vous représentez `<Entreprise>` ?** — revendication de fiche, mention explicite que la revendication est gratuite et **ne permet pas de supprimer un signalement**. À côté : **Comment fonctionne Recours France ?** en 4 étapes + politique de modération.
15. **Avertissement** — encadré `#F8FAFD` à filet gauche `#12256B` : indépendance, et « Un signalement ne signifie pas qu'un manquement de l'entreprise a été juridiquement établi. »
16. **Questions fréquentes concernant `<Entreprise>`** — 8 Q/R, **réponses toujours visibles** (deux colonnes, jamais repliées).
17. **CTA final** (`#12256B`) : « Vous avez rencontré un problème avec `<Entreprise>` ? », bouton blanc « Signaler mon problème », lien « Consulter les signalements », mention « Publication gratuite ».
18. **Footer** — 4 colonnes (Recours France, Consommateurs, Entreprises, Informations) + « Recours France est une plateforme indépendante et n'est pas un service public. » + date de dernière vérification.
19. **Zone de démonstration mobile** (`#EEF1F7`) — hors page réelle : deux maquettes 390 px, présentes uniquement dans le prototype pour documenter le mobile. À ne pas porter en production.

## Anatomie d'un signalement

De haut en bas :

1. **Badges** : catégorie (`#E7EEFF`/`#1B3FA0`), statut (ambre « Problème en cours » ou vert « Résolu selon le consommateur »), et « Réponse de l'entreprise » (neutre) si elle existe.
2. **H3 titre** — formulé en langage de recherche : « Remboursement `<Entreprise>` non reçu après retour d'un téléphone ». Le titre est le levier longue traîne : il doit contenir le nom de l'entreprise, le motif et la situation. Lien vers la page de détail du signalement.
3. **Méta en ligne** : montant concerné, date de commande, date de publication.
4. **Déclaration** dans un **filet gauche `3px solid #C6D2EA`**, corps 15 px / 1,7, suivie de « Déclaration du consommateur, publiée le … Non vérifiée par Recours France. »
5. **Encart de résolution** (si déclarée) : fond vert clair, « Résolution déclarée par l'auteur le … Recours France n'est pas intervenu dans ce dossier. »
6. **Réponse de l'entreprise** (si elle existe) : bloc `#F8FAFD` bordé, **filet gauche `3px solid #1B3FA0`**, H4 « Réponse de `<Entreprise>` », badge bleu plein « Entreprise vérifiée », date, texte. Jamais fondue avec la déclaration du consommateur.
7. **Pied** : « Lire le signalement », « N personnes indiquent avoir rencontré une situation similaire », bouton bordé « J'ai le même problème ».

Trois provenances, trois traitements visuels distincts : **consommateur** (filet gris-bleu), **entreprise** (filet bleu + badge plein), **Recours France** (texte gris de mention, jamais dans un bloc de témoignage).

## Interactions

| Élément | Comportement |
| --- | --- |
| Filtres catégorie (7) | filtre réel ; l'actif est bleu plein |
| Filtres statut (4) | Tous / Problème en cours / Résolu selon le consommateur / Réponse de l'entreprise ; se combinent avec la catégorie |
| Tri (3) | Plus récents (défaut) / Plus consultés / Problèmes similaires ; l'actif est souligné et en gras |
| Ligne de résultats | « N signalements affichés sur 184 — tri : … » ; se met à jour à chaque changement |
| Sommaire sticky | ancres internes vers les 7 sections |
| Motifs du hero, catégories, maillage | liens internes crawlables |
| FAQ | **jamais** d'accordéon, réponses toujours dans le HTML |
| Prop `hasReports` | bascule le hero entre l'état A (statistiques) et l'état B (« Aucun signalement publié pour le moment ») |
| Prop `showCompanyReply` | affiche ou masque la réponse d'entreprise sous le signalement concerné |

En production : filtres et tri **en paramètres d'URL** (`?motif=remboursement&statut=en-cours&tri=recents`) rendus côté serveur, `rel="canonical"` vers l'URL sans paramètres, et les combinaisons pauvres en `noindex,follow`. Les filtres doivent fonctionner sans JavaScript (liens ou formulaire `GET`).

À implémenter en plus du design : pagination des signalements (`/entreprise/<slug>/signalements?page=2`), états de chargement, absence de résultats après filtrage (« Aucun signalement ne correspond à ces filtres » + réinitialisation), erreur de synchronisation d'une source publique.

## Les deux états de la fiche

### État A — entreprise avec signalements

Hero avec compteur et motifs, statistiques, barres, signalements, évolution, maillage. Page riche, indexable.

### État B — entreprise sans signalement

Le panneau du hero devient : **« Aucun signalement publié pour le moment »**, « Aucun consommateur n'a encore publié de signalement concernant `<Entreprise>` sur Recours France. », bouton **« Signaler le premier problème »**, et la note que les informations pratiques restent disponibles.

**Tout le reste de la page subsiste** : catégories (sans compteurs), contacts de réclamation, démarches remboursement / livraison / SAV / marketplace, médiateur, SignalConso, informations légales, FAQ, guides. Les sections purement statistiques (barres, parts, évolution) sont masquées, pas remplies de zéros.

**Ne jamais générer de faux signalement pour étoffer une fiche.**

## Règle d'indexation

L'indexation ne dépend pas du nombre de signalements mais de **l'utilité réelle de la page**.

| Cas | Décision |
| --- | --- |
| Entreprise notoire, 0 signalement, mais contacts de réclamation, médiateur identifié, démarches spécifiques et informations légales complètes | **indexable** |
| Entreprise avec signalements et contenu éditorial spécifique | **indexable** |
| Fiche réduite à nom + SIREN + adresse + 0 signalement | **`noindex, follow`** jusqu'à enrichissement |

Critère opérationnel suggéré : indexable si la page contient au moins un signalement publié **ou** au moins trois blocs pratiques spécifiques à l'entreprise (contact de réclamation, médiateur identifié, procédure de remboursement ou de SAV documentée). À réévaluer à chaque régénération. Le système ne doit jamais être conçu autour de millions de pages remplies automatiquement.

## SEO technique (à câbler, jamais affiché)

- **Un seul H1** par page. Hiérarchie H2 → H3 sans saut de niveau. Les titres de signalements sont des H3 dans la section H2 « Signalements ».
- `title` : `<Entreprise> : avis, problèmes, remboursements et litiges | Recours France`.
- `meta description` construite à partir des données réelles (volume de signalements, trois motifs dominants).
- URL : `/entreprise/<slug>`. Sous-pages futures : `/entreprise/<slug>/remboursement`, `/livraison`, `/sav`, `/retour`, `/marketplace` — **créées et indexées seulement** quand elles disposent de contenu propre suffisant.
- Données structurées, uniquement pour ce qui est réellement affiché : `BreadcrumbList`, `Organization` (l'éditeur Recours France), `FAQPage` sur la FAQ visible, `ItemList` pour la liste de signalements. **Pas de `Review` ni `AggregateRating`** : ce ne sont pas des avis notés, et le balisage serait trompeur.
- `canonical`, Open Graph et Twitter Card ; image OG générée côté serveur, en texte, sans logo d'entreprise tiers.
- Sitemap segmenté, ne listant que les fiches indexables.
- Core Web Vitals : rendu serveur, police auto-hébergée, aucun carrousel, aucune animation lourde, histogramme en HTML/CSS (pas de librairie de graphiques), images légères et dimensionnées. Le contenu principal ne dépend pas de JavaScript.

## Version mobile

Le prototype contient deux maquettes 390 px, à traiter comme la spécification mobile :

- en-tête compact (logo + burger), breadcrumb sur une ligne ;
- identité entreprise puis H1 immédiatement ;
- compteur pleine largeur sur fond bleu, puis les 4 motifs en grille 2 × 2 ;
- catégories en liste tactile (hauteur ≥ 44 px), chevron à droite ;
- filtres de signalements en rangée scrollable horizontale ;
- signalements pleine largeur, badges au-dessus du titre, déclaration en filet gauche ;
- éditorial en paragraphes courts suivis d'une liste de liens vers chaque démarche ;
- **CTA « Signaler mon problème » fixe en bas d'écran**, avec réserve de 76 px sous le contenu ;
- l'état B mobile conserve la liste « Informations utiles disponibles » (7 liens).

## Modèle de données

```
Entreprise        slug, denomination, raison_sociale, secteur, ville, pays, logo,
                  siren, siret_siege, forme_juridique, adresse_siege, date_creation,
                  naf, activite, site_officiel, tranche_effectif,
                  revendiquee (bool), maj_sources{sirene, rne, bodacc}, verifie_le
Contact           entreprise_id, type('service_client'|'reclamation_ecrite'|'site'|
                  'marketplace'|'delai_annonce'), valeur, source, verifie_le
Mediateur         entreprise_id, nom, adhesion_declaree, cout, condition_prealable,
                  source, verifie_le
Categorie         cle, libelle, slug            // 9 catégories fixes
Signalement       id, entreprise_id, categorie, titre, texte, montant, date_commande,
                  date_publication, statut, resolu_declare_le, vues, similaires,
                  moderation('en_attente'|'publie'|'refuse')
ReponseEntreprise signalement_id, texte, date_publication, auteur_verifie
Statistiques      entreprise_id, periode, total, par_categorie{}, resolus_declares,
                  serie_mensuelle[12], calcule_le
Guide             slug, titre                    // transversal, non lié à l'entreprise
Faq               entreprise_id, question, reponse, ordre
Evenement         entreprise_id, date, source('SIRENE'|'RNE'|'BODACC'), titre
Comptes           entreprise_id, exercice, ca, resultat_net, effectif, depose_le
```

Statuts de signalement : `en_cours`, `resolu_declare`. Le statut « Réponse de l'entreprise » n'est pas un statut mais la présence d'une `ReponseEntreprise` — d'où un filtre distinct.

## Règles métier

1. Un signalement n'est publié qu'après **modération** : retrait des propos injurieux, des accusations pénales, des données personnelles de tiers, des contenus hors sujet.
2. Une résolution n'est enregistrée que si **l'auteur** la déclare. Aucun statut n'est déduit du silence, de l'inactivité ou d'une réponse d'entreprise.
3. Les statistiques ne portent que sur les **signalements publiés** et sont systématiquement accompagnées de leur avertissement de portée.
4. La revendication de fiche est **gratuite** et n'ouvre aucun droit de suppression. Seuls les contenus contraires à la politique de modération sont retirés, sur examen, quelle que soit la partie qui le demande.
5. Une réponse d'entreprise est publiée sous le signalement concerné, identifiée « Entreprise vérifiée », et n'altère ni le statut ni le texte du signalement.
6. Chaque information pratique porte sa **source** et sa **date de vérification**.
7. Aucun contenu ne doit être généré automatiquement pour donner du volume à une fiche.

## Sources publiques

| Source | Usage | Fréquence |
| --- | --- | --- |
| API Sirene (Insee) | identité, activité, établissements, effectif, état administratif | quotidienne |
| API RNE (INPI) | forme juridique, dirigeants, actes déposés | quotidienne |
| BODACC (données ouvertes) | comptes annuels, procédures collectives | quotidienne |
| Liste publique des médiateurs de la consommation | médiateur compétent | mensuelle |
| SignalConso | information et lien sortant vers le service officiel | statique |

Aucun logo d'organisme public n'est repris : la provenance est indiquée en texte.

## Contraintes juridiques

- **Aucun élément du Système de Design de l'État** : ni police Marianne, ni bloc-marque, ni drapeau, ni logo d'organisme public. La page reprend des schémas d'organisation courants des interfaces administratives françaises avec une charte propre.
- Le bandeau d'indépendance, l'encadré d'avertissement et la mention de pied de page doivent rester visibles.
- Diffamation et dénigrement : les signalements sont des déclarations d'auteurs, présentées comme telles, sur des faits précis et modérés. Prévoir un canal de contestation pour l'entreprise et une procédure de retrait documentée.
- Droit de réponse effectif : l'entreprise doit pouvoir répondre publiquement, gratuitement, sans conditionnement commercial.
- Pages à prévoir : mentions légales, CGU, politique de confidentialité (RGPD : accès, rectification, suppression), politique de modération, méthodologie publique, page « Notre indépendance ».
- Accessibilité RGAA : contrastes conformes (blanc sur `#1B3FA0` ≈ 8,3:1), navigation clavier complète sur les filtres, `aria-current` sur le filtre actif, cibles ≥ 44 px.
- Retirer la mention « Maquette — entreprise et signalements fictifs » et la zone de démonstration mobile en production.

## Assets

Aucune image : la page est entièrement typographique. Le logotype Recours France est un carré `#1B3FA0` portant le monogramme « RF ». Le logo d'entreprise est un carré `#E7EEFF` bordé portant ses initiales, en attente d'un vrai visuel — vérifiez les droits avant d'afficher un logo tiers. Les icônes sont des glyphes (`›`, `→`, `☰`) remplaçables par le jeu du codebase.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `Recours France - Fiche entreprise.dc.html` | la maquette de référence (états A et B, mobile inclus) |
| `support.js` | runtime nécessaire pour l'ouvrir dans un navigateur |
