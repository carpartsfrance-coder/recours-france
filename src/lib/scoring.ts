/**
 * Calcul des indices publiés sur une fiche entreprise.
 *
 * Deux dimensions strictement séparées :
 *  — l'indice de transparence ne dépend QUE des registres publics ;
 *  — le score d'expérience des consommateurs ne repose QUE sur les signalements
 *    vérifiés des douze derniers mois, et n'est publié qu'à partir du seuil.
 * Aucune note n'est ajustée manuellement.
 */

export const SEUIL_PUBLICATION_EXPERIENCE = 30;
export const FENETRE_MOIS = 12;

export type CritereIndice = {
  cle: string;
  libelle: string;
  points: number;
  maximum: number;
  valeur: string;
  ton: "succes" | "alerte" | "erreur" | "neutre";
};

export type IndiceTransparence = {
  score: number;
  criteres: CritereIndice[];
  pointsForts: string[];
  pointsVigilance: string[];
};

export type EntreesTransparence = {
  denomination: string | null;
  siretSiege: string | null;
  naf: string | null;
  adresseSiege: string | null;
  dateImmatriculation: Date | null;
  etatAdministratif: "ACTIVE" | "CESSEE";
  representantLegal: string | null;
  capital: number | null;
  /** Exercices dont les comptes ont été déposés, du plus récent au plus ancien. */
  exercicesDeposes: { exercice: number; confidentiel: boolean }[];
  /** Nombre d'événements légaux enregistrés sur les 3 dernières années. */
  evenements3Ans: number;
  /** Procédures collectives détectées (date de l'annonce). */
  procedures: { date: Date }[];
  /** Sources ayant effectivement répondu lors de la dernière synchronisation. */
  sourcesSynchronisees: { sirene: boolean; rne: boolean; bodacc: boolean };
};

const POIDS = {
  identite: 20,
  active: 15,
  anciennete: 10,
  comptes: 25,
  coherence: 15,
  procedures: 15,
} as const;

export function calculerTransparence(e: EntreesTransparence): IndiceTransparence {
  const criteres: CritereIndice[] = [];
  const forts: string[] = [];
  const vigilance: string[] = [];

  // 1. Identité légale vérifiée — 20 pts.
  const elementsIdentite = [e.denomination, e.siretSiege, e.naf, e.adresseSiege].filter(Boolean).length;
  const pointsIdentite = Math.round((elementsIdentite / 4) * POIDS.identite);
  criteres.push({
    cle: "identite",
    libelle: "Identité légale",
    points: pointsIdentite,
    maximum: POIDS.identite,
    valeur: elementsIdentite === 4 ? "Vérifiée" : `${elementsIdentite}/4 éléments`,
    ton: elementsIdentite === 4 ? "succes" : "alerte",
  });
  if (elementsIdentite === 4) forts.push("Identité et établissements vérifiés");
  else vigilance.push("Identité incomplète dans les registres publics");

  // 2. Société active — 15 pts.
  const active = e.etatAdministratif === "ACTIVE";
  const anneeCreation = e.dateImmatriculation?.getFullYear() ?? null;
  criteres.push({
    cle: "active",
    libelle: "Société active",
    points: active ? POIDS.active : 0,
    maximum: POIDS.active,
    valeur: active ? (anneeCreation ? `Depuis ${anneeCreation}` : "Oui") : "Cessée",
    ton: active ? "succes" : "erreur",
  });
  if (!active) vigilance.push("Entreprise cessée selon les registres publics");

  // 3. Ancienneté — 10 pts, barème progressif.
  const ans = e.dateImmatriculation
    ? Math.floor((Date.now() - e.dateImmatriculation.getTime()) / (365.25 * 86_400_000))
    : null;
  const pointsAnciennete =
    ans === null ? 0 : ans >= 10 ? 10 : ans >= 5 ? 8 : ans >= 3 ? 6 : ans >= 1 ? 4 : 2;
  criteres.push({
    cle: "anciennete",
    libelle: "Ancienneté",
    points: pointsAnciennete,
    maximum: POIDS.anciennete,
    valeur: ans === null ? "Inconnue" : ans < 1 ? "Moins d’un an" : `${ans} ans`,
    ton: pointsAnciennete >= 8 ? "succes" : pointsAnciennete >= 4 ? "neutre" : "alerte",
  });
  if (ans !== null && ans >= 10) forts.push(`Société active depuis ${ans} ans`);
  if (ans !== null && ans < 2) vigilance.push("Entreprise récente : moins de deux ans d’activité");

  // 4. Régularité des dépôts de comptes — 25 pts, sur les 3 derniers exercices.
  const anneeCourante = new Date().getFullYear();
  const attendus = [anneeCourante - 1, anneeCourante - 2, anneeCourante - 3];
  const deposes = attendus.filter((a) => e.exercicesDeposes.some((d) => d.exercice === a));
  const confidentiels = deposes.filter((a) =>
    e.exercicesDeposes.some((d) => d.exercice === a && d.confidentiel),
  );
  // Un dépôt confidentiel compte pour moitié : la publication reste incomplète.
  const credit = deposes.length - confidentiels.length * 0.5;
  const pointsComptes = Math.round((credit / attendus.length) * POIDS.comptes);
  criteres.push({
    cle: "comptes",
    libelle: "Dépôts de comptes",
    points: pointsComptes,
    maximum: POIDS.comptes,
    valeur: `${deposes.length} / ${attendus.length} exercices`,
    ton: deposes.length === 3 ? "succes" : deposes.length >= 1 ? "alerte" : "erreur",
  });
  if (deposes.length === 3 && confidentiels.length === 0) forts.push("Comptes régulièrement déposés");
  if (deposes.length === 0) vigilance.push("Aucun dépôt de comptes trouvé sur les trois derniers exercices");
  else if (deposes.length < 3)
    vigilance.push(`${3 - deposes.length} exercice(s) sans dépôt de comptes publié`);
  if (confidentiels.length)
    vigilance.push(`${confidentiels.length} dépôt(s) accompagné(s) d’une déclaration de confidentialité`);

  // 5. Cohérence entre sources — 15 pts.
  const repondues = Object.values(e.sourcesSynchronisees).filter(Boolean).length;
  const pointsCoherence = Math.round((repondues / 3) * POIDS.coherence);
  criteres.push({
    cle: "coherence",
    libelle: "Cohérence Sirene / RNE / BODACC",
    points: pointsCoherence,
    maximum: POIDS.coherence,
    valeur: repondues === 3 ? "Conforme" : `${repondues}/3 sources`,
    ton: repondues === 3 ? "succes" : "neutre",
  });

  // 6. Absence de procédure collective — 15 pts.
  const recente = e.procedures.some((p) => Date.now() - p.date.getTime() < 3 * 365.25 * 86_400_000);
  const ancienne = e.procedures.length > 0 && !recente;
  const pointsProcedures = recente ? 0 : ancienne ? 7 : POIDS.procedures;
  criteres.push({
    cle: "procedures",
    libelle: "Procédures collectives",
    points: pointsProcedures,
    maximum: POIDS.procedures,
    valeur: recente ? "Procédure récente" : ancienne ? "Ancienne procédure" : "Aucune",
    ton: recente ? "erreur" : ancienne ? "alerte" : "succes",
  });
  if (!e.procedures.length) forts.push("Aucun événement collectif majeur détecté");
  else if (recente) vigilance.push("Procédure collective publiée au BODACC depuis moins de trois ans");

  criteres.push({
    cle: "evenements",
    libelle: "Événements juridiques",
    points: 0,
    maximum: 0,
    valeur: `${e.evenements3Ans} en 3 ans`,
    ton: "neutre",
  });

  const score = criteres.reduce((total, c) => total + c.points, 0);
  return {
    score: Math.max(0, Math.min(100, score)),
    criteres: criteres.filter((c) => c.maximum > 0 || c.cle === "evenements"),
    pointsForts: forts,
    pointsVigilance: vigilance,
  };
}

export type EntreesExperience = {
  /** Signalements vérifiés sur la fenêtre glissante de 12 mois. */
  verifies: number;
  /** Signalements vérifiés dont le consommateur déclare avoir reçu une réponse. */
  avecReponse: number;
  /** Signalements vérifiés clôturés (résolus, non résolus ou abandonnés). */
  clotures: number;
  /** Résolutions CONFIRMÉES par le consommateur (jamais déduites). */
  resolus: number;
  /** Signalements vérifiés clôturés sans résolution confirmée. */
  nonResolus: number;
  /** Délai médian, en jours, entre le dépôt et la confirmation de résolution. */
  delaiMedian: number | null;
  /** Variation du volume de signalements sur 90 jours, en pourcentage. */
  evolution90j: number | null;
};

export type IndiceExperience = {
  publie: boolean;
  score: number | null;
  criteres: CritereIndice[];
  motifNonPublication?: string;
};

export function calculerExperience(e: EntreesExperience): IndiceExperience {
  const tauxReponse = e.verifies ? (e.avecReponse / e.verifies) * 100 : null;
  const tauxResolution = e.clotures ? (e.resolus / e.clotures) * 100 : null;
  const tauxNonResolus = e.clotures ? (e.nonResolus / e.clotures) * 100 : null;

  const criteres: CritereIndice[] = [
    {
      cle: "reponse",
      libelle: "Réponse du professionnel déclarée",
      points: tauxReponse === null ? 0 : Math.round((tauxReponse / 100) * 30),
      maximum: 30,
      valeur: tauxReponse === null ? "—" : `${Math.round(tauxReponse)} %`,
      ton: ton(tauxReponse, 75, 55),
    },
    {
      cle: "resolution",
      libelle: "Résolution confirmée par le consommateur",
      points: tauxResolution === null ? 0 : Math.round((tauxResolution / 100) * 25),
      maximum: 25,
      valeur: tauxResolution === null ? "—" : `${Math.round(tauxResolution)} %`,
      ton: ton(tauxResolution, 70, 50),
    },
    {
      cle: "delai",
      libelle: "Délai médian déclaré",
      points: pointsDelai(e.delaiMedian),
      maximum: 20,
      valeur: e.delaiMedian === null ? "—" : `${e.delaiMedian} jours`,
      ton: e.delaiMedian === null ? "neutre" : e.delaiMedian <= 15 ? "succes" : e.delaiMedian <= 30 ? "alerte" : "erreur",
    },
    {
      cle: "non-resolus",
      libelle: "Signalements déclarés non résolus",
      points: tauxNonResolus === null ? 0 : Math.round(((100 - tauxNonResolus) / 100) * 15),
      maximum: 15,
      valeur: tauxNonResolus === null ? "—" : `${Math.round(tauxNonResolus)} %`,
      ton: tauxNonResolus === null ? "neutre" : tauxNonResolus <= 15 ? "succes" : tauxNonResolus <= 30 ? "alerte" : "erreur",
    },
    {
      cle: "evolution",
      libelle: "Évolution sur 90 jours",
      points: pointsEvolution(e.evolution90j),
      maximum: 10,
      valeur:
        e.evolution90j === null
          ? "—"
          : `${e.evolution90j > 0 ? "+ " : e.evolution90j < 0 ? "− " : ""}${Math.abs(Math.round(e.evolution90j))} %`,
      ton: e.evolution90j === null ? "neutre" : e.evolution90j <= 0 ? "succes" : e.evolution90j < 15 ? "alerte" : "erreur",
    },
  ];

  if (e.verifies < SEUIL_PUBLICATION_EXPERIENCE) {
    return {
      publie: false,
      score: null,
      criteres,
      motifNonPublication: "Données insuffisantes pour établir un score fiable",
    };
  }

  const score = criteres.reduce((total, c) => total + c.points, 0);
  return { publie: true, score: Math.max(0, Math.min(100, score)), criteres };
}

function ton(valeur: number | null, seuilVert: number, seuilAmbre: number): CritereIndice["ton"] {
  if (valeur === null) return "neutre";
  if (valeur >= seuilVert) return "succes";
  if (valeur >= seuilAmbre) return "alerte";
  return "erreur";
}

function pointsDelai(jours: number | null): number {
  if (jours === null) return 0;
  if (jours <= 7) return 20;
  if (jours <= 15) return 16;
  if (jours <= 30) return 11;
  if (jours <= 60) return 6;
  return 2;
}

function pointsEvolution(variation: number | null): number {
  if (variation === null) return 0;
  if (variation <= -10) return 10;
  if (variation <= 0) return 8;
  if (variation < 10) return 5;
  if (variation < 25) return 2;
  return 0;
}

/** Couleur d'affichage d'un score, cohérente avec l'annuaire et la fiche. */
export function couleurScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "var(--rf-texte-desactive)";
  if (score >= 80) return "var(--rf-succes)";
  if (score >= 60) return "var(--rf-alerte)";
  return "var(--rf-erreur)";
}

export function couleurTon(ton: CritereIndice["ton"]): string {
  switch (ton) {
    case "succes":
      return "var(--rf-succes)";
    case "alerte":
      return "var(--rf-alerte)";
    case "erreur":
      return "var(--rf-erreur)";
    default:
      return "var(--rf-encre)";
  }
}
