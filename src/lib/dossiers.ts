/**
 * Mise en forme d'un signalement pour l'affichage public.
 *
 * Aucun texte libre du consommateur n'est publié : le résumé visible est
 * produit ici à partir des seules données structurées (règle métier n° 7).
 */
import type { Dossier } from "@/components/fiche/dossiers";
import { formatDateLongue, formatMontant, LIBELLES_CATEGORIE } from "./format";

const JOUR = 86_400_000;

type SignalementPublic = {
  reference: string;
  categorie: string;
  montant: unknown;
  creeLe: Date;
  closLe: Date | null;
  majLe: Date;
  statut: string;
  niveauVerification: string;
  reponseDeclaree: boolean;
  resolutionConfirmee: boolean;
};

export function versDossier(s: SignalementPublic): Dossier {
  const verifie = s.niveauVerification === "VERIFIE";
  const clos = s.closLe !== null;
  const jours = Math.max(
    0,
    Math.round(((clos ? s.closLe!.getTime() : Date.now()) - s.creeLe.getTime()) / JOUR),
  );
  const statut = etatDossier(s.statut, s.resolutionConfirmee, s.reponseDeclaree);

  return {
    reference: s.reference,
    motif: intituleDossier(s.categorie),
    montant: s.montant ? formatMontant(Number(s.montant)) : "montant non déclaré",
    verifie,
    resolu: s.resolutionConfirmee,
    date: formatDateLongue(s.creeLe),
    duree: clos ? libelleDuree("Clos en", jours) : libelleDuree("Ouvert depuis", jours),
    dureeAlerte: !clos && jours > 60,
    statut: statut.libelle,
    statutClasse: statut.classe,
    detail: [
      { cle: "Catégorie", valeur: LIBELLES_CATEGORIE[s.categorie] ?? s.categorie },
      { cle: "Montant déclaré", valeur: s.montant ? formatMontant(Number(s.montant)) : "Non déclaré" },
      {
        cle: "Vérification",
        valeur: verifie ? "Pièce contrôlée par Recours France" : "Aucun justificatif contrôlé",
      },
      {
        cle: "Réponse du professionnel",
        valeur: s.reponseDeclaree ? "Oui, selon le consommateur" : "Non renseignée",
      },
      {
        cle: "Résolution",
        valeur: s.resolutionConfirmee ? "Confirmée par le consommateur" : "Non confirmée",
      },
      {
        cle: clos ? "Clôture" : "Dernière mise à jour",
        valeur: formatDateLongue(clos ? s.closLe : s.majLe),
      },
    ],
    resume: resumeFactuel(s.categorie, s.statut, s.reponseDeclaree, s.resolutionConfirmee, verifie),
  };
}

export function intituleDossier(categorie: string): string {
  switch (categorie) {
    case "REMBOURSEMENT":
      return "Remboursement non reçu";
    case "LIVRAISON":
      return "Problème de livraison";
    case "GARANTIE":
      return "Garantie refusée";
    case "SAV":
      return "Service après-vente défaillant";
    case "RESILIATION":
      return "Prélèvement après résiliation";
    default:
      return "Pratique contestée";
  }
}

/** « Ouvert depuis 1 jour » plutôt que « depuis 0 jours » pour un dépôt du jour. */
export function libelleDuree(prefixe: string, jours: number): string {
  if (jours <= 0) return prefixe.startsWith("Clos") ? "Clos le jour même" : "Ouvert aujourd’hui";
  if (jours === 1) return `${prefixe} 1 jour`;
  return `${prefixe} ${jours} jours`;
}

export function etatDossier(
  statut: string,
  resolu: boolean,
  reponse: boolean,
): { libelle: string; classe: string } {
  if (resolu || statut === "RESOLU_CONFIRME") return { libelle: "Résolu", classe: "rfi-statut--vert" };
  if (statut === "NON_RESOLU") return { libelle: "Non résolu", classe: "rfi-statut--rouge" };
  if (statut === "ABANDONNE") return { libelle: "Abandonné", classe: "rfi-statut--neutre" };
  if (statut === "RESOLUTION_PARTIELLE") return { libelle: "Résolution partielle", classe: "rfi-statut--ambre" };
  if (statut === "REPONSE_DECLAREE" || statut === "SOLUTION_PROPOSEE" || reponse)
    return { libelle: "En cours", classe: "rfi-statut--ambre" };
  return { libelle: "Sans réponse", classe: "rfi-statut--neutre" };
}

export function resumeFactuel(
  categorie: string,
  statut: string,
  reponse: boolean,
  resolu: boolean,
  verifie: boolean,
): string {
  const objet =
    categorie === "REMBOURSEMENT"
      ? "Un remboursement déclaré non reçu après annulation, rétractation ou retour"
      : categorie === "LIVRAISON"
        ? "Une livraison déclarée non conforme, incomplète ou très en retard"
        : categorie === "GARANTIE"
          ? "Une prise en charge au titre de la garantie légale déclarée refusée"
          : categorie === "SAV"
            ? "Une intervention de service après-vente déclarée non assurée"
            : categorie === "RESILIATION"
              ? "Des prélèvements déclarés poursuivis après une demande de résiliation"
              : "Un litige de consommation déclaré";

  const suite = reponse
    ? "Le consommateur déclare avoir reçu une réponse du professionnel."
    : "Le consommateur ne déclare aucune réponse du professionnel à ce jour.";

  const fin = resolu
    ? "La résolution a été confirmée par le consommateur après clôture."
    : statut === "NON_RESOLU"
      ? "Aucune résolution n’a été confirmée : le dossier est déclaré non résolu."
      : statut === "ABANDONNE"
        ? "Le dossier a été clôturé sans suite par le consommateur."
        : "Aucune résolution n’a été confirmée à ce jour.";

  const niveau = verifie ? "" : " Dossier non vérifié : exclu des taux publiés.";

  return `${objet}. ${suite} ${fin}${niveau}`;
}
