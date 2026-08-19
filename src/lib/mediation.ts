/**
 * Publication du médiateur compétent.
 *
 * Un médiateur ne se déduit pas d'un secteur d'activité : une entreprise adhère
 * à un organisme précis, qu'elle est légalement tenue de nommer dans ses
 * conditions générales. Le rapprochement sectoriel, lui, produit des résultats
 * plausibles et faux — la vente en ligne compte vingt et un organismes
 * référencés, et rien ne dit lequel a été choisi par tel commerçant.
 *
 * Or l'erreur coûte cher au consommateur : une saisine adressée au mauvais
 * médiateur est irrecevable, et les deux mois de délai sont consommés pour
 * rien. C'est précisément l'échéance que la plateforme existe pour protéger.
 *
 * Le rapprochement sectoriel reste utile en interne — pour prioriser, pour
 * suggérer une piste à un administrateur — mais il n'est jamais publié comme
 * « le médiateur de X ».
 */

/** Valeur inscrite lorsque le médiateur provient des CGV de l'entreprise. */
export const ADHESION_DECLAREE = "Déclarée par l’entreprise";

export type MediateurPublie = {
  nom: string;
  delaiInstruction: string | null;
  siteWeb: string | null;
} | null;

/**
 * Le médiateur rattaché à cette entreprise peut-il être publié ?
 *
 * Uniquement s'il a été relevé dans les conditions générales de l'entreprise.
 */
export function mediateurPublie(entreprise: {
  mediateurAdhesionDepuis?: string | null;
  mediateur?: { nom: string; delaiInstruction: string | null; siteWeb: string | null } | null;
}): MediateurPublie {
  if (!entreprise.mediateur) return null;
  if (entreprise.mediateurAdhesionDepuis !== ADHESION_DECLAREE) return null;
  return {
    nom: entreprise.mediateur.nom,
    delaiInstruction: entreprise.mediateur.delaiInstruction,
    siteWeb: entreprise.mediateur.siteWeb,
  };
}

/** Lien vers la liste officielle, à proposer quand le médiateur n'est pas établi. */
export const LISTE_OFFICIELLE =
  "https://www.economie.gouv.fr/mediation-conso/saisir-mediateur";
