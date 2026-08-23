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
      "Chantier abandonné",
      "Retard",
      "Dommage causé",
      "Facture contestée",
    ],
    exemple:
      "Après la réparation, le problème initial persiste et une nouvelle anomalie est apparue. J’ai demandé à l’entreprise de reprendre l’intervention.",
  },
  {
    cle: "achat",
    libelle: "Achat ou livraison",
    desc: "Commande, produit, remboursement",
    categories: [
      "Commande non reçue",
      "Produit défectueux",
      "Remboursement non reçu",
      "Garantie refusée",
      "Produit différent",
    ],
    exemple:
      "J’ai commandé un article qui n’est jamais arrivé. Mes relances au service client sont restées sans réponse.",
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
    ],
    exemple:
      "J’ai demandé la résiliation de mon contrat. Les prélèvements se sont poursuivis les mois suivants.",
  },
  {
    cle: "autre",
    libelle: "Autre situation",
    // Le handoff ne donne pas de description à cette carte : les trois autres
    // énumèrent des exemples, celle-ci n'en a pas à donner sans mentir.
    desc: "",
    categories: ["Autre problème"],
    exemple:
      "Décrivez les faits : ce que vous avez demandé, ce qui s’est passé, et ce que vous avez tenté depuis.",
  },
];

export const SOLUTIONS = [
  "Une réparation ou reprise des travaux",
  "Un remboursement",
  "Un remplacement",
  "Une réduction du prix",
  "Autre solution",
] as const;

export const DATES_APPROX = [
  { cle: "cette-semaine", libelle: "Cette semaine", jours: 3 },
  { cle: "ce-mois", libelle: "Ce mois-ci", jours: 15 },
  { cle: "plus-ancien", libelle: "Il y a plus d’un mois", jours: 60 },
] as const;

/**
 * Chaque catégorie précise retombe sur une des six clés d'agrégation.
 *
 * Les libellés d'avant la refonte du parcours restent dans la table. Ils ne
 * sont plus proposés, mais ils dorment dans les brouillons déjà ouverts et
 * dans les signalements publiés : les retirer ferait retomber ces
 * déclarations-là sur « AUTRE », c'est-à-dire perdre leur nature.
 */
const VERS_ENUM: Record<string, CategorieLitige> = {
  // Prestation
  "Prestation ou travaux mal réalisés": "SAV",
  "Chantier abandonné": "SAV",
  Retard: "SAV",
  "Dommage causé": "SAV",
  "Facture contestée": "REMBOURSEMENT",
  // Achat
  "Commande non reçue": "LIVRAISON",
  "Produit défectueux": "GARANTIE",
  "Remboursement non reçu": "REMBOURSEMENT",
  "Garantie refusée": "GARANTIE",
  "Produit différent": "LIVRAISON",
  // Contrat
  "Résiliation non prise en compte": "RESILIATION",
  "Prélèvement contesté": "RESILIATION",
  "Facturation incorrecte": "REMBOURSEMENT",
  "Service non fourni": "SAV",
  "Renouvellement non souhaité": "RESILIATION",
  "Autre problème": "AUTRE",
  // Libellés hérités
  "Prestation inachevée ou chantier abandonné": "SAV",
  "Retard ou intervention non effectuée": "SAV",
  "Dommage causé pendant l’intervention": "SAV",
  "Facture ou supplément contesté": "REMBOURSEMENT",
  "Refus de reprendre ou corriger le travail": "GARANTIE",
  "Produit différent de celui commandé": "LIVRAISON",
};

export function categorieEnum(precise: string): CategorieLitige {
  return VERS_ENUM[precise] ?? "AUTRE";
}

const VERS_DEMANDE: Record<string, DemandeConsommateur> = {
  "Une réparation ou reprise des travaux": "REPARATION",
  "Un remboursement": "REMBOURSEMENT_INTEGRAL",
  "Un remplacement": "REMPLACEMENT",
  "Une réduction du prix": "REMBOURSEMENT_PARTIEL",
  "Autre solution": "AUTRE",
  // Libellés hérités
  "La fin de la prestation": "AUTRE",
  "L’annulation du contrat": "RESILIATION",
  "L’arrêt des prélèvements": "RESILIATION",
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
  SAV: { famille: "prestation", categorie: "Prestation ou travaux mal réalisés" },
  RESILIATION: { famille: "contrat", categorie: "Résiliation non prise en compte" },
  AUTRE: { famille: "autre", categorie: "Autre problème" },
};

/**
 * Le résumé public, au style rapporté.
 *
 * Le handoff laisse ce point ouvert : « règles de reformulation au style
 * rapporté, retrait des données personnelles et garde-fous sur les
 * accusations ». Tant qu'elles ne sont pas écrites, le résumé n'est pas tiré
 * du récit.
 *
 * Ce n'est pas un pis-aller. Le récit confidentiel contient des noms de
 * salariés, des plaques, des numéros de commande et parfois des mots que la
 * plateforme s'interdit — « arnaque », « escroc ». Le reformuler à l'aveugle
 * publierait tout cela sous une syntaxe plus propre. Les trois phrases sont
 * donc construites à partir des seuls choix fermés : famille, catégorie,
 * solution. Rien n'y entre que le consommateur n'ait sélectionné lui-même, et
 * « Modifier le résumé public » le ramène précisément à ces choix.
 */
const OUVERTURE: Record<string, string> = {
  prestation: "Le consommateur indique avoir fait appel à cette entreprise pour une prestation.",
  achat: "Le consommateur indique avoir effectué un achat auprès de cette entreprise.",
  contrat: "Le consommateur indique être lié à cette entreprise par un contrat ou un abonnement.",
  autre: "Le consommateur déclare rencontrer un problème avec cette entreprise.",
};

export function resumePublic(famille: string, categorie: string, solution: string): string[] {
  const phrases = [OUVERTURE[famille] ?? OUVERTURE.autre];
  if (categorie) {
    phrases.push(`Selon sa déclaration, le problème rencontré relève de la catégorie « ${categorie.toLowerCase()} ».`);
  }
  if (solution) {
    phrases.push(`Il demande ${solution.toLowerCase()}.`);
  }
  return phrases;
}
