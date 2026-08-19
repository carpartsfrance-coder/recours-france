/**
 * Mise en forme d'un signalement pour l'affichage public.
 *
 * Aucun texte libre du consommateur n'est publié : le résumé visible est
 * produit ici à partir des seules données structurées (règle métier n° 7).
 */
import type { Dossier } from "@/components/fiche/dossiers";
import { avecJustificatif } from "./format";
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
  /** Expression structurée : elle rend le résumé public spécifique au dossier. */
  demande?: string | null;
  etatProfessionnel?: string | null;
  relances?: number | null;
};

export function versDossier(s: SignalementPublic): Dossier {
  const verifie = avecJustificatif(s.niveauVerification);
  const clos = s.closLe !== null;
  const jours = Math.max(
    0,
    Math.round(((clos ? s.closLe!.getTime() : Date.now()) - s.creeLe.getTime()) / JOUR),
  );
  const statut = etatDossier(s.statut, s.resolutionConfirmee, s.reponseDeclaree);

  return {
    reference: s.reference,
    motif: intituleDossier(s.categorie),
    montant: s.montant ? `Montant déclaré : ${formatMontant(Number(s.montant))}` : "Montant non déclaré",
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
        cle: "Niveau de preuve",
        valeur: verifie ? "Pièce fournie, horodatée et scellée" : "Aucune pièce fournie",
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
    resume: resumeFactuel(s.categorie, s.statut, s.reponseDeclaree, s.resolutionConfirmee, verifie, {
      demande: s.demande,
      etatProfessionnel: s.etatProfessionnel,
      relances: s.relances,
      montant: s.montant ? formatMontant(Number(s.montant)) : null,
    }),
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
  if (statut === "NON_RESOLU") return { libelle: "Résolution non confirmée", classe: "rfi-statut--rouge" };
  if (statut === "ABANDONNE") return { libelle: "Abandonné", classe: "rfi-statut--neutre" };
  if (statut === "RESOLUTION_PARTIELLE") return { libelle: "Résolution partielle", classe: "rfi-statut--ambre" };
  if (statut === "REPONSE_DECLAREE" || statut === "SOLUTION_PROPOSEE" || reponse)
    return { libelle: "En cours", classe: "rfi-statut--ambre" };
  // Recours France ne reçoit pas les réponses des professionnels : dire « sans
  // réponse » affirmerait un fait qu'on ne peut pas connaître.
  return { libelle: "Aucune réponse enregistrée", classe: "rfi-statut--neutre" };
}

export function resumeFactuel(
  categorie: string,
  statut: string,
  reponse: boolean,
  resolu: boolean,
  verifie: boolean,
  structure?: {
    demande?: string | null;
    etatProfessionnel?: string | null;
    relances?: number | null;
    montant?: string | null;
  },
): string {
  // L'objet du litige : ce que le consommateur demande, quand il l'a précisé.
  // À défaut, on retombe sur la formulation générique par catégorie.
  const objet = structure?.demande
    ? phraseDemande(structure.demande, categorie, structure.montant ?? null)
    : objetParCategorie(categorie);

  // Où en est le professionnel. La déclaration structurée est plus précise que
  // le simple booléen « une réponse a été déclarée ».
  const suite = structure?.etatProfessionnel
    ? phraseProfessionnel(structure.etatProfessionnel, structure.relances ?? null, Boolean(structure.demande))
    : reponse
      ? "Le consommateur déclare avoir reçu une réponse du professionnel."
      : "Le consommateur ne déclare aucune réponse du professionnel à ce jour.";

  const fin = resolu
    ? "La résolution a été confirmée par le consommateur après clôture."
    : statut === "NON_RESOLU"
      ? "Aucune résolution n’a été confirmée : le dossier est déclaré non résolu."
      : statut === "ABANDONNE"
        ? "Le dossier a été clôturé sans suite par le consommateur."
        : "Aucune résolution n’a été confirmée à ce jour.";

  const niveau = verifie ? "" : " Dossier sans justificatif : exclu des taux publiés.";

  return `${objet} ${suite} ${fin}${niveau}`;
}

function objetParCategorie(categorie: string): string {
  switch (categorie) {
    case "REMBOURSEMENT":
      return "Un remboursement déclaré non reçu après annulation, rétractation ou retour.";
    case "LIVRAISON":
      return "Une livraison déclarée non conforme, incomplète ou très en retard.";
    case "GARANTIE":
      return "Une prise en charge au titre de la garantie légale déclarée refusée.";
    case "SAV":
      return "Une intervention de service après-vente déclarée non assurée.";
    case "RESILIATION":
      return "Des prélèvements déclarés poursuivis après une demande de résiliation.";
    default:
      return "Un litige de consommation déclaré.";
  }
}

function phraseDemande(demande: string, categorie: string, montant: string | null): string {
  const somme = montant ? ` de ${montant}` : "";
  const contexte =
    categorie === "REMBOURSEMENT"
      ? " après annulation, rétractation ou retour"
      : categorie === "GARANTIE"
        ? " au titre de la garantie légale"
        : categorie === "LIVRAISON"
          ? " après un problème de livraison"
          : "";

  switch (demande) {
    case "REMBOURSEMENT_INTEGRAL":
      return `Le consommateur demande un remboursement intégral${somme}${contexte}.`;
    case "REMBOURSEMENT_PARTIEL":
      return `Le consommateur demande un remboursement partiel${somme}${contexte}.`;
    case "LIVRAISON":
      return "Le consommateur demande la livraison effective de sa commande.";
    case "REPARATION":
      return `Le consommateur demande la réparation du bien${contexte}.`;
    case "REMPLACEMENT":
      return `Le consommateur demande le remplacement du bien${contexte}.`;
    case "RESILIATION":
      return "Le consommateur demande la résiliation de son contrat et l’arrêt des prélèvements.";
    default:
      return objetParCategorie(categorie);
  }
}

function phraseProfessionnel(etat: string, relances: number | null, sujetDejaPose: boolean): string {
  const sujet = sujetDejaPose ? "Il" : "Le consommateur";
  const rappel =
    relances === null || relances < 1
      ? ""
      : relances >= 3
        ? " après trois relances ou plus"
        : relances === 2
          ? " après deux relances"
          : " après une relance";

  switch (etat) {
    case "AUCUNE_REPONSE":
      return `${sujet} déclare n’avoir obtenu aucune réponse${rappel}.`;
    case "REPONSE_SANS_SOLUTION":
      return `${sujet} déclare avoir obtenu une réponse sans solution${rappel}.`;
    case "PROMESSE_NON_TENUE":
      return `${sujet} déclare une promesse de solution non tenue${rappel}.`;
    case "REFUS_MOTIVE":
      return `${sujet} déclare un refus motivé du professionnel${rappel}.`;
    case "SOLUTION_PARTIELLE":
      return `${sujet} déclare une solution partielle${rappel}.`;
    default:
      return `${sujet} ne déclare aucune réponse du professionnel à ce jour.`;
  }
}
