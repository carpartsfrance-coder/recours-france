/**
 * Rappels au consommateur, aux dates que le guide calcule déjà.
 *
 * Le guide des démarches produit deux échéances utiles — la relance écrite du
 * professionnel à trente jours, et l'ouverture de la médiation à soixante jours
 * après la réclamation écrite. Jusqu'ici ces dates dormaient dans un PDF que
 * personne ne rouvre. Les rappeler le jour venu est ce qui transforme un
 * document en accompagnement.
 *
 * Périmètre inchangé : ces messages vont AU CONSOMMATEUR. Recours France
 * n'écrit toujours rien au professionnel et ne transmet rien.
 */

const JOUR = 86_400_000;

/**
 * Un rappel dont l'échéance est dépassée de plus de deux semaines n'est plus
 * un rappel. Cette fenêtre évite surtout qu'une première mise en service
 * n'expédie d'un coup l'arriéré de tous les dossiers ouverts.
 */
export const FENETRE_ENVOI = 14 * JOUR;

export type CleRelance = "relance-30j" | "mediation";

export type Rappel = {
  cle: CleRelance;
  echeance: Date;
  objet: string;
  titre: string;
  /** Ce que le consommateur peut faire aujourd'hui, en une phrase. */
  action: string;
};

/** Échéances du dossier, alignées sur construireGuide(). */
export function echeances(dateSignalement: Date, contactPrealable: string | null) {
  const ecritDejaFait = contactPrealable === "ECRIT";
  const departMediation = new Date(dateSignalement.getTime() + (ecritDejaFait ? 0 : 7 * JOUR));
  return {
    relance30j: new Date(dateSignalement.getTime() + 30 * JOUR),
    ouvertureMediation: new Date(departMediation.getTime() + 60 * JOUR),
  };
}

/**
 * Le rappel à envoyer aujourd'hui pour ce dossier, ou null.
 *
 * Un seul à la fois, le plus ancien d'abord : deux messages le même jour
 * seraient perçus comme du harcèlement et brouilleraient l'action à mener.
 */
export function rappelDuJour(
  signalement: {
    creeLe: Date;
    contactPrealable: string | null;
    relancesEnvoyees: string[];
    relancesActives: boolean;
    statut: string;
    closLe: Date | null;
    resolutionConfirmee: boolean;
    moderation: string;
  },
  maintenant: Date = new Date(),
): Rappel | null {
  if (!signalement.relancesActives) return null;
  if (signalement.closLe || signalement.resolutionConfirmee) return null;
  if (signalement.statut !== "EN_COURS") return null;
  if (signalement.moderation !== "PUBLIE") return null;

  const { relance30j, ouvertureMediation } = echeances(signalement.creeLe, signalement.contactPrealable);

  const candidats: Rappel[] = [
    {
      cle: "relance-30j",
      echeance: relance30j,
      objet: "Il est temps de relancer le professionnel",
      titre: "Trente jours sans réponse satisfaisante",
      action:
        "Relancez le professionnel par écrit en rappelant votre première demande et sa date. Cette relance conditionne la suite : sans trace écrite, le médiateur déclarera votre saisine irrecevable.",
    },
    {
      cle: "mediation",
      echeance: ouvertureMediation,
      objet: "Vous pouvez saisir le médiateur à partir d’aujourd’hui",
      titre: "La médiation vous est ouverte",
      action:
        "Le délai de deux mois après votre réclamation écrite est écoulé : la saisine du médiateur de la consommation est désormais recevable. Elle est gratuite et reste à votre initiative.",
    },
  ];

  const du = candidats
    .filter((r) => !signalement.relancesEnvoyees.includes(r.cle))
    .filter((r) => {
      const retard = maintenant.getTime() - r.echeance.getTime();
      return retard >= 0 && retard <= FENETRE_ENVOI;
    })
    .sort((a, b) => a.echeance.getTime() - b.echeance.getTime());

  return du[0] ?? null;
}
