import type { CategorieLitige, DemandeConsommateur } from "@prisma/client";

/**
 * Taxonomie du tunnel, refonte d'août 2026.
 *
 * Quatre familles, une vingtaine de catégories précises. La copie est reprise
 * au mot près du handoff.
 *
 * Le libellé précis est ce que lit le visiteur de la fiche ; l'énumération
 * `CategorieLitige` reste dessous, pour agréger. Sans ce doublement, publier
 * « SAV » là où le consommateur a écrit « Prestation inachevée ou chantier
 * abandonné » lui ferait dire autre chose que ce qu'il a choisi.
 */

export type Famille = {
  cle: string;
  libelle: string;
  desc: string;
  categories: string[];
  exemple: string;
};

export const FAMILLES: Famille[] = [
  {
    cle: "prestation",
    libelle: "Prestation, réparation ou travaux",
    desc: "Garage, artisan, chantier, intervention",
    categories: [
      "Prestation ou travaux mal réalisés",
      "Prestation inachevée ou chantier abandonné",
      "Retard ou intervention non effectuée",
      "Dommage causé pendant l’intervention",
      "Facture ou supplément contesté",
      "Refus de reprendre ou corriger le travail",
      "Autre problème",
    ],
    exemple:
      "J’ai confié mon véhicule à cette entreprise pour une réparation. Après l’intervention, la panne était toujours présente et l’entreprise a refusé une nouvelle prise en charge.",
  },
  {
    cle: "achat",
    libelle: "Achat ou livraison",
    desc: "Commande, produit, remboursement",
    categories: [
      "Remboursement non reçu",
      "Commande non reçue",
      "Produit défectueux",
      "Garantie refusée",
      "Produit différent de celui commandé",
      "Autre problème",
    ],
    exemple:
      "J’ai commandé un article auprès de cette entreprise. Le produit n’est jamais arrivé et je n’ai reçu ni livraison ni remboursement malgré mes relances.",
  },
  {
    cle: "contrat",
    libelle: "Contrat, abonnement ou prélèvement",
    desc: "Résiliation, facturation, paiement",
    categories: [
      "Résiliation non prise en compte",
      "Prélèvement contesté",
      "Facturation incorrecte",
      "Service non fourni",
      "Renouvellement non souhaité",
      "Autre problème",
    ],
    exemple:
      "J’ai demandé la résiliation de mon contrat. Les prélèvements se sont poursuivis les mois suivants et ma demande est restée sans réponse.",
  },
  {
    cle: "autre",
    libelle: "Autre situation",
    desc: "Aucune des familles ci-dessus",
    categories: ["Autre problème"],
    exemple:
      "Décrivez les faits : ce que vous avez demandé à l’entreprise, ce qui s’est passé, et ce que vous avez tenté depuis.",
  },
];

export const SOLUTIONS = [
  "Un remboursement",
  "Une réparation ou reprise des travaux",
  "Un remplacement",
  "La fin de la prestation",
  "L’annulation du contrat",
  "L’arrêt des prélèvements",
  "Une réduction du prix",
  "Une autre solution",
] as const;

export const DATES_APPROX = [
  { cle: "cette-semaine", libelle: "Cette semaine", jours: 3 },
  { cle: "ce-mois", libelle: "Ce mois-ci", jours: 15 },
  { cle: "plus-ancien", libelle: "Il y a plus d’un mois", jours: 60 },
] as const;

/** Chaque catégorie précise retombe sur une des six clés d'agrégation. */
const VERS_ENUM: Record<string, CategorieLitige> = {
  "Prestation ou travaux mal réalisés": "SAV",
  "Prestation inachevée ou chantier abandonné": "SAV",
  "Retard ou intervention non effectuée": "SAV",
  "Dommage causé pendant l’intervention": "SAV",
  "Facture ou supplément contesté": "REMBOURSEMENT",
  "Refus de reprendre ou corriger le travail": "GARANTIE",
  "Remboursement non reçu": "REMBOURSEMENT",
  "Commande non reçue": "LIVRAISON",
  "Produit défectueux": "GARANTIE",
  "Garantie refusée": "GARANTIE",
  "Produit différent de celui commandé": "LIVRAISON",
  "Résiliation non prise en compte": "RESILIATION",
  "Prélèvement contesté": "RESILIATION",
  "Facturation incorrecte": "REMBOURSEMENT",
  "Service non fourni": "SAV",
  "Renouvellement non souhaité": "RESILIATION",
  "Autre problème": "AUTRE",
};

export function categorieEnum(precise: string): CategorieLitige {
  return VERS_ENUM[precise] ?? "AUTRE";
}

const VERS_DEMANDE: Record<string, DemandeConsommateur> = {
  "Un remboursement": "REMBOURSEMENT_INTEGRAL",
  "Une réparation ou reprise des travaux": "REPARATION",
  "Un remplacement": "REMPLACEMENT",
  "La fin de la prestation": "AUTRE",
  "L’annulation du contrat": "RESILIATION",
  "L’arrêt des prélèvements": "RESILIATION",
  "Une réduction du prix": "REMBOURSEMENT_PARTIEL",
  "Une autre solution": "AUTRE",
};

export function demandeEnum(solution: string): DemandeConsommateur {
  return VERS_DEMANDE[solution] ?? "AUTRE";
}

/**
 * L'ordre des familles, décidé par l'activité de l'entreprise.
 *
 * Un garage voit « Prestation, réparation ou travaux » en premier, un site de
 * vente à distance « Achat ou livraison ». Sans ce tri, tous les visiteurs
 * partent de la même liste et celui qui vient d'un garage doit lire trois
 * familles avant de trouver la sienne.
 */
export function famillesPour(naf: string | null, secteur: string | null): Famille[] {
  const tete = (() => {
    const code = (naf ?? "").replace(/\./g, "").toUpperCase();
    // Réparation automobile, construction, coiffure, réparation d'équipements :
    // des activités de service où le litige porte sur une prestation.
    if (/^(45[23]|43|41|33|95|96)/.test(code)) return "prestation";
    // Vente à distance, commerce de détail.
    if (/^(479|47|46)/.test(code)) return "achat";
    // Télécoms, assurance, banque, énergie : le litige porte sur un contrat.
    if (/^(61|64|65|66|35)/.test(code)) return "contrat";
    if (secteur === "vente-distance" || secteur === "commerce-detail") return "achat";
    if (secteur === "automobile" || secteur === "batiment") return "prestation";
    if (secteur === "telecom" || secteur === "energie" || secteur === "banque-assurance") return "contrat";
    return null;
  })();
  if (!tete) return FAMILLES;
  return [...FAMILLES].sort((a, b) => (a.cle === tete ? -1 : b.cle === tete ? 1 : 0));
}

/** La date approximative, ramenée à une date réelle pour le calcul des délais. */
export function dateDepuisChip(cle: string): Date {
  const jours = DATES_APPROX.find((d) => d.cle === cle)?.jours ?? 15;
  const d = new Date();
  d.setDate(d.getDate() - jours);
  return d;
}

/** La carte de la fiche préremplit famille et catégorie. */
export const DEPUIS_MOTIF: Record<string, { famille: string; categorie: string }> = {
  REMBOURSEMENT: { famille: "achat", categorie: "Remboursement non reçu" },
  LIVRAISON: { famille: "achat", categorie: "Commande non reçue" },
  GARANTIE: { famille: "achat", categorie: "Produit défectueux" },
  SAV: { famille: "prestation", categorie: "Refus de reprendre ou corriger le travail" },
  RESILIATION: { famille: "contrat", categorie: "Résiliation non prise en compte" },
  AUTRE: { famille: "autre", categorie: "Autre problème" },
};
