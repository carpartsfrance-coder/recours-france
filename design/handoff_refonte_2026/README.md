# Handoff — Recours France : fiche entreprise + tunnel de signalement

## Overview

Deux livrables pour la plateforme Recours France (annuaire public de litiges de consommation) :

1. **Fiche entreprise** — refonte UI/UX complète de la page publique d'une entreprise (exemple : JK AUTO, garage à Fos-sur-Mer, SIREN 817 383 383). Page existante : `https://recours-france.onrender.com/entreprises/jk-auto-817383383`.
2. **Tunnel de signalement** — le parcours en deux étapes qui s'ouvre au clic sur le CTA principal de la fiche, plus l'écran de réussite.

Objectif produit : un consommateur en litige doit comprendre en moins de cinq secondes qu'il peut rendre son problème visible publiquement, obtenir une réclamation écrite et connaître ses prochaines démarches, gratuitement — puis publier en moins de 90 secondes.

Contraintes légales/éditoriales à respecter impérativement dans l'implémentation :

- Recours France est une **plateforme privée indépendante, sans lien avec l'État**. Ne jamais laisser croire à un service public.
- Ne **jamais** promettre que la plateforme transmet la réclamation à l'entreprise, oblige l'entreprise à répondre, ou résout le litige.
- Ne **jamais** accuser l'entreprise d'une infraction.
- Aucun faux avis, faux chiffre ou faux signalement. Quand il n'y a rien à afficher, afficher un état vide honnête.
- Formulation imposée pour le bandeau d'indépendance : « Plateforme privée et indépendante d'aide aux litiges de consommation — sans lien avec l'État. »

## About the Design Files

Les fichiers de `design/` sont des **références de design écrites en HTML** : des prototypes qui montrent l'apparence et le comportement attendus. Ce **ne sont pas** des fichiers à copier tels quels en production.

Le travail consiste à **recréer ces designs dans l'environnement existant du codebase cible** (le site actuel est un Next.js / React) en utilisant ses conventions, sa librairie de composants et son système de styles. S'il n'existe pas encore d'environnement, choisir le framework le plus adapté et y implémenter les designs.

Détail technique sur le format : chaque `.dc.html` est un composant autonome dont le markup est du HTML quasi standard (styles **inline**, contrôles de flux `<sc-for>` / `<sc-if>`, trous `{{ valeur }}`) et dont la logique est une classe JavaScript type composant React (`state`, `setState`, `renderVals()` qui renvoie les valeurs injectées dans le markup). La traduction vers React/JSX est directe : `renderVals()` → le corps du composant, `<sc-if value="x">` → `{x && …}`, `<sc-for list="a" as="i">` → `a.map(i => …)`, `style-hover="…"` → une pseudo-classe CSS `:hover`. `support.js` est uniquement le runtime du prototype : **ne pas le porter**.

## Fidelity

**High-fidelity.** Couleurs, typographie, espacements, états et copie sont définitifs et repris tels quels ci-dessous. La copie française est validée : la reprendre au mot près.

Le comportement est réel dans les prototypes (accordéons, sélections, gating du bouton de publication) — les prototypes sont cliquables, ouvrir les fichiers `- desktop et mobile.dc.html` pour voir les deux largeurs côte à côte.

---

## Design tokens

### Couleurs

| Rôle | Hex |
|---|---|
| Bleu institutionnel (titres, bandeau, footer haut) | `#0E2A56` |
| Bleu d'action (boutons, liens, accents) | `#14448C` |
| Bleu d'action — hover | `#0F3572` |
| Bleu très clair (fonds d'aide, encadrés, hero) | `#EEF3FA` |
| Bleu hero / fonds de section alternés | `#F4F7FC` |
| Gris de section | `#F7F9FC` |
| Bordure bleutée (cartes cliquables, inputs) | `#C4D6EE` |
| Bordure bleu clair (blocs d'aide) | `#CFDFF3` |
| Bordure neutre (cartes, séparateurs forts) | `#DDE3EC` |
| Séparateur léger | `#EEF1F6` / `#E4E9F1` |
| Texte principal | `#253046` |
| Texte secondaire fort | `#3C4759` |
| Texte secondaire | `#5A6579` |
| Texte tertiaire / mentions | `#5F6B7F` |
| Texte désactivé / inactif | `#6B7688` |
| Placeholder de champ | `#707B8C` |
| Beige d'accompagnement (fond) | `#F8F5EF` |
| Beige d'accompagnement (bordure) | `#E7E0D2` |
| Beige d'accompagnement (texte) | `#5C5232`, liens `#6E5F30`, icônes `#8A7A55` |
| Rouge (accent, compteur « sans résolution ») | `#C1121F` |
| Rouge d'alerte (fond / bordure / texte) | `#FFF6F6` / `#F0D2D4` / `#8A3A3F` |
| Vert (résolu, succès) | `#1F7A4C`, texte `#1B5E3A`, fond `#F1F8F3`, bordure `#CBE3D3` |
| Footer (fond / texte / texte faible / séparateur) | `#0A1F42` / `#A9BDD8` / `#93A8C6` / `#1C3760` |
| Bandeau d'indépendance (fond / texte / icône) | `#0E2A56` / `#C7D6EC` / `#8FB2E0` |

Aucun dégradé. Aucune ombre portée sauf : `0 1px 3px rgba(14,42,86,.05)` sur la nav collante et `0 -2px 10px rgba(14,42,86,.08)` sur la barre CTA mobile.

### Typographie

Public Sans (Google Fonts), graisses 400/500/600/700/800. Fallback : `'Helvetica Neue', Helvetica, Arial, sans-serif`.

| Usage | Taille | Graisse | Interlignage | Autre |
|---|---|---|---|---|
| H1 fiche | `clamp(26px, 2.4cqw + 10px, 42px)` | 800 | 1.14 | `letter-spacing:-0.017em`, `max-width:16ch` |
| H1 tunnel | `clamp(23px, 1.7cqw + 9px, 30px)` | 800 | 1.2 | `letter-spacing:-0.015em` |
| H2 de section | `clamp(19px, 1.5cqw + 7px, 26px)` | 800 | 1.22 | `letter-spacing:-0.012em` |
| H2 de bloc / carte | 17px | 700 | 1.3 | |
| Intro hero | `clamp(15.5px, .6cqw + 9px, 17.5px)` | 400 | 1.55 | `max-width:52ch` |
| Corps | 15.5px | 400 | 1.6 | |
| Titre de carte | 16px | 700 | 1.3 | |
| Libellé de bouton principal | 16–16.5px | 700 | | |
| Libellé de bouton secondaire | 14.5–15.5px | 600 | | |
| Texte informatif secondaire | 14px | 400 | 1.45 | **plancher : jamais sous 14px** |
| Mentions juridiques | 13.5px | 400 | 1.5 | couleur `#5F6B7F` minimum |
| Micro-libellé majuscule (chips, eyebrows) | 12.5px | 700 | | `letter-spacing:.05em`, `text-transform:uppercase` |

Les tailles fluides utilisent des **unités de conteneur** (`cqw`) : la racine de chaque page porte `container-type:inline-size`, ce qui permet au même composant de se remettre en page dans un cadre de 390 px sans media query. À réimplémenter soit en container queries, soit en media queries classiques (breakpoints utiles : ~760 px et ~480 px).

### Espacements, rayons, cibles

- Rythme vertical de section : `padding: clamp(34px, 3.6cqw, 58px) 0`.
- Conteneur de page : `max-width:1160px`, gouttière `clamp(16px, 2.2cqw, 28px)`. Tunnel : `max-width:820px`, gouttière `clamp(16px, 2.4cqw, 28px)`.
- Rayons : **3px** (boutons, inputs, chips), **4px** (cartes et blocs). Rien de plus arrondi.
- Bordures : **1px** partout.
- Hauteurs de cible : CTA principal 52–54px, boutons secondaires 46–50px, **tout élément cliquable ≥ 44px** (y compris les liens de listes du footer et du fil d'ariane, qui portent `min-height:44px` avec `display:flex`).
- Aucun débordement horizontal autorisé : la racine porte `overflow-x:hidden` et chaque groupe de boutons est `flex-wrap:wrap` avec `flex:0 1 auto; min-width:0`.

### États

- **Carte cliquable** — repos : fond `#fff`, bordure `#DDE3EC`. Hover : bordure `#14448C`, fond `#F7FAFE`, `transform:translateY(-1px)`, transition `border-color .12s, background .12s, transform .12s`. Focus : `outline:2px solid #14448C; outline-offset:2px`.
- **Chip / option** — repos : bordure `#C4D6EE`, texte `#0E2A56`, graisse 600. Sélectionné : fond et bordure `#14448C`, texte `#fff`, graisse 700, pastille de coche blanche à gauche.
- **Bouton primaire** — `#14448C` / bordure identique / texte blanc, hover `#0F3572`.
- **Bouton secondaire** — fond blanc, bordure `#B9CDEA`, texte `#14448C`, hover fond `#EEF3FA` bordure `#14448C`.
- **Bouton désactivé** — fond `#E7EBF2`, bordure `#DDE3EC`, texte `#6B7688`, `cursor:not-allowed`.
- **Onglet de nav collante** — `border-bottom:2px solid transparent`, hover bordure `#B9CDEA` et texte `#14448C`.

---

## Écran 1 — Fiche entreprise

Fichier : `design/Fiche JK AUTO.dc.html`. Vue comparée : `design/Fiche JK AUTO - desktop et mobile.dc.html`.

### Ordre des sections (impératif)

1. Bandeau d'indépendance (pleine largeur, `#0E2A56`)
2. Header (logo, nav, pas de CTA en compact)
3. Fil d'ariane (scroll horizontal, `#F7F9FC`)
4. Hero + encadré « Ce que vous obtenez »
5. Nav de sections **collante** (`position:sticky; top:0; z-index:30`), scroll horizontal
6. `#probleme` — Quel problème rencontrez-vous ?
7. `#signalements` — Signalements publics
8. `#demarches` — Votre plan d'action
9. `#contact` — Coordonnées et médiateur
10. `#informations` — Informations légales et financières
11. `#entreprise` — Vous représentez JK AUTO ?
12. `#faq` — Méthodologie, indépendance et FAQ (+ guides et entreprises comparables en accordéons)
13. Bandeau CTA final (desktop uniquement)
14. Footer
15. Barre CTA collante en bas (mobile uniquement)

**Ancrages :** chaque section porte `scroll-margin-top:70px` pour ne pas être masquée par la nav collante. `html { scroll-behavior: smooth }`.

### Hero

Fond `#F4F7FC`, bordure basse `#E1E8F3`. Deux colonnes en `flex-wrap:wrap` : gauche `flex:1 1 460px`, droite `flex:1 1 300px`, gap `clamp(24px,3cqw,48px)`. En dessous de ~760px la colonne droite passe sous la gauche.

Colonne gauche, dans l'ordre :

- Trois chips : « Automobile et deux-roues » (bleu), « Fos-sur-Mer », « Fiche non revendiquée » (neutres).
- H1 : **« Un problème avec JK AUTO ? Rendez-le visible pour inciter l'entreprise à réagir. »**
- Intro : « Publiez votre situation sur la fiche de JK AUTO, préparez votre réclamation écrite et suivez les prochaines démarches adaptées à votre litige. »
- CTA principal : **« Rendre mon litige visible »** + flèche → ouvre le tunnel.
- CTA secondaire, conditionnel :
  - aucun signalement → « Trouver la démarche adaptée », ancre `#probleme` ;
  - au moins un → « Voir les N signalements », ancre `#signalements`.
- Sous les boutons : « Gratuit · vous relisez tout avant publication · justificatifs facultatifs ».

Colonne droite : encadré blanc bordé, en-tête « Ce que vous obtenez » sur fond `#FBFCFE`, puis trois bénéfices séparés par des filets `#EEF1F6`, chacun icône 22px trait 1.6 `#14448C` + titre 15.5px/600 + sous-texte 14px `#5A6579` :

1. **Votre litige visible publiquement** — « Consultable sur la fiche de JK AUTO après modération, par les consommateurs recherchant cette entreprise. »
2. **Une réclamation prête à envoyer** — « Rédigée selon votre situation. Vous la relisez et restez l'expéditeur. »
3. **Les prochaines étapes et échéances** — « Les démarches sont présentées dans l'ordre selon votre situation. »

> ⚠️ **Incohérence à trancher avant implémentation.** Le bénéfice 1 et la section signalements disent encore « après modération », alors que le tunnel annonce une **publication immédiate sans modération humaine préalable**. Aligner les deux sur la règle produit réellement retenue.

### Section « Quel problème rencontrez-vous ? »

Grille `repeat(auto-fit, minmax(272px, 1fr))`, gap 14px → 3 colonnes en desktop, 2 en tablette, 1 en mobile. Six cartes, chacune : icône 38×38 dans un carré `#EEF3FA` bordé `#D6E2F3`, titre 16px/700, description 14px `#5A6579`, filet, flèche alignée à droite. `min-height:150px`.

1. **Remboursement non reçu** — « Rétractation, retour ou annulation : la somme n'a pas été recréditée. »
2. **Commande non reçue** — « Colis jamais livré, livraison annoncée mais absente, retard important. »
3. **SAV ou service après-vente** — « Aucune réponse, prise en charge refusée ou intervention sans suite. »
4. **Produit défectueux ou garantie** — « Panne, défaut de conformité ou refus d'appliquer la garantie légale. »
5. **Résiliation ou prélèvement** — « Résiliation non prise en compte ou prélèvement que vous contestez. »
6. **Autre problème** — « Votre situation ne correspond à aucune de ces catégories. »

Les cartes mènent au tunnel avec la catégorie préremplie. **Ne pas afficher de délai légal sur les cartes** (« 14 jours », « 2 ans ») : ambigu hors contexte.

Sous la grille : bandeau beige `#F8F5EF` / `#E7E0D2`, icône `#8A7A55`, texte 14px `#5C5232` — « Vous ne savez pas par où commencer ? Nous vous indiquons la prochaine étape selon votre situation. »

### Section « Signalements publics »

Fond `#F7F9FC`. **Un seul état vide sur toute la page**, ici et nulle part ailleurs.

État vide : bloc blanc bordé, à gauche « Aucun signalement public concernant JK AUTO pour le moment. » (17px/700) puis « Vous avez rencontré un problème ? Votre publication permettra de rendre cette situation visible. » ; à droite CTA **« Publier le premier signalement »**.

État rempli : barre de trois compteurs (grand chiffre 30px/800 + libellé 14px) — total (`#0E2A56`), résolus (`#1F7A4C`), sans résolution déclarée (`#C1121F`) — puis la liste des cartes de signalement. Chaque carte : chip catégorie (bleu), chip statut (neutre), date à droite, texte du signalement.

Mention permanente sous la section, 13.5px `#5F6B7F` : « Chaque signalement reprend la déclaration de son auteur. Recours France ne vérifie pas le récit des faits, n'intervient pas dans le règlement du litige et ne génère aucun contenu artificiel pour étoffer cette page. »

### Section « Votre plan d'action »

Frise verticale de cinq étapes. Colonne de gauche 34px : pastille ronde `#14448C` avec le numéro en blanc, puis un filet 1px `#D6DEEA` qui descend vers l'étape suivante. À droite, un accordéon **fermé par défaut** : bouton bordé (titre 16px/700, sous-titre 14px `#5A6579`, libellé « Détails » / « Réduire » 14px `#14448C`, chevron), panneau ouvert collé dessous (`margin-top:-1px`, coins bas arrondis, fond `#FBFCFE`).

1. **Envoyer une première demande écrite** — « Contactez le service client par e-mail, formulaire ou espace client et conservez une copie. »
2. **Envoyer une réclamation formelle** — « Adressez une réclamation structurée avec les faits, votre demande et un délai de réponse. »
3. **Envoyer une mise en demeure si nécessaire** — « Lettre recommandée avec avis de réception, en l'absence de réponse. »
4. **Saisir le médiateur** — « Gratuit, après une réclamation écrite restée sans réponse satisfaisante. »
5. **Utiliser SignalConso ou un autre recours adapté** — « Signalement à l'administration, ou recours judiciaire selon le montant. »

Le contenu détaillé de chaque panneau figure dans `renderVals()` du prototype (tableau `stepData`) : le reprendre au mot près.

Sous la frise, bloc interactif fond `#EEF3FA` bordure `#CFDFF3` :

- Titre « Où en êtes-vous dans vos démarches ? » (17px/700)
- Question « Avez-vous déjà contacté JK AUTO par écrit ? »
- Trois options en grille `repeat(auto-fit, minmax(212px, 1fr))`, `min-height:56px`, `height:100%` pour que les trois boutons aient la même hauteur : « Non, pas encore » / « Oui, mais sans réponse satisfaisante » / « Oui, ma réclamation a été refusée ».
- Après sélection, un bloc blanc apparaît : sur-titre « VOTRE PROCHAINE ÉTAPE », une phrase de contexte, et un CTA :
  - Non, pas encore → **Préparer ma première réclamation** — « Commencez par l'étape 1 : une demande écrite au service client, dont vous conservez une copie. »
  - Sans réponse → **Préparer une mise en demeure** — « Passez à l'étape 3 : la mise en demeure rappelle le fondement légal, le montant réclamé et le délai laissé à l'entreprise. »
  - Refusée → **Vérifier le médiateur et les recours possibles** — « Passez à l'étape 4 : conservez le refus écrit et sa motivation, ils seront utiles en médiation. »
- Mention finale : « Nous préparons le texte adapté à votre situation. L'envoi reste effectué par vos soins. »

Disclaimer de section : « Informations générales de droit de la consommation. Elles ne constituent pas un conseil juridique personnalisé. »

### Sections 9 à 12

- **Coordonnées et médiateur** — deux cartes en `repeat(auto-fit, minmax(290px,1fr))`. Adresse du siège (données Sirene) + « Aucun courriel ni téléphone n'est déclaré publiquement à ce jour. » / Médiateur : « Aucune adhésion déclarée par JK AUTO à ce jour. » + rappel de l'obligation légale.
- **Informations légales et financières** — grille de définitions `repeat(auto-fit, minmax(280px,1fr))`, une ligne par donnée (clé 14px `#5A6579` à gauche, valeur 14px/600 `#0E2A56` à droite, filet en dessous). Données Sirene/INPI/BODACC réelles (SIREN 817 383 383, SARL, immatriculée le 4 janvier 2016, NAF 45.20A, en activité). Deux accordéons fermés : « Informations financières (4 exercices) » et « Événements récents et sources ». Ne jamais inventer de chiffre : « Comptes déposés, détail non publié » quand le détail n'est pas public.
- **Vous représentez JK AUTO ?** — bloc discret, deux boutons secondaires « Contester une déclaration » et « Revendiquer cette fiche ». Ne doit pas interrompre le parcours consommateur.
- **Méthodologie, indépendance et FAQ** — colonne principale d'accordéons fermés (7 entrées, dont « Guides pouvant vous aider » et « Entreprises comparables », relégués ici), colonne latérale beige rappelant l'indépendance de la plateforme + liens méthodologie / charte de modération / origine des données.

### Responsive de la fiche

Un booléen `compact` (mobile) pilote uniquement :

- header : nav remplacée par un bouton menu 46×46 ;
- nav collante : le CTA de droite disparaît ;
- bandeau CTA final : masqué ;
- barre CTA collante en bas (`position:sticky; bottom:0`), bouton pleine largeur 52px « Rendre mon litige visible ».

Tout le reste se remet en page seul (grilles `auto-fit`, `flex-wrap`, tailles en `clamp` + `cqw`).

---

## Écran 2 — Tunnel de signalement

Fichier : `design/Parcours signalement.dc.html`. Vue comparée (3 écrans × 2 largeurs) : `design/Parcours signalement - desktop et mobile.dc.html`.

**Deux étapes maximum avant publication. Pas de page d'introduction après le clic sur le CTA.** Publication immédiate sur la fiche après validation finale : bannir « Soumettre pour modération », « En attente de modération », « Publication après modération ».

### En-tête du parcours (commun aux étapes 1 et 2)

Fond blanc, bordure basse `#DDE3EC`, conteneur `max-width:820px`.

- Ligne 1 : marque Recours France à gauche, lien « Quitter » à droite. Pas d'autre navigation.
- Ligne 2 : « Votre signalement concerne » (13.5px `#5F6B7F`) puis **JK AUTO** (20px/800) et « Fos-sur-Mer · SIREN 817 383 383 » (14px `#5A6579`).
- Ligne 3 : progression en deux segments de largeur égale, filet supérieur 3px — actif `#14448C` + texte `#0E2A56`/700, inactif `#DDE3EC` + texte `#6B7688`/600, franchi `#14448C` + coche verte + texte `#5A6579`. Libellés : « 1 sur 2 — Votre situation », « 2 sur 2 — Vérifier et publier ».
- Ligne 4 : icône bouclier + « Vous gardez le contrôle : vous verrez exactement ce qui sera public avant de valider. »

L'en-tête de progression disparaît sur l'écran de réussite.

### Étape 1 — Décrire la situation

H1 « Quel problème avez-vous rencontré avec JK AUTO ? », sous-titre « Quelques informations suffisent pour rendre votre situation visible. »

Quatre cartes blanches empilées (gap 14px), chacune numérotée (chiffre 13px/800 `#14448C` + titre 17px/700).

**1. Nature du litige.** Deux modes :

- *Sans présélection* : grille `repeat(auto-fit, minmax(230px,1fr))` de quatre familles (titre 15px/700 + description 13.5px), puis, une fois une famille choisie, un bloc « Précisez votre situation » avec les chips de catégories de cette famille **uniquement**.
- *Avec présélection* (arrivée depuis une carte de la fiche) : bandeau `#EEF3FA` avec coche, libellé de la catégorie, bouton « Modifier », et la mention « Repris de votre choix sur la fiche JK AUTO. » **Ne pas redemander le choix.**

Familles et catégories :

| Famille | Description | Catégories |
|---|---|---|
| Prestation, réparation ou travaux | Garage, artisan, chantier, intervention | Prestation ou travaux mal réalisés · Prestation inachevée ou chantier abandonné · Retard ou intervention non effectuée · Dommage causé pendant l'intervention · Facture ou supplément contesté · Refus de reprendre ou corriger le travail · Autre problème |
| Achat ou livraison | Commande, produit, remboursement | Remboursement non reçu · Commande non reçue · Produit défectueux · Garantie refusée · Produit différent de celui commandé · Autre problème |
| Contrat, abonnement ou prélèvement | Résiliation, facturation, paiement | Résiliation non prise en compte · Prélèvement contesté · Facturation incorrecte · Service non fourni · Renouvellement non souhaité · Autre problème |
| Autre situation | Aucune des familles ci-dessus | Autre problème |

L'ordre d'affichage des familles doit être **piloté par l'activité de l'entreprise** (code NAF). Pour JK AUTO (45.20A, réparation automobile), « Prestation, réparation ou travaux » vient en premier. L'utilisateur doit toujours pouvoir changer de famille.

**2. Quand le problème s'est-il produit ?** Sous-texte « Une date approximative suffit. » Trois chips (« Cette semaine », « Ce mois-ci », « Il y a plus d'un mois »), le mot « ou », puis un `input[type=date]`. Choisir une date précise désélectionne les chips. **Une seule date demandée.**

**3. Que s'est-il passé ?** Chip « NON PUBLIÉ » à côté du titre. Sous-texte : « Décrivez simplement les faits. Ce texte n'est pas publié : il sert à rédiger votre réclamation et, si nécessaire, votre mise en demeure. » `<textarea rows="5">` pleine largeur, `resize:vertical`. Le **placeholder change selon la famille** :

- Prestation : « J'ai confié mon véhicule à cette entreprise pour une réparation. Après l'intervention, la panne était toujours présente et l'entreprise a refusé une nouvelle prise en charge. »
- Achat : « J'ai commandé un article auprès de cette entreprise. Le produit n'est jamais arrivé et je n'ai reçu ni livraison ni remboursement malgré mes relances. »
- Contrat : « J'ai demandé la résiliation de mon contrat. Les prélèvements se sont poursuivis les mois suivants et ma demande est restée sans réponse. »
- Autre : « Décrivez les faits : ce que vous avez demandé à l'entreprise, ce qui s'est passé, et ce que vous avez tenté depuis. »

Sous le champ : « Trois ou quatre phrases suffisent. » et un compteur de caractères. Ne pas suggérer les termes « arnaque », « escroc », « voleur » ni aucune accusation pénale.

**4. Quelle solution souhaitez-vous obtenir ?** Huit chips, sélection unique : Un remboursement · Une réparation ou reprise des travaux · Un remplacement · La fin de la prestation · L'annulation du contrat · L'arrêt des prélèvements · Une réduction du prix · Une autre solution.

CTA : **« Prévisualiser mon signalement »** + « Étape suivante : vous vérifiez exactement ce qui sera rendu public. » En mobile, ce CTA est dans la barre collante du bas avec la mention « Vous vérifiez tout à l'étape suivante. »

**Ne jamais demander à cette étape :** compte, mot de passe, numéro de commande, devis, facture, montant, chronologie complète, échanges avec l'entreprise, justificatifs, notions juridiques.

### Étape 2 — Vérifier et publier

H1 « Vérifiez votre signalement avant sa publication », sous-titre « Après votre validation, il sera immédiatement visible sur la fiche de JK AUTO. »

**Aperçu de la carte publique** (sur-titre avec icône œil, 13.5px majuscules `#5F6B7F`). La carte reproduit exactement le rendu d'un signalement sur la fiche :

- chip catégorie (bleu), chip « Déclaré » (neutre), date à droite ;
- liste de définitions : « Solution demandée » → la solution choisie ; « Statut » → « En attente de solution » ;
- mention : « Déclaration d'un consommateur. Votre description détaillée des faits n'apparaît pas sur la fiche : elle sert uniquement à rédiger vos courriers. » ;
- rangée de boutons « Modifier la catégorie / la date / la solution » qui ramènent à l'étape 1 en conservant toutes les réponses.

**La description saisie à l'étape 1 n'est jamais affichée publiquement.**

**Deux colonnes public / confidentiel** (`repeat(auto-fit, minmax(268px,1fr))`) :

- *Sera visible publiquement* (carte blanche, icône œil) : catégorie du problème · date ou période · solution demandée · statut du litige.
- *Restera confidentiel* (carte `#F7F9FC`, icône cadenas) : votre description des faits, utilisée pour rédiger vos courriers · adresse e-mail · identité réelle du consommateur · informations et justificatifs ajoutés ultérieurement.

**Adresse e-mail** — demandée uniquement sur cet écran. « Votre e-mail restera confidentiel. Il vous permettra de modifier votre signalement et de poursuivre vos démarches. » Un seul champ, pas de code de vérification, pas de mot de passe, pas de création de compte. Mention : « Aucun mot de passe, aucun compte à créer. Un lien sécurisé vous sera envoyé pour retrouver votre dossier. »

**Confirmation** — une seule case, cliquable sur toute la ligne (`min-height:44px`) : « Je confirme que ce récit correspond à mon expérience et j'accepte les règles de publication. » Puis un lien secondaire « Lire les règles de publication » — pas de texte juridique déplié dans le formulaire.

**Publication** — CTA **« Publier mon signalement »**, désactivé tant que catégorie + description + solution + e-mail valide + case cochée ne sont pas réunis. Texte d'aide sous le bouton :

- prêt → « Publication immédiate sur la fiche de JK AUTO »
- e-mail manquant → « Indiquez votre adresse e-mail pour publier. »
- case décochée → « Cochez la confirmation pour publier. »

À côté, lien « Revenir à l'étape 1 ». En mobile, le bouton et sa mention sont dans la barre collante.

### Écran de réussite

Pastille verte 52px avec coche, H1 « Votre signalement est maintenant public », sous-titre « Il est visible sur la fiche de JK AUTO. Vous pouvez le modifier, l'actualiser ou indiquer ultérieurement si votre problème a été résolu. »

Grille `repeat(auto-fit, minmax(258px,1fr))` de quatre actions, `min-height:66px`, la première en bleu plein :

1. **Voir mon signalement public** (primaire)
2. **Préparer ma réclamation** — « Quelques informations complémentaires »
3. **Découvrir mes prochaines démarches** — « Les étapes dans l'ordre, selon votre cas »
4. **Ajouter des justificatifs confidentiels** — « Jamais publiés sur la fiche »

Puis un bandeau beige avec icône enveloppe : « Un lien sécurisé vient de vous être envoyé à {e-mail}. Il vous permet de retrouver votre dossier à tout moment, sans mot de passe. » Et un lien discret « Je continuerai plus tard ».

### Phase facultative après publication (à concevoir ensuite)

Les informations lourdes ne sont demandées **qu'après** la publication, au moment de préparer le courrier : montant, numéro de commande / facture / devis, dates précises, démarches déjà réalisées, réponse de l'entreprise, adresse du consommateur, justificatifs. Le plan d'action détermine ensuite l'étape suivante (contacter, réclamer, mettre en demeure, médiateur, SignalConso, autre recours). Ces écrans ne sont pas maquettés.

---

## State management

### Fiche entreprise

| État | Type | Rôle |
|---|---|---|
| `open` | `Record<string, boolean>` | accordéons ouverts (étapes, données, FAQ), tous fermés au départ |
| `situation` | `'pas-encore' \| 'sans-reponse' \| 'refus' \| null` | réponse à « Où en êtes-vous ? » |

Props d'affichage : `compact` (mobile), `signalements` (int, 0 par défaut), `resolus` (int).

### Tunnel

| État | Type | Rôle |
|---|---|---|
| `screen` | `1 \| 2 \| 3` | étape courante |
| `family` | clé de famille | famille de litige |
| `category` | string | catégorie précise |
| `dateChip` / `exactDate` | string | date approximative ou précise (exclusives) |
| `description` | string | récit confidentiel |
| `solution` | string | solution demandée |
| `email` | string | adresse de contact |
| `consent` | boolean | case de confirmation |
| `touchedFamily` | boolean | l'utilisateur a modifié la présélection |

Props : `ecran` (`'1' | '2' | '3'`, écran initial), `compact`, `preselection` (`aucune | remboursement | commande-non-recue | travaux-mal-realises | prelevement`).

Règles :

- **Toutes les réponses sont conservées** lors d'un retour en arrière depuis l'étape 2.
- La présélection venue de la fiche remplit famille + catégorie ; cliquer « Modifier » repasse au sélecteur sans perdre le reste.
- Changer de famille remet la catégorie à zéro et change l'exemple du champ de description.
- Validation e-mail : `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`.
- Publication autorisée si `category && description.trim() && solution && emailOk && consent`.

## Accessibilité

- Contraste : tout texte informatif atteint AA (4.5:1). Le gris le plus clair autorisé sur blanc est `#6B7688` ; les placeholders sont à `#707B8C`.
- Aucun texte informatif sous 14px ; mentions juridiques 13.5px minimum, jamais en gris clair.
- Focus visible partout : `outline:2px solid #14448C; outline-offset:2px`.
- Toute zone cliquable ≥ 44px de haut, y compris les liens de listes.
- `aria-label` sur les champs sans label visible (date, code, e-mail, textarea) et sur le bouton menu mobile.
- Les accordéons doivent recevoir `aria-expanded` / `aria-controls` à l'implémentation (non portés par le prototype).

## Assets

- **Police** : Public Sans, Google Fonts, poids 400–800.
- **Logo** : non fourni. Le prototype affiche un carré 38×38 avec les initiales « RF » comme **placeholder** — remplacer par le pictogramme officiel (`/pictogramme-rf.png` et `/recours-france-blanc.png` sur le site actuel).
- **Icônes** : SVG inline, `stroke="currentColor"`-like, `stroke-width` 1.6–1.7, tailles 16–22px, sans remplissage. Remplaçables par n'importe quelle librairie de traits fins (Lucide, Phosphor light) en conservant la sobriété — pas d'icônes pleines, pas d'illustrations, pas d'emoji.
- **Images** : aucune. Le design ne repose sur aucune photo ni illustration.
- **Données** : Sirene (Insee), RNE (INPI), BODACC, liste publique des médiateurs. Toutes les valeurs affichées dans les prototypes sont les données réelles de JK AUTO — aucune donnée inventée.

## Files

| Fichier | Contenu |
|---|---|
| `design/Fiche JK AUTO.dc.html` | la fiche entreprise, fluide, responsive |
| `design/Fiche JK AUTO - desktop et mobile.dc.html` | la fiche dans un cadre navigateur 1280px et un cadre téléphone 390px |
| `design/Parcours signalement.dc.html` | le tunnel : étape 1, étape 2, écran de réussite |
| `design/Parcours signalement - desktop et mobile.dc.html` | les trois écrans du tunnel × deux largeurs |
| `design/support.js` | runtime du prototype — **à ignorer, ne pas porter** |

Ouvrir les deux fichiers « desktop et mobile » pour voir l'ensemble d'un coup ; ouvrir les deux autres pour manipuler les designs en pleine largeur.

## Points ouverts

1. **Modération** : la fiche annonce « après modération », le tunnel annonce une publication immédiate. Trancher et aligner les deux.
2. **Logo** : fournir le pictogramme et le logotype blanc.
3. **Ordre des familles de litige** : la logique de tri par code NAF est décrite mais pas implémentée dans le prototype (l'ordre y est figé sur le cas garage).
4. **Écrans post-publication** (rédaction du courrier, justificatifs, plan d'action personnalisé) : non maquettés.
