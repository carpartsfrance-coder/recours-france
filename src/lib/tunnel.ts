/**
 * Tunnel « Rendre mon problème visible ».
 *
 * La valeur première annoncée au consommateur est la publication de son
 * problème sur la fiche de l'entreprise ; le courrier, les étapes et les
 * échéances sont des bénéfices réels mais seconds. Cet ordre gouverne toute la
 * rédaction du parcours : accueil, boutons, aperçu, confirmation, succès.
 *
 * Contrainte de conversion : trois écrans, quatre informations — situation,
 * récit, montant et date facultatifs, adresse électronique. Tout le reste est
 * proposé après enregistrement, et jamais de façon bloquante.
 */

/**
 * Dix situations proposées, ramenées aux six catégories que la base connaît.
 *
 * Le libellé montré au consommateur et la catégorie statistique ne sont pas le
 * même objet : « Retour / rétractation » et « Remboursement » relèvent du même
 * motif comptable, mais la personne qui cherche ne les formule pas pareil, et
 * une liste de six entrées abstraites fait hésiter là où dix situations
 * concrètes se reconnaissent d'un coup d'œil.
 */
export const SITUATIONS = [
  {
    cle: "remboursement",
    libelle: "Remboursement",
    desc: "Un remboursement attendu n’a pas été reçu, a été refusé ou reste incomplet.",
    categorie: "REMBOURSEMENT",
    sous: ["Non reçu", "Refusé", "Partiel", "Trop long", "Autre"],
  },
  {
    cle: "commande-non-recue",
    libelle: "Commande non reçue",
    desc: "La commande n’est jamais arrivée, ou a été annoncée livrée sans l’être.",
    categorie: "LIVRAISON",
    sous: ["Jamais arrivée", "Annoncée livrée", "Colis incomplet", "Autre"],
  },
  {
    cle: "livraison",
    libelle: "Livraison",
    desc: "Retard, colis endommagé, ou conditions de livraison non respectées.",
    categorie: "LIVRAISON",
    sous: ["Retard", "Colis endommagé", "Adresse ou créneau", "Autre"],
  },
  {
    cle: "produit-defectueux",
    libelle: "Produit défectueux",
    desc: "Le produit est arrivé cassé, ne fonctionne pas ou ne correspond pas.",
    categorie: "GARANTIE",
    sous: ["Arrivé cassé", "Ne fonctionne pas", "Non conforme", "Autre"],
  },
  {
    cle: "sav",
    libelle: "SAV / garantie",
    desc: "Une demande de réparation ou de remplacement reste sans suite.",
    categorie: "SAV",
    sous: ["Prise en charge refusée", "Réparation sans suite", "Délai trop long", "Autre"],
  },
  {
    cle: "retour",
    libelle: "Retour / rétractation",
    desc: "Un droit de rétractation ou un retour n’est pas honoré.",
    categorie: "REMBOURSEMENT",
    sous: ["Retour refusé", "Frais contestés", "Sans réponse", "Autre"],
  },
  {
    cle: "marketplace",
    libelle: "Marketplace / vendeur tiers",
    desc: "L’achat a été fait auprès d’un vendeur tiers sur une place de marché.",
    categorie: "AUTRE",
    sous: ["Vendeur injoignable", "Plateforme sans réponse", "Autre"],
  },
  {
    cle: "paiement",
    libelle: "Paiement / prélèvement",
    desc: "Montant débité à tort, double prélèvement ou paiement non pris en compte.",
    categorie: "RESILIATION",
    sous: ["Débit à tort", "Double prélèvement", "Paiement non pris en compte", "Autre"],
  },
  {
    cle: "compte",
    libelle: "Compte client",
    desc: "Compte bloqué, fermé, ou impossible d’accéder à ses commandes.",
    categorie: "AUTRE",
    sous: ["Compte bloqué", "Compte fermé", "Accès impossible", "Autre"],
  },
  {
    cle: "autre",
    libelle: "Autre problème",
    desc: "Votre situation ne correspond à aucune des propositions ci-dessus.",
    categorie: "AUTRE",
    sous: [],
  },
] as const;

export type Situation = (typeof SITUATIONS)[number];

export function situationParCle(cle: string | null | undefined): Situation | null {
  return SITUATIONS.find((s) => s.cle === cle) ?? null;
}

/**
 * Longueur en deçà de laquelle un récit **fourni** ne dit rien d'exploitable.
 *
 * Le récit n'est plus exigé. Il n'est pas publié — il ne sert qu'au courrier
 * et au récapitulatif — et l'imposer plaçait le plus grand obstacle du
 * parcours devant la personne la moins disposée à écrire : celle qui vient de
 * se faire avoir. Ce qui paraît sur la fiche vient des choix fermés, et ceux-là
 * coûtent un clic.
 *
 * Le seuil reste appliqué à qui commence à écrire : trois mots valent moins que
 * rien du tout, parce qu'ils donneront un courrier bancal.
 */
export const SEUIL_RECIT = 60;

/**
 * Repérage de coordonnées personnelles dans le récit.
 *
 * L'alerte est délibérément non bloquante : elle prévient sans interdire. Une
 * adresse électronique dans un récit public est le plus souvent une maladresse,
 * pas une intention, et refuser la publication ferait abandonner l'auteur là où
 * un simple avertissement suffit à la corriger.
 */
export const MOTIFS_PERSONNELS: { cle: string; libelle: string; motif: RegExp }[] = [
  { cle: "email", libelle: "une adresse électronique", motif: /[\w.+-]+@[\w-]+\.[a-z]{2,}/i },
  { cle: "telephone", libelle: "un numéro de téléphone", motif: /(?:\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/ },
  { cle: "carte", libelle: "un numéro de carte", motif: /\b(?:\d[ -]?){13,19}\b/ },
];

export function coordonneesDansLeRecit(recit: string): string[] {
  return MOTIFS_PERSONNELS.filter((m) => m.motif.test(recit)).map((m) => m.libelle);
}

/** Ce qui se passe après le signalement — publication en premier. */
export const APRES_SIGNALEMENT = [
  {
    titre: "Votre problème devient public",
    desc: "Il apparaît sur la fiche de l’entreprise, aux côtés des autres situations signalées.",
  },
  {
    titre: "Vous recevez votre courrier de réclamation",
    desc: "Rédigé à partir de votre situation, prêt à envoyer.",
  },
  {
    titre: "Vous suivez vos échéances",
    desc: "Les délais utiles sont calculés à partir des dates que vous avez indiquées.",
  },
  {
    titre: "Vous mettez à jour votre situation",
    desc: "Vous seul indiquez si votre problème a été résolu.",
  },
] as const;

/** Ce que le signalement embarque, annoncé sur l'accueil. */
export const INCLUS = [
  "Courrier adapté",
  "Étapes à suivre",
  "Échéances",
  "Recours possibles",
] as const;

/**
 * Ce qui est public, ce qui ne l'est pas.
 *
 * Affiché en toutes lettres avant publication : c'est la seule façon honnête
 * de recueillir un consentement, et cela évite la demande de retrait qui suit
 * une mauvaise surprise.
 */
export const CE_QUI_EST_PUBLIC = [
  "L’intitulé de votre problème, composé automatiquement",
  "Ce que vous demandez, et où en est le professionnel",
  "Le nombre de relances que vous déclarez",
  "La catégorie, le statut et la date",
  "Le montant, si vous l’acceptez",
] as const;

export const CE_QUI_RESTE_PRIVE = [
  "Votre adresse électronique",
  "Vos justificatifs",
  "Votre numéro de commande",
  "Votre identité",
] as const;

/**
 * Issues possibles d'un problème déclaré résolu.
 *
 * « Résolu » seul n'apprend rien : un remboursement obtenu et un geste
 * commercial consenti ne décrivent pas la même issue. C'est cette nuance qui
 * renseigne la personne qui lira la fiche ensuite, et elle ne coûte qu'un clic
 * à celle qui la déclare.
 */
export const RESULTATS = [
  "Remboursement obtenu",
  "Commande reçue",
  "Produit remplacé",
  "Produit réparé",
  "Commande annulée",
  "Geste commercial",
  "Réponse satisfaisante",
  "Autre",
] as const;

/** Où en est le problème, du point de vue de son auteur. */
export const SITUATIONS_SUIVI = [
  { cle: "en-cours", libelle: "Toujours en cours", desc: "Rien n’a changé, ou la réponse ne vous satisfait pas." },
  { cle: "partiel", libelle: "Partiellement résolu", desc: "Vous avez obtenu une partie de ce que vous demandiez." },
  { cle: "resolu", libelle: "Résolu", desc: "Votre demande a abouti." },
] as const;

/**
 * Situation du tunnel correspondant à une catégorie de la fiche.
 *
 * La fiche compte six motifs — ceux que la base sait compter — et le tunnel dix
 * situations. Cliquer un motif doit ouvrir l'étape 1 sur la bonne ligne :
 * refaire choisir ce qui vient d'être choisi est le meilleur moyen de perdre
 * quelqu'un entre deux écrans.
 */
export function situationPourMotif(categorie: string): string {
  return SITUATIONS.find((s) => s.categorie === categorie)?.cle ?? "autre";
}

/**
 * Cible du signalement : entreprise répertoriée, ou saisie libre.
 *
 * Treize millions de fiches ne couvrent pas tout : une boutique en ligne sans
 * personne morale identifiée, une société étrangère, une enseigne qu'aucun
 * registre français ne connaît. Refuser ces signalements reviendrait à
 * renvoyer chez elle la personne dont le problème est précisément qu'elle ne
 * sait pas à qui elle a affaire.
 *
 * Le fragment réservé ne peut entrer en collision avec aucun slug réel : ceux
 * d'entreprises se terminent tous par les neuf chiffres du SIREN.
 */
export const CIBLE_LIBRE = "autre";
