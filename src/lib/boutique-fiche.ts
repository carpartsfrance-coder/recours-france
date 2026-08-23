/**
 * Contenu éditorial de la fiche boutique.
 *
 * La copie du handoff Carpartsfrance est validée : elle est reprise au mot
 * près, espaces insécables comprises — celles-ci sont posées à l'affichage par
 * `typo()`, pas écrites en dur, pour qu'une relecture du texte reste possible.
 *
 * Le prototype parle de Carpartsfrance.fr ; la page en sert cent quatre-vingt
 * mille. Tout ce qui nomme la boutique est donc paramétré, et rien de ce qui
 * la caractérise n'est écrit ici.
 *
 * ── Les huit portes d'entrée ───────────────────────────────────────────────
 * Le handoff laisse ce point ouvert : « Définir le mapping catégorie de
 * boutique → jeu de huit catégories ». Les catégories du prototype sont
 * automobiles — pièce incompatible, retour ou consigne — et les servir à une
 * boutique de fleurs ferait fuir la seule personne qu'on voulait aider.
 *
 * Le rattachement se fait par le secteur de la société exploitante quand elle
 * est connue. Quand elle ne l'est pas — c'est le cas de la grande majorité des
 * domaines — le jeu générique s'applique : il ne suppose rien du commerce, ce
 * qui est exactement l'état de nos connaissances.
 */

import type { ComponentType, SVGProps } from "react";
import {
  Alerte, Bouclier, Bulle, Carte, Cle, Colis, Document, Horloge,
  Question, Remboursement, Retour, Telephone,
} from "@/components/refonte/icones";

type Icone = ComponentType<SVGProps<SVGSVGElement> & { taille?: number }>;

export type PorteEntree = {
  /** Le motif transmis au tunnel, qui présélectionne la situation. */
  motif: "REMBOURSEMENT" | "LIVRAISON" | "GARANTIE" | "SAV" | "RESILIATION" | "AUTRE";
  /** Identifiant stable, distinct du motif : deux portes peuvent le partager. */
  cle: string;
  libelle: string;
  icone: Icone;
};

/** Les deux portes que tout commerce partage, en tête et en queue de grille. */
const COMMANDE: PorteEntree = { cle: "commande", motif: "LIVRAISON", libelle: "Commande non reçue", icone: Colis };
const AUTRE: PorteEntree = { cle: "autre", motif: "AUTRE", libelle: "Autre problème", icone: Question };
const REMBOURSEMENT: PorteEntree = { cle: "remboursement", motif: "REMBOURSEMENT", libelle: "Remboursement non reçu", icone: Remboursement };
const SERVICE_CLIENT: PorteEntree = { cle: "service-client", motif: "SAV", libelle: "Service client injoignable", icone: Telephone };
const GARANTIE: PorteEntree = { cle: "garantie", motif: "GARANTIE", libelle: "Garantie refusée", icone: Bouclier };

/** Le jeu du prototype, mot pour mot, réservé aux boutiques automobiles. */
const AUTOMOBILE: PorteEntree[] = [
  COMMANDE,
  { cle: "incompatible", motif: "GARANTIE", libelle: "Pièce incompatible", icone: Cle },
  { cle: "defectueuse", motif: "GARANTIE", libelle: "Pièce défectueuse", icone: Alerte },
  REMBOURSEMENT,
  GARANTIE,
  { cle: "retour", motif: "REMBOURSEMENT", libelle: "Retour ou consigne", icone: Retour },
  SERVICE_CLIENT,
  AUTRE,
];

const GENERIQUE: PorteEntree[] = [
  COMMANDE,
  { cle: "non-conforme", motif: "GARANTIE", libelle: "Produit non conforme", icone: Document },
  { cle: "defectueux", motif: "GARANTIE", libelle: "Produit défectueux", icone: Alerte },
  REMBOURSEMENT,
  GARANTIE,
  { cle: "retour", motif: "REMBOURSEMENT", libelle: "Retour sans suite", icone: Retour },
  SERVICE_CLIENT,
  AUTRE,
];

/** Abonnements et services en ligne : le litige porte sur le contrat, pas sur un colis. */
const ABONNEMENT: PorteEntree[] = [
  { cle: "resiliation", motif: "RESILIATION", libelle: "Résiliation non prise en compte", icone: Carte },
  { cle: "prelevement", motif: "RESILIATION", libelle: "Prélèvement contesté", icone: Remboursement },
  { cle: "service-indispo", motif: "SAV", libelle: "Service inaccessible", icone: Alerte },
  { cle: "engagement", motif: "AUTRE", libelle: "Engagement non annoncé", icone: Document },
  REMBOURSEMENT,
  { cle: "hausse", motif: "AUTRE", libelle: "Hausse de tarif imposée", icone: Bulle },
  SERVICE_CLIENT,
  AUTRE,
];

/** Voyage et hébergement : l'annulation et le report dominent les réclamations. */
const VOYAGE: PorteEntree[] = [
  { cle: "annulation", motif: "REMBOURSEMENT", libelle: "Séjour ou trajet annulé", icone: Horloge },
  { cle: "non-conforme-sejour", motif: "GARANTIE", libelle: "Prestation non conforme", icone: Document },
  REMBOURSEMENT,
  { cle: "surclassement", motif: "AUTRE", libelle: "Réservation non honorée", icone: Alerte },
  { cle: "frais", motif: "AUTRE", libelle: "Frais non annoncés", icone: Carte },
  { cle: "bagage", motif: "LIVRAISON", libelle: "Bagage perdu ou abîmé", icone: Colis },
  SERVICE_CLIENT,
  AUTRE,
];

const PAR_SECTEUR: Record<string, PorteEntree[]> = {
  automobile: AUTOMOBILE,
  reparation: AUTOMOBILE,
  numerique: ABONNEMENT,
  telecom: ABONNEMENT,
  energie: ABONNEMENT,
  voyage: VOYAGE,
};

export function portesEntree(secteur: string | null | undefined): PorteEntree[] {
  return PAR_SECTEUR[secteur ?? ""] ?? GENERIQUE;
}

/* ── Que faire ? Trois étapes, reprises du prototype ─────────────────────── */

export type Demarche = { cle: string; titre: string; resume: string; corps: string[] };

export const DEMARCHES: Demarche[] = [
  {
    cle: "e1",
    titre: "Contacter la boutique par écrit",
    resume: "Adressez une réclamation claire au service client ou via le formulaire de contact du site.",
    corps: [
      "Rappelez le numéro de commande, la date d’achat et la référence de la pièce. Indiquez la solution attendue et un délai de réponse. Conservez une copie de chaque échange : cette trace conditionne toutes les démarches suivantes.",
    ],
  },
  {
    cle: "e2",
    titre: "Conserver vos preuves",
    resume: "Gardez toutes les preuves : commandes, échanges, factures, justificatifs et suivis.",
    corps: [
      "Capture de la commande, confirmation de paiement, suivi du colis, échanges avec le service client, constat du garagiste en cas de pièce défectueuse. Ce dossier sert de base à votre réclamation puis, si nécessaire, à une mise en demeure.",
    ],
  },
  {
    cle: "e3",
    titre: "Poursuivre les démarches",
    resume: "Si la réponse ne vous satisfait pas, d’autres solutions existent pour faire valoir vos droits.",
    corps: [
      "Mise en demeure en recommandé avec avis de réception, saisine du médiateur de la consommation dont relève le vendeur, signalement sur SignalConso ou recours judiciaire selon le montant en jeu.",
      // Le handoff l'exige : aucun délai légal universel, aucune date calculée.
      // Hors contexte, « quatorze jours » fait renoncer un consommateur qui
      // n'est pas hors délai, et le délai dépend du fondement invoqué.
      "Les délais applicables dépendent de votre contrat, du produit et du médiateur compétent. Nous les précisons une fois votre situation connue.",
    ],
  },
];

/**
 * La référence automobile de la première étape est propre au prototype.
 * Ailleurs, « la référence de la pièce » ne veut rien dire.
 */
export function demarchesPour(secteur: string | null | undefined): Demarche[] {
  const auto = PAR_SECTEUR[secteur ?? ""] === AUTOMOBILE;
  if (auto) return DEMARCHES;
  return DEMARCHES.map((d) =>
    d.cle === "e1"
      ? { ...d, corps: [d.corps[0].replace("la référence de la pièce", "la référence du produit")] }
      : d.cle === "e2"
        ? { ...d, corps: [d.corps[0].replace(", constat du garagiste en cas de pièce défectueuse", "")] }
        : d,
  );
}

/* ── Les trois temps du parcours ─────────────────────────────────────────── */

export const PARCOURS = [
  { titre: "Décrivez les faits", desc: "Expliquez votre problème en quelques minutes." },
  { titre: "Rendez votre litige visible", desc: "Votre litige est publié pour informer d’autres consommateurs." },
  {
    titre: "Obtenez votre courrier et vos prochaines étapes",
    desc: "Recevez un courrier adapté et des conseils personnalisés.",
  },
];

/* ── Questions fréquentes ────────────────────────────────────────────────── */

export type QuestionFAQ = { cle: string; q: string; r: string };

/**
 * Les cinq questions du handoff. Les réponses de `q1` et `q5` sont non
 * négociables : elles disent ce que la plateforme ne fait pas, et c'est la
 * seule chose qui la sépare d'une promesse qu'elle ne tient pas.
 */
export const FAQ: QuestionFAQ[] = [
  {
    cle: "q1",
    q: "Recours France publie-t-il des avis clients ?",
    r: "Recours France n’est pas une plateforme de notation. Elle permet aux consommateurs de publier des litiges précis et de présenter leur évolution. Aucune note, aucune étoile, aucun avis commercial général n’est publié sur cette fiche.",
  },
  {
    cle: "q2",
    q: "Comment rendre un litige visible ?",
    r: "Cliquez sur « Rendre mon litige visible », décrivez les faits, indiquez la date et la solution attendue. La publication est gratuite et immédiate après votre validation. Vous pouvez ensuite compléter votre dossier pour obtenir votre courrier.",
  },
  {
    cle: "q3",
    q: "Mes données personnelles sont-elles publiques ?",
    r: "Non. Votre identité, votre adresse e-mail et vos justificatifs restent confidentiels. Seuls la catégorie du problème, la date, la solution demandée et le statut du litige apparaissent sur cette fiche.",
  },
  {
    cle: "q4",
    q: "Combien de temps mon litige reste-t-il en ligne ?",
    r: "Le litige reste visible tant que vous le souhaitez. Vous pouvez le modifier, indiquer qu’il a été résolu ou demander son retrait à tout moment depuis votre espace.",
  },
  {
    cle: "q5",
    q: "Recours France peut-il résoudre mon litige ?",
    r: "Non. La plateforme ne transmet pas les réclamations aux entreprises, n’oblige aucune entreprise à répondre et n’intervient pas dans le règlement du litige. Elle rend votre situation visible et prépare vos courriers ; les démarches restent effectuées par vos soins.",
  },
];

/**
 * Les trois questions de référencement, ajoutées « quand la donnée existe ».
 *
 * La condition n'est pas décorative. « Quels litiges ont été signalés
 * concernant X ? » sans un seul litige publié est une question dont la réponse
 * est vide : Google appelle cela du contenu mince, et la servir sur cent
 * quatre-vingt mille pages ferait exactement le contraire de ce qu'on cherche.
 */
export function questionsReferencement(nom: string, litiges: number, portes: PorteEntree[]): QuestionFAQ[] {
  if (litiges === 0) return [];
  const remboursement = portes.some((p) => p.motif === "REMBOURSEMENT");
  const auto = portes.some((p) => p.cle === "incompatible");
  const defaut = portes.some((p) => p.cle.startsWith("defect"));
  return [
    {
      cle: "s1",
      q: `Quels litiges ont été signalés concernant ${nom} ?`,
      r: `Les litiges publiés sur cette page sont ceux que des consommateurs ont choisi de rendre visibles. Ils sont classés par catégorie et par statut, avec la date de publication et la solution demandée. Recours France ne vérifie pas le récit des faits.`,
    },
    ...(remboursement
      ? [
          {
            cle: "s2",
            q: `Comment demander un remboursement à ${nom} ?`,
            r: "Adressez d’abord une réclamation écrite au service client, en rappelant la commande et la somme attendue. Sans réponse satisfaisante, la mise en demeure puis le médiateur de la consommation sont les étapes suivantes. Conservez chaque échange : ce sont eux qui rendent la demande recevable.",
          },
        ]
      : []),
    ...(defaut
      ? [
          {
            cle: "s3",
            q: auto
              ? "Que faire si une pièce automobile est incompatible ou défectueuse ?"
              : "Que faire si le produit reçu est non conforme ou défectueux ?",
            r: auto
              ? "La garantie légale de conformité couvre le défaut comme l’erreur de référence, sans qu’il soit besoin d’en démontrer l’origine. Signalez-le au vendeur par écrit, joignez la référence commandée et celle reçue, et gardez la pièce en l’état : la renvoyer avant accord fait perdre la preuve."
              : "La garantie légale de conformité couvre le défaut comme l’erreur de référence, sans qu’il soit besoin d’en démontrer l’origine. Signalez-le au vendeur par écrit, décrivez ce qui a été commandé et ce qui a été reçu, et conservez le produit en l’état : le renvoyer avant accord fait perdre la preuve.",
          },
        ]
      : []),
  ];
}
