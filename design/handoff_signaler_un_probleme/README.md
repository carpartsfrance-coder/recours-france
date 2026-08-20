# Handoff — Recours France, parcours « Rendre mon problème visible »

## Ce qu'est ce parcours

Le tunnel de signalement de Recours France : `recoursfrance.fr/signaler/<slug-entreprise>`. L'utilisateur y arrive depuis le CTA de la fiche entreprise publique.

**La valeur n°1 pour le consommateur est de rendre son problème visible publiquement sur la fiche de l'entreprise.** Le plan d'action, le courrier, les échéances et les recours sont des bénéfices complémentaires, réels et livrés, mais secondaires dans la hiérarchie.

Ce que l'utilisateur doit comprendre en cinq secondes :

> « Je peux publier mon problème sur la fiche publique de Prixnet, le rendre visible aux autres consommateurs, puis Recours France m'aide aussi à savoir quoi faire ensuite. »

Hiérarchie de valeur, à respecter partout — hero, CTA, aperçu, confirmation, succès, suivi :

1. Rendre mon problème visible publiquement
2. Donner de la visibilité à ma situation
3. M'aider à agir
4. Me fournir les outils : courrier, étapes, échéances, médiateur, recours

### Contrainte de conversion

Trois étapes avant publication, **quatre informations demandées** : catégorie, récit, montant et date (facultatifs), email. Objectif 60 à 90 secondes. Tout le reste est proposé **après** l'enregistrement, de façon facultative et non bloquante. Ne jamais afficher « 3 à 5 minutes ».

**Aucun compte, aucun mot de passe.** L'email sert à confirmer, à retrouver le dossier via un lien sécurisé, à compléter et à mettre à jour la situation.

### Ce que Recours France n'est pas

Ni un avocat, ni un médiateur, ni un tribunal, ni un service de l'État. La plateforme ne résout pas le litige et ne transmet pas la réclamation au professionnel. Les démarches proposées sont des informations générales et des parcours prédéfinis, pas une consultation juridique personnalisée.

### Wording : promesses interdites

| Écrire | Ne jamais écrire |
| --- | --- |
| Votre problème devient publiquement visible | Prixnet va répondre |
| Une situation publiée est visible par les autres consommateurs | Prixnet sera obligé de résoudre le problème |
| Cette visibilité peut inciter l'entreprise à prendre connaissance de la situation | Faites pression sur Prixnet / Forcez l'entreprise à réagir |
| Résolu selon le consommateur | Résolu / Litige résolu |
| Signaler un problème · Décrire ma situation · Publier mon signalement · Mettre à jour ma situation | Déposer une plainte · Constituer votre dossier · Ouvrir un contentieux · Engager une procédure |
| Justificatif fourni · Achat justifié · Élément vérifié | Signalement certifié vrai |

Aucun ton militant, aucun « name and shame », aucun mur de la honte. La plateforme reste neutre et crédible.

## À propos du fichier de design

`Recours France - Signaler un probleme.dc.html` est une **référence de design réalisée en HTML** : un prototype qui montre l'apparence, la hiérarchie et le comportement attendus — pas du code de production à copier tel quel.

Le fichier s'ouvre par double-clic dans un navigateur ; `support.js` doit rester à côté de lui. Une barre grise en haut permet de sauter d'un écran à l'autre : **elle ne fait pas partie du produit**, c'est un outil de revue. Le parcours fonctionne aussi en cliquant normalement dans les boutons.

Interactions réellement fonctionnelles dans le prototype, à manipuler avant de coder : sélection de catégorie et sous-catégorie, détection de données personnelles dans le récit, seuil de longueur du récit, cases à cocher, bascule du rappel, choix de situation dans la mise à jour.

Stack recommandée si rien n'existe : Next.js App Router + TypeScript, rendu serveur. Le parcours doit fonctionner sans JavaScript autant que possible (formulaires `POST` classiques, une étape par requête).

## Fidélité

**Haute fidélité.** Couleurs, typographie, espacements et hiérarchie sont définitifs. Le copy français est validé : le reprendre **verbatim**, mentions et avertissements compris.

L'entreprise du prototype est **fictive** (Prixnet, Bordeaux) et tous les signalements, montants et dates sont inventés. Ne reprendre aucune de ces valeurs en production.

## Système de design

| Rôle | Hex |
| --- | --- |
| Bleu institutionnel — titres, liens, action principale, filets forts | `#1B3FA0` |
| Bleu profond — survol du bouton principal | `#12256B` |
| Bleu clair — badges, encarts d'accent, pastille de bénéfice n°1 | `#E7EEFF` |
| Bleu de survol des liens | `#2E5FE0` |
| Fond page | `#FFFFFF` |
| Fond secondaire, zones d'aide | `#F8FAFD` |
| Fond de la zone de revue et de la démo mobile | `#EEF1F7` |
| Bordure de bloc | `#D7DCE5` · champ de saisie `#B9C1D1` |
| Filet neutre `#E4E9F2` · filet de ligne `#EEF1F7` | |
| Texte principal `#14161C` · secondaire `#4A515F` · tertiaire `#5F6673` | |
| Vert — publié, résolu, reçu | `#1B7A4B` sur `#EDF6F0`, bordure `#BFE0CD` |
| Ambre — problème en cours, alerte de modération | `#8A5200` sur `#FBF3E8`, bordure `#E8C9A8` |
| Rouge — erreur bloquante | `#A32A22` sur `#FBEEEC` |
| Neutre — badge secondaire, bouton désactivé | `#4A515F` sur `#F2F4F8` · bouton inactif `#B9C1D1` |
| Filet de citation du consommateur | `#C6D2EA`, 3 px à gauche |

Typographie : **Public Sans**, 400/500/600/700, fallback `"Helvetica Neue", Helvetica, Arial, sans-serif`. H1 de tunnel 27 px / 700 / `-0.022em` ; H1 d'accueil 38 px / `-0.032em` ; promesse du hero 29 px / 700 / `-0.026em` en `#1B3FA0` ; H1 de succès 32 px ; corps 15–17 px, `line-height: 1.6–1.7` ; champs et boutons 16–17 px ; mentions 12–13 px. `font-variant-numeric: tabular-nums` sur les chiffres.

Règles : aucun arrondi (`border-radius: 0`), aucune ombre, aucun dégradé, aucune illustration, aucune animation. Boutons pleine largeur dans le tunnel. Colonne de lecture centrée : 640 px pour les étapes, 1040 px pour l'accueil et le plan, 800 px pour le courrier.

## Les 12 écrans

| # | Écran | Rôle |
| --- | --- | --- |
| 1 | **Accueil** | promesse de visibilité publique, bénéfices, CTA, aperçu du futur signalement, impact collectif |
| 2 | **Étape 1 — catégorie** | 10 situations, sous-catégorie en ligne, sans étape supplémentaire |
| 3 | **Étape 2 — récit** | description, montant et date facultatifs, modération inline |
| 4 | **Étape 3 — aperçu public** | « Voici ce qui sera publié », zones Public / Privé, email |
| 5 | **Confirmation email** | « Confirmez pour publier votre signalement » |
| 6 | **Succès + plan d'action** | « Votre problème est maintenant visible », puis les démarches |
| 7 | **Courrier** | lettre de réclamation prête, copier / télécharger / modifier |
| 8 | **Justificatifs** | dépôt facultatif, documents privés |
| 9 | **Mon signalement** | page de suivi via lien sécurisé, bloc Visibilité |
| 10 | **Mise à jour** | où en est votre problème, résultat obtenu |
| 11 | **Erreurs** | 6 états, tous avec une sortie |
| 12 | **Mobile** | deux maquettes 390 px : accueil et plan d'action |

### 1 — Accueil

Identité entreprise (logo, nom, « Commerce en ligne · 184 signalements publiés »), H1 « Un problème avec `<Entreprise>` ? », promesse « Rendez votre problème visible publiquement », paragraphe d'explication, puis la microcopy émotionnelle mais mesurée : « Votre problème ne reste pas seulement dans une boîte email : vous pouvez aussi le rendre visible sur la fiche publique de l'entreprise. »

Bénéfice n°1 **visuellement dominant** : encart `#E7EEFF` à filet gauche 4 px `#1B3FA0`, « Signalement publié sur la fiche `<Entreprise>` ». Les trois autres bénéfices en puces plus discrètes : problème consultable publiquement, courrier préparé, étapes et échéances.

CTA « **Rendre mon problème visible** », mentions « Environ 1 minute · Gratuit · Sans compte », phrase secondaire « Vous obtenez également gratuitement les étapes à suivre et un courrier adapté à votre situation », puis un bandeau bordé « Inclus avec votre signalement » : Courrier adapté · Étapes à suivre · Échéances · Recours possibles.

Colonne droite, trois blocs empilés :

1. **Ce qui se passe après votre signalement** — timeline verticale de 4 étapes, publication en étape 1 (pastille bleue pleine, les suivantes en cercle vide) ; note de bas de bloc sur la visibilité, sans promesse de réaction.
2. **Aperçu de votre futur signalement public** — la carte telle qu'elle apparaîtra : badges catégorie et statut, intitulé, montant, déclaration en filet gauche, mention « Publié sur la fiche `<Entreprise>` », lien « Voir à quoi ressemble un signalement public ».
3. **184 problèmes déjà signalés** — répartition 63 remboursements / 41 livraisons / 27 SAV, et « Votre signalement rejoint une fiche déjà consultable publiquement ».

Une variante de CTA est pilotable (prop `ctaVariant`) : « Publier mon signalement » bascule aussi la promesse sur « Rendez votre situation publique et agissez » et le paragraphe correspondant. À arbitrer par test A/B.

### 2 — Étape 1, catégorie

Barre de progression « Étape 1 sur 3 » + filet de 3 px à 33 %. Dix situations en lignes cliquables avec radio et description courte : Remboursement, Commande non reçue, Livraison, Produit défectueux, SAV / garantie, Retour / rétractation, Marketplace / vendeur tiers, Paiement / prélèvement, Compte client, Autre problème.

La sous-catégorie s'ouvre **en ligne sous la catégorie sélectionnée**, jamais sur une page dédiée, et reste facultative (Remboursement : Non reçu / Refusé / Partiel / Trop long / Autre ; SAV : Prise en charge refusée / Réparation sans suite / Délai trop long / Autre).

Le bouton reste gris `#B9C1D1` tant qu'aucune catégorie n'est choisie, avec la raison sous le bouton.

### 3 — Étape 2, récit

Rappel de la catégorie en badges avec lien « Modifier ». Grand textarea, placeholder exemplaire, trois repères sous le champ (dates importantes, ce que vous avez déjà demandé, situation actuelle), compteur de caractères, et « N'indiquez pas de coordonnées personnelles dans votre texte. »

**Modération inline** : détection d'email, de numéro de téléphone et de numéro de carte dans le récit → encart ambre « Vérifiez votre texte », « Certaines informations semblent personnelles (…) », deux issues : « Modifier mon texte » et « Continuer quand même ». Non bloquant, non anxiogène. Le prototype implémente les trois expressions régulières.

Sur le même écran : montant facultatif, date des faits (elle alimente le calcul des échéances), case « Afficher ce montant publiquement sur la fiche ».

Seuil de continuation : 60 caractères. Le bouton reste gris en dessous.

### 4 — Étape 3, aperçu public

Titre « **Voici ce qui sera publié** ». Champ email + « Votre email reste privé. »

Aperçu encadré `2px solid #1B3FA0` avec bandeau bleu « Aperçu public sur la fiche `<Entreprise>` » et lien « Modifier » : badges, intitulé généré automatiquement, date, récit en filet gauche. Puis deux colonnes explicites :

- **Public** : intitulé, description, catégorie, statut, date, montant si accepté.
- **Privé** : email, justificatifs, numéro de commande, identité.

La case porte uniquement sur l'affichage du montant. Case d'acceptation des conditions de publication et de la politique de modération. Bouton « **Publier mon signalement** » — jamais « Créer mon compte ».

### 5 — Confirmation email

« Confirmez pour publier votre signalement », email masqué (`j••••@gmail.com`), bouton « Publier mon signalement », liens « Renvoyer le lien » et « Modifier mon email », mention de conservation locale et validité 7 jours.

### 6 — Succès puis plan d'action

**La publication d'abord.** Pastille verte + H1 « Votre problème est maintenant visible », sous-titre « Votre signalement est publié sur la fiche `<Entreprise>`, aux côtés des 184 problèmes déjà signalés », carte du signalement publié encadrée en bleu 2 px avec bouton « Voir mon signalement » vers la fiche publique.

**Le plan ensuite**, sous un H2 « Maintenant, poursuivez vos démarches » :

- bloc « À faire maintenant » encadré 2 px : « Envoyer votre réclamation à `<Entreprise>` », boutons « Voir mon courrier » et « Copier le courrier » ;
- « Avant l'envoi » : checklist de pièces **adaptée au motif** (ne jamais afficher de pièce inutile) + « Conserver mes justificatifs ici » ;
- « Les prochaines étapes » : timeline de 5 jalons, dont deux datés et deux volontairement non datés — quand une information manque, afficher « Date dépendant de votre situation », **jamais un délai juridique automatique non fiable** ;
- « Votre signalement » en encart gris : statut, référence, liens de gestion.

Colonne droite : progression en 4 étapes (« Problème décrit ✓ », « Réclamation à envoyer » en étape courante, etc.), encart « Prochaine échéance » avec bouton « Recevoir un rappel » qui bascule sur « ✓ Rappel programmé », et « Situations similaires » (17 signalements avec répartition, ou l'état vide sans contenu inventé).

### 7 — Courrier

Lettre complète rédigée à partir du motif, du montant et des dates déclarés, mentions à compléter entre crochets, mise en page courrier (expéditeur à droite, destinataire, objet, mention recommandé). Actions : Copier, Télécharger en PDF, Modifier le texte. Encart « Avant d'envoyer » (4 points) + avertissement que le modèle est une information générale. Bouton « J'ai envoyé mon courrier » qui programme la vérification de la réponse.

### 8 — Justificatifs

Zone de dépôt, liste des fichiers avec un cas nominal et un cas en échec, encart « Vos documents restent privés », et les trois badges publics possibles avec leur nuance explicite. Sortie « Passer cette étape » toujours disponible.

### 9 — Mon signalement (lien sécurisé)

Bandeau d'explication du lien sans compte (valable 12 mois). H1 « Mon signalement concernant `<Entreprise>` ». **Bloc Visibilité** vert : « Votre problème est actuellement visible sur la fiche `<Entreprise>` » + « Voir la version publique ». Puis « Mes prochaines démarches » en encart bleu, la carte du signalement avec la réponse éventuelle de l'entreprise dans un bloc distinct badgé « Entreprise vérifiée », et 5 actions : version publique, courrier, mise à jour, justificatif, rappels. En pied : « Demander la suppression de mon signalement ».

Pas de tableau de bord, pas de messagerie instantanée.

### 10 — Mise à jour

« Où en est votre problème ? » → Toujours en cours / Partiellement résolu / Résolu. Si **Résolu** : « Comment cela s'est-il terminé ? » avec 8 résultats (remboursement obtenu, commande reçue, remplacement, réparation, annulation, geste commercial, réponse satisfaisante, autre), commentaire facultatif, et l'encart vert annonçant l'affichage public « Résolu selon le consommateur ». Si **Toujours en cours** : encart bleu annonçant la mise à jour du plan et, le cas échéant, que la condition de saisine du médiateur est remplie.

### 11 — Erreurs

Six états : description trop courte, email invalide, envoi impossible, date non calculable, lien de gestion expiré, justificatif refusé. Chacun : contexte, filet de couleur, message factuel, une action principale et une sortie.

### 12 — Mobile

Au-dessus de la ligne de flottaison, **uniquement** : entreprise, H1, promesse de visibilité, texte court, trois bénéfices (Publication publique, Courrier préparé, Étapes à suivre), CTA, mentions. La preuve détaillée vient ensuite. Le plan d'action mobile a une barre d'action fixe en bas (réserve de 74 px). Cibles tactiles ≥ 44 px.

## État applicatif

```
screen: 'entry'|'step1'|'step2'|'step3'|'verify'|'plan'|'letter'|'proof'|'manage'|'update'|'errors'
cat: string                 // 1 des 10 catégories
sub: string | null          // sous-catégorie, facultative
story: string               // récit, seuil de 60 caractères
amountPublic: boolean       // afficher le montant publiquement
publish: boolean            // consentement à la publication
rules: boolean              // conditions de publication acceptées
modDismissed: boolean       // alerte de modération écartée
reminder: boolean           // rappel d'échéance programmé
situation: 'Toujours en cours'|'Partiellement résolu'|'Résolu'
outcome: string             // résultat obtenu, si résolu
```

Props de revue : `ctaVariant` (variante de CTA), `hasSimilarReports` (bascule l'état « aucun signalement similaire »).

Persistance : brouillon en `localStorage` par entreprise, avec la mention « Votre saisie est conservée sur cet appareil. » Pas de système de brouillon serveur avant l'email.

## Modèle de données

```
Signalement     id (RF-AAAA-MM-NNNNN), entreprise_id, categorie, sous_categorie,
                titre_auto, titre_edite, recit, montant, montant_public (bool),
                date_faits, email (privé), statut, moderation, publie_le,
                resolu_declare_le, resultat, vues, similaires
Justificatif    signalement_id, fichier (privé), type, taille, controle_le, badge
PlanAction      signalement_id, prochaine_action, checklist[], jalons[],
                echeance_prochaine, calcule_le
Courrier        signalement_id, objet, corps, variables_manquantes[], genere_le
Rappel          signalement_id, date, canal('email'), actif
Acces           signalement_id, token, expire_le            // lien sans compte
ReponseEntreprise signalement_id, texte, publie_le, auteur_verifie
```

Statuts publics : `en_cours`, `resolu_declare`. Statuts internes : `brouillon`, `en_attente_confirmation`, `en_moderation`, `publie`, `refuse`, `supprime`.

## Règles métier

1. Un signalement n'est publié qu'après **confirmation email** puis **modération**.
2. Une résolution n'est enregistrée que si **l'auteur** la déclare — jamais déduite du silence ou d'une réponse d'entreprise.
3. Les justificatifs ne sont **jamais publiés**. Ils peuvent produire une mention publique (« Justificatif fourni », « Achat justifié », « Élément vérifié ») qui n'atteste pas l'exactitude du signalement.
4. Le montant n'est publié que si l'auteur l'accepte ; il est compté dans les statistiques dans tous les cas.
5. Les échéances ne sont affichées que lorsque les informations nécessaires existent. Sinon : « La date exacte dépend de votre situation. »
6. Aucune étape d'enrichissement ne bloque la publication.
7. Le lien sécurisé remplace l'espace client : il doit permettre modification, ajout, mise à jour et suppression.
8. Le titre est **généré automatiquement** à partir de la catégorie et du récit ; l'utilisateur ne le rédige pas et peut le modifier après publication.

## Contraintes juridiques et accessibilité

- Aucun élément du Système de Design de l'État : ni police Marianne, ni bloc-marque, ni drapeau, ni logo d'organisme public.
- Mentions d'indépendance visibles en pied de page ; la version longue ne remonte pas au-dessus de la ligne de flottaison.
- Modération documentée et opposable : retrait des propos injurieux, des accusations pénales, des données personnelles de tiers. Droit de réponse gratuit pour l'entreprise, sans possibilité de faire supprimer un signalement conforme.
- RGPD : email et pièces privés, suppression sur demande depuis le lien sécurisé, durée de conservation annoncée.
- RGAA : contrastes conformes (blanc sur `#1B3FA0` ≈ 8,3:1), navigation clavier complète, `aria-current` sur l'étape en cours, libellés associés aux champs, alerte de modération annoncée aux lecteurs d'écran (`role="status"`), cibles ≥ 44 px.
- Retirer la barre de revue des écrans et la zone de démonstration mobile en production.

## Métrique produit

Optimiser en priorité le **taux de passage « commence le parcours → signalement confirmé »**. Un signalement utile avec quatre informations vaut mieux que quinze champs qui font abandonner. Le reste se collecte après.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `Recours France - Signaler un probleme.dc.html` | la maquette de référence, 12 écrans |
| `support.js` | runtime nécessaire pour l'ouvrir dans un navigateur |
