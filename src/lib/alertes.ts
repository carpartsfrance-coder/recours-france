/**
 * Points de vigilance relevés sur une entreprise.
 *
 * Chaque élément est dérivé d'un fait vérifiable — un événement des registres
 * publics ou un agrégat de dossiers — et porte sa source. Aucun élément n'est
 * rédigé à la main : si le fait disparaît, l'alerte disparaît.
 */
import { formatDate, formatDateLongue } from "./format";
import type { StatistiquesEntreprise } from "./stats";

export type NiveauAlerte = "elevee" | "surveiller" | "information" | "favorable";

export type Alerte = {
  niveau: NiveauAlerte;
  libelle: string;
  titre: string;
  description: string;
  source: string;
};

export const LIBELLES_NIVEAU: Record<NiveauAlerte, string> = {
  elevee: "Vigilance élevée",
  surveiller: "À surveiller",
  information: "Information",
  favorable: "Élément favorable",
};

export function couleurNiveau(niveau: NiveauAlerte): string {
  switch (niveau) {
    case "elevee":
      return "var(--rfi-rouge)";
    case "surveiller":
      return "var(--rfi-ambre)";
    case "favorable":
      return "var(--rfi-vert)";
    default:
      return "var(--rfi-neutre)";
  }
}

const ORDRE: NiveauAlerte[] = ["elevee", "surveiller", "information", "favorable"];
const MOIS = 30.44 * 86_400_000;

type EntreeAlertes = {
  entreprise: {
    denomination: string;
    etatAdministratif: "ACTIVE" | "CESSEE";
    dateImmatriculation: Date | null;
    dateCessation: Date | null;
    commune: string | null;
  };
  comptes: { exercice: number; dateCloture: Date | null; dateDepot: Date | null; confidentiel: boolean }[];
  evenements: {
    date: Date;
    source: string;
    titre: string;
    detail: string | null;
    categorie: string | null;
    procedureCollective: boolean;
  }[];
  stats: StatistiquesEntreprise;
  /** Dossiers avec justificatif encore ouverts, avec leur ancienneté en jours. */
  ouverts: { jours: number }[];
};

export function construireAlertes(e: EntreeAlertes): Alerte[] {
  const alertes: Alerte[] = [];
  const maintenant = Date.now();

  // ── État administratif ────────────────────────────────────────────────────
  if (e.entreprise.etatAdministratif === "CESSEE") {
    alertes.push({
      niveau: "elevee",
      libelle: LIBELLES_NIVEAU.elevee,
      titre: "Entreprise cessée",
      description: `Cessation d’activité enregistrée${
        e.entreprise.dateCessation ? ` le ${formatDateLongue(e.entreprise.dateCessation)}` : ""
      }. Une réclamation reste possible, mais l’interlocuteur peut être un mandataire.`,
      source: "Sirene (Insee)",
    });
  }

  // ── Procédures collectives ────────────────────────────────────────────────
  const procedures = e.evenements.filter((ev) => ev.procedureCollective);
  const procedureRecente = procedures.find((p) => maintenant - p.date.getTime() < 36 * MOIS);
  if (procedureRecente) {
    alertes.push({
      niveau: "elevee",
      libelle: LIBELLES_NIVEAU.elevee,
      titre: "Procédure collective publiée",
      description: `${procedureRecente.titre}, publiée le ${formatDateLongue(procedureRecente.date)}. Une créance peut devoir être déclarée au mandataire dans les délais légaux.`,
      source: "BODACC",
    });
  } else if (procedures.length) {
    alertes.push({
      niveau: "information",
      libelle: LIBELLES_NIVEAU.information,
      titre: "Ancienne procédure collective",
      description: `Dernière procédure publiée le ${formatDateLongue(procedures[0].date)}, soit il y a plus de trois ans. Aucune procédure en cours détectée.`,
      source: "BODACC",
    });
  }

  // ── Volume et ancienneté des dossiers ─────────────────────────────────────
  if (e.stats.evolution90j !== null && e.stats.evolution90j >= 15) {
    const motif = e.stats.motifs[0]?.libelle.toLowerCase();
    alertes.push({
      niveau: "elevee",
      libelle: LIBELLES_NIVEAU.elevee,
      titre: "Hausse des signalements sur 90 jours",
      description: `+ ${Math.round(e.stats.evolution90j)} % de nouveaux dossiers par rapport au trimestre précédent${motif ? `, principalement sur le motif ${motif}` : ""}.`,
      source: "Déclarations des consommateurs",
    });
  } else if (e.stats.evolution90j !== null && e.stats.evolution90j <= -15 && e.stats.total12Mois >= 10) {
    alertes.push({
      niveau: "favorable",
      libelle: LIBELLES_NIVEAU.favorable,
      titre: "Baisse des signalements sur 90 jours",
      description: `− ${Math.abs(Math.round(e.stats.evolution90j))} % de nouveaux dossiers par rapport au trimestre précédent.`,
      source: "Déclarations des consommateurs",
    });
  }

  const anciens = e.ouverts.filter((o) => o.jours > 30);
  const tresAnciens = e.ouverts.filter((o) => o.jours > 60);
  if (anciens.length) {
    const plusAncien = Math.max(...e.ouverts.map((o) => o.jours));
    alertes.push({
      niveau: anciens.length >= 3 ? "elevee" : "surveiller",
      libelle: anciens.length >= 3 ? LIBELLES_NIVEAU.elevee : LIBELLES_NIVEAU.surveiller,
      titre: `${anciens.length} dossier${anciens.length > 1 ? "s" : ""} avec justificatif ouvert${anciens.length > 1 ? "s" : ""} depuis plus de 30 jours`,
      description: `${
        tresAnciens.length
          ? `Dont ${tresAnciens.length} sans résolution déclarée après 60 jours. `
          : ""
      }Le plus ancien est ouvert depuis ${plusAncien} jours.`,
      source: "Dossiers enregistrés",
    });
  }

  if (e.stats.tauxNonResolus !== null && e.stats.tauxNonResolus >= 35 && e.stats.clotures >= 10) {
    alertes.push({
      niveau: "elevee",
      libelle: LIBELLES_NIVEAU.elevee,
      titre: "Part élevée de dossiers clôturés sans résolution",
      description: `${Math.round(e.stats.tauxNonResolus)} % des dossiers avec justificatif clôturés le sont sans résolution confirmée par le consommateur, sur ${e.stats.clotures} dossiers.`,
      source: "Dossiers avec justificatif",
    });
  }

  if (e.stats.tauxReponse !== null && e.stats.tauxReponse < 50 && e.stats.verifies >= 10) {
    alertes.push({
      niveau: "surveiller",
      libelle: LIBELLES_NIVEAU.surveiller,
      titre: "Réponse du professionnel rarement déclarée",
      description: `${Math.round(100 - e.stats.tauxReponse)} % des consommateurs ne déclarent aucune réponse du professionnel, sur ${e.stats.verifies} dossiers avec justificatif.`,
      source: "Déclarations des consommateurs",
    });
  }

  // ── Comptes annuels ───────────────────────────────────────────────────────
  const enRetard = e.comptes.filter((c) => estEnRetard(c));
  if (enRetard.length) {
    const c = enRetard[0];
    alertes.push({
      niveau: "surveiller",
      libelle: LIBELLES_NIVEAU.surveiller,
      titre: `Comptes ${c.exercice} déposés en retard`,
      description: `Dépôt effectué le ${formatDate(c.dateDepot)}, au-delà du délai légal de sept mois suivant la clôture de l’exercice.`,
      source: "BODACC",
    });
  }

  const anneeCourante = new Date().getFullYear();
  const attendus = [anneeCourante - 1, anneeCourante - 2, anneeCourante - 3];
  const manquants = attendus.filter((a) => !e.comptes.some((c) => c.exercice === a));
  if (manquants.length >= 2) {
    alertes.push({
      niveau: manquants.length === 3 ? "elevee" : "surveiller",
      libelle: manquants.length === 3 ? LIBELLES_NIVEAU.elevee : LIBELLES_NIVEAU.surveiller,
      titre: `${manquants.length} exercices sans dépôt de comptes publié`,
      description: `Aucune publication trouvée pour les exercices ${manquants.join(", ")}. Le dépôt des comptes annuels est une obligation légale pour la plupart des sociétés commerciales.`,
      source: "BODACC",
    });
  }

  if (e.comptes.some((c) => c.confidentiel)) {
    const c = e.comptes.find((x) => x.confidentiel)!;
    alertes.push({
      niveau: "information",
      libelle: LIBELLES_NIVEAU.information,
      titre: "Comptes déposés avec déclaration de confidentialité",
      description: `Les comptes de l’exercice ${c.exercice} ont été déposés accompagnés d’une déclaration de confidentialité : le détail n’est pas consultable publiquement.`,
      source: "BODACC",
    });
  }

  // ── Événements juridiques notables ────────────────────────────────────────
  const dirigeant = trouverEvenement(e.evenements, ["dirigeant", "président", "gérant", "nomination", "directeur"]);
  if (dirigeant && maintenant - dirigeant.date.getTime() < 24 * MOIS) {
    alertes.push({
      niveau: "surveiller",
      libelle: LIBELLES_NIVEAU.surveiller,
      titre: "Changement de dirigeant",
      description: `${dirigeant.detail ?? dirigeant.titre} Déclaration enregistrée le ${formatDateLongue(dirigeant.date)}.`,
      source: sourceLisible(dirigeant.source),
    });
  }

  const siege = trouverEvenement(e.evenements, ["siège", "transfert", "adresse"]);
  if (siege && maintenant - siege.date.getTime() < 60 * MOIS) {
    alertes.push({
      niveau: "information",
      libelle: LIBELLES_NIVEAU.information,
      titre: "Changement de siège social",
      description: `${siege.detail ?? siege.titre} Enregistré le ${formatDateLongue(siege.date)}. Le SIREN et la personnalité juridique sont inchangés.`,
      source: sourceLisible(siege.source),
    });
  }

  // ── Éléments favorables ───────────────────────────────────────────────────
  if (!procedures.length && e.entreprise.etatAdministratif === "ACTIVE") {
    const dernier = e.comptes[0];
    alertes.push({
      niveau: "favorable",
      libelle: LIBELLES_NIVEAU.favorable,
      titre: "Aucune procédure collective",
      description: `Aucune sauvegarde, redressement ou liquidation judiciaire publiée à ce jour. Entreprise active${
        dernier ? `, comptes ${dernier.exercice} déposés` : ""
      }.`,
      source: "BODACC",
    });
  }

  const ans = e.entreprise.dateImmatriculation
    ? Math.floor((maintenant - e.entreprise.dateImmatriculation.getTime()) / (365.25 * 86_400_000))
    : null;
  if (ans !== null && ans >= 10) {
    alertes.push({
      niveau: "favorable",
      libelle: LIBELLES_NIVEAU.favorable,
      titre: `${ans} ans d’activité continue`,
      description: `Immatriculée le ${formatDateLongue(e.entreprise.dateImmatriculation)}, sans interruption enregistrée dans les registres publics.`,
      source: "Sirene (Insee)",
    });
  } else if (ans !== null && ans < 2) {
    alertes.push({
      niveau: "surveiller",
      libelle: LIBELLES_NIVEAU.surveiller,
      titre: "Entreprise récente",
      description: `Immatriculée le ${formatDateLongue(e.entreprise.dateImmatriculation)} : moins de deux ans d’activité, et donc peu d’historique public disponible.`,
      source: "Sirene (Insee)",
    });
  }

  return alertes.sort((a, b) => ORDRE.indexOf(a.niveau) - ORDRE.indexOf(b.niveau));
}

/** Le dépôt des comptes est dû dans les sept mois suivant la clôture de l'exercice. */
export function estEnRetard(compte: { dateCloture: Date | null; dateDepot: Date | null }): boolean {
  if (!compte.dateCloture || !compte.dateDepot) return false;
  const limite = new Date(compte.dateCloture);
  limite.setMonth(limite.getMonth() + 7);
  return compte.dateDepot > limite;
}

function trouverEvenement(
  evenements: EntreeAlertes["evenements"],
  motsCles: string[],
): EntreeAlertes["evenements"][number] | undefined {
  return evenements.find((ev) => {
    const texte = `${ev.titre} ${ev.detail ?? ""}`.toLowerCase();
    return motsCles.some((m) => texte.includes(m));
  });
}

function sourceLisible(source: string): string {
  switch (source) {
    case "RNE":
      return "RNE / INPI";
    case "SIRENE":
      return "Sirene (Insee)";
    default:
      return source;
  }
}

export function resumerAlertes(alertes: Alerte[]): string {
  const attention = alertes.filter((a) => a.niveau === "elevee" || a.niveau === "surveiller").length;
  const favorables = alertes.filter((a) => a.niveau === "favorable").length;
  if (!attention && !favorables) return "Aucun élément particulier relevé";
  const parts: string[] = [];
  if (attention) parts.push(`${attention} élément${attention > 1 ? "s" : ""} nécessite${attention > 1 ? "nt" : ""} votre attention`);
  if (favorables) parts.push(`${favorables} élément${favorables > 1 ? "s" : ""} favorable${favorables > 1 ? "s" : ""}`);
  return parts.join(" · ");
}
