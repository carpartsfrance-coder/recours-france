/**
 * Règles de la contestation d'un signalement par l'entreprise.
 *
 * Le principe tient en une phrase : la charge de la preuve passe au déposant,
 * et son silence tranche à sa place.
 *
 * Sans cela, chaque contestation exigerait un arbitrage humain — le poste
 * qu'aucune équipe ne tient à l'échelle. Ici, la majorité des cas se règlent
 * sans que personne n'ait à juger quoi que ce soit : le consommateur ne répond
 * pas, la publication tombe. Un examen n'a lieu que sur le résidu, quand une
 * pièce est effectivement produite.
 *
 * La règle doit donc s'appliquer MÉCANIQUEMENT. Dès qu'on arbitre au cas par
 * cas, on recrée le poste de travail qu'on voulait éviter.
 */

const JOUR = 86_400_000;

/** Délai laissé au consommateur pour répondre. Annoncé dans la charte. */
export const DELAI_REPONSE_JOURS = 7;

export function echeanceDepuis(demandeLe: Date): Date {
  return new Date(demandeLe.getTime() + DELAI_REPONSE_JOURS * JOUR);
}

/** Une contestation est-elle recevable ? La motivation n'est pas optionnelle. */
export function motifRecevable(motif: string): string | null {
  const propre = motif.trim();
  if (propre.length < 40) {
    return "Expliquez précisément ce qui vous paraît inexact : un signalement non motivé n’ouvre aucune procédure.";
  }
  if (propre.length > 4000) return "La motivation est limitée à 4 000 caractères.";
  return null;
}

/**
 * Le silence a-t-il tranché ?
 *
 * Aucune tolérance, aucune marge d'appréciation : l'échéance est passée ou elle
 * ne l'est pas.
 */
export function silenceAcquis(
  contestation: { etat: string; echeanceReponse: Date | null; repondueLe: Date | null },
  maintenant: Date = new Date(),
): boolean {
  if (contestation.etat !== "PIECE_DEMANDEE") return false;
  if (contestation.repondueLe) return false;
  if (!contestation.echeanceReponse) return false;
  return contestation.echeanceReponse.getTime() <= maintenant.getTime();
}

/** Le consommateur peut-il encore répondre ? */
export function reponseEncorePossible(
  contestation: { etat: string; echeanceReponse: Date | null },
  maintenant: Date = new Date(),
): boolean {
  if (contestation.etat !== "PIECE_DEMANDEE") return false;
  if (!contestation.echeanceReponse) return false;
  return contestation.echeanceReponse.getTime() > maintenant.getTime();
}

export const LIBELLES_CONTESTATION: Record<string, string> = {
  OUVERTE: "Reçue",
  PIECE_DEMANDEE: "Pièce demandée au consommateur",
  RETIREE_SANS_REPONSE: "Retirée — sans réponse du consommateur",
  PIECE_FOURNIE: "Réponse reçue — à examiner",
  REJETEE: "Écartée — le signalement est maintenu",
  ACCEPTEE: "Retenue — le signalement a été retiré",
};
