/**
 * Veille juridique sur l'entreprise, au profit du consommateur.
 *
 * La plateforme synchronise déjà le BODACC tous les jours et sait détecter une
 * procédure collective. Jusqu'ici cette information ne s'affichait que sur la
 * fiche, pour un visiteur de passage — jamais à la personne qui a un litige
 * ouvert contre cette entreprise, c'est-à-dire la seule qui joue quelque chose.
 *
 * Or l'enjeu est net : en sauvegarde, redressement ou liquidation, un créancier
 * dispose de DEUX MOIS à compter de la publication au BODACC pour déclarer sa
 * créance (art. L622-24 et R622-24 du code de commerce). Passé ce délai, elle
 * est éteinte. Presque personne ne le sait, et personne ne surveille le BODACC
 * pour son propre litige.
 *
 * C'est la seule chose que Recours France puisse faire et qu'un particulier ne
 * peut pas : croiser un litige et une publication légale.
 */

const JOUR = 86_400_000;

/** Délai de déclaration de créance, à compter de la publication au BODACC. */
export const DELAI_DECLARATION_JOURS = 60;

export type AlerteVeille = {
  /** Clé de suivi : une alerte n'est jamais envoyée deux fois. */
  cle: string;
  type: "procedure" | "cessation";
  objet: string;
  titre: string;
  constat: string;
  action: string;
  /** Date au-delà de laquelle il sera trop tard, quand il en existe une. */
  echeance: Date | null;
};

/**
 * L'alerte à envoyer aujourd'hui pour ce dossier, ou null.
 *
 * Une seule à la fois, la plus grave d'abord : une procédure collective prime
 * sur une cessation, car elle porte un délai couperet.
 */
export function alerteVeille(
  signalement: {
    relancesEnvoyees: string[];
    statut: string;
    closLe: Date | null;
    resolutionConfirmee: boolean;
  },
  entreprise: {
    denomination: string;
    etatAdministratif: string;
    dateCessation: Date | null;
    evenements: { id: string; titre: string; date: Date; procedureCollective: boolean }[];
  } | null,
  maintenant: Date = new Date(),
): AlerteVeille | null {
  if (!entreprise) return null;
  // Un dossier clos ou résolu n'a plus de créance à déclarer.
  if (signalement.closLe || signalement.resolutionConfirmee) return null;
  if (signalement.statut !== "EN_COURS") return null;

  // ── Procédure collective ─────────────────────────────────────────────────
  // On ne retient que les publications dont le délai de déclaration court
  // encore : annoncer une échéance déjà dépassée n'aide pas, ça angoisse.
  const procedure = entreprise.evenements
    .filter((e) => e.procedureCollective)
    .filter((e) => {
      const age = maintenant.getTime() - e.date.getTime();
      return age >= 0 && age <= DELAI_DECLARATION_JOURS * JOUR;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

  if (procedure && !signalement.relancesEnvoyees.includes(`procedure:${procedure.id}`)) {
    const echeance = new Date(procedure.date.getTime() + DELAI_DECLARATION_JOURS * JOUR);
    return {
      cle: `procedure:${procedure.id}`,
      type: "procedure",
      objet: "Votre créance doit être déclarée",
      titre: `${entreprise.denomination} fait l’objet d’une procédure collective`,
      constat: `${procedure.titre}, publiée au BODACC le ${dateFr(procedure.date)}.`,
      action:
        "Si vous réclamez une somme d’argent, vous devez la déclarer auprès du mandataire judiciaire dans les deux mois qui suivent cette publication. Passé ce délai, votre créance est éteinte : elle ne peut plus être réclamée, même si votre litige est fondé.",
      echeance,
    };
  }

  // ── Cessation d'activité ─────────────────────────────────────────────────
  if (entreprise.etatAdministratif === "CESSEE" && !signalement.relancesEnvoyees.includes("cessation")) {
    return {
      cle: "cessation",
      type: "cessation",
      objet: "L’entreprise a cessé son activité",
      titre: `${entreprise.denomination} a cessé son activité`,
      constat: entreprise.dateCessation
        ? `Cessation enregistrée au répertoire Sirene le ${dateFr(entreprise.dateCessation)}.`
        : "Cessation enregistrée au répertoire Sirene.",
      action:
        "Votre réclamation reste possible, mais votre interlocuteur n’est probablement plus le service consommateurs. Vérifiez si une procédure collective a été publiée : dans ce cas, un mandataire judiciaire est désigné et votre créance doit lui être déclarée.",
      echeance: null,
    };
  }

  return null;
}

function dateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
