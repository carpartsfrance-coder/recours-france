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

// ─────────────────────────────────────────────────────────────────────────────
// Appréciation générale (fiche entreprise)
//
// Cinq critères examinés séparément : trois reposent sur les registres publics,
// deux sur les dossiers vérifiés. Les deux familles ne sont jamais fondues dans
// un même critère. En dessous du seuil de publication, les deux critères
// déclaratifs ne sont pas évalués et l'indice repose sur les seuls registres.
// ─────────────────────────────────────────────────────────────────────────────

export type Verdict = "Satisfaisant" | "Moyen" | "Insuffisant" | "Non évalué";
export type FamilleCritere = "publique" | "declarative";

export type CritereAppreciation = {
  cle: string;
  libelle: string;
  constat: string;
  verdict: Verdict;
  famille: FamilleCritere;
};

export type Appreciation = {
  niveauVigilance: "faible" | "modéré" | "élevé";
  commentaire: string;
  criteres: CritereAppreciation[];
  indice: number;
  bande: string;
  comportementPublie: boolean;
};

export type EntreesAppreciation = {
  transparence: IndiceTransparence;
  experience: IndiceExperience;
  stats: {
    verifies: number;
    clotures: number;
    tauxReponse: number | null;
    tauxResolution: number | null;
    tauxNonResolus: number | null;
    delaiMedian: number | null;
  };
  anciennete: number | null;
  procedures: number;
  evenements3Ans: number;
  exercicesDeposes: number;
  exercicesEnRetard: number;
  chiffreAffaires: { exercice: number; valeur: number | null; resultat: number | null }[];
  alertesElevees: number;
  alertesSurveiller: number;
};

const POINTS_VERDICT: Record<Verdict, number> = {
  Satisfaisant: 20,
  Moyen: 13,
  Insuffisant: 6,
  "Non évalué": 0,
};

export function apprecier(e: EntreesAppreciation): Appreciation {
  const publie = e.experience.publie;

  // ── Critères déclaratifs (dossiers vérifiés) ──────────────────────────────
  const reclamations: CritereAppreciation = publie
    ? {
        cle: "reclamations",
        libelle: "Traitement des réclamations",
        constat: `${Math.round(e.stats.tauxReponse ?? 0)} % des consommateurs déclarent une réponse du professionnel${
          e.stats.delaiMedian !== null ? `, délai médian de ${e.stats.delaiMedian} jours` : ""
        }.`,
        verdict: verdictReponse(e.stats.tauxReponse, e.stats.delaiMedian),
        famille: "declarative",
      }
    : nonEvalue("reclamations", "Traitement des réclamations", e.stats.verifies);

  const resolution: CritereAppreciation = publie
    ? {
        cle: "resolution",
        libelle: "Taux de résolution",
        constat: `${Math.round(e.stats.tauxResolution ?? 0)} % des dossiers vérifiés clôturés sont déclarés résolus par le consommateur, sur ${e.stats.clotures} dossiers.`,
        verdict: seuils(e.stats.tauxResolution, 75, 55),
        famille: "declarative",
      }
    : nonEvalue("resolution", "Taux de résolution", e.stats.verifies);

  // ── Critères publics (registres) ──────────────────────────────────────────
  const identiteComplete = e.transparence.criteres.find((c) => c.cle === "identite")?.ton === "succes";
  const transparenceLegale: CritereAppreciation = {
    cle: "transparence",
    libelle: "Transparence légale",
    constat: `${identiteComplete ? "Identité complète dans les registres" : "Identité incomplète dans les registres"}, ${
      e.exercicesDeposes >= 3
        ? "comptes déposés sur les trois derniers exercices"
        : e.exercicesDeposes
          ? `${e.exercicesDeposes} exercice${e.exercicesDeposes > 1 ? "s" : ""} déposé${e.exercicesDeposes > 1 ? "s" : ""} sur trois`
          : "aucun dépôt de comptes trouvé"
    }${e.exercicesEnRetard ? `, dont ${e.exercicesEnRetard} en retard` : ""}.`,
    verdict:
      identiteComplete && e.exercicesDeposes >= 3 && !e.exercicesEnRetard
        ? "Satisfaisant"
        : e.exercicesDeposes >= 2
          ? "Moyen"
          : "Insuffisant",
    famille: "publique",
  };

  const dernier = e.chiffreAffaires[0];
  const precedent = e.chiffreAffaires[1];
  const resultatsPositifs = e.chiffreAffaires.filter((c) => (c.resultat ?? 0) > 0).length;
  const stabilite: CritereAppreciation = {
    cle: "stabilite",
    libelle: "Stabilité financière",
    constat: dernier?.valeur
      ? `Chiffre d’affaires ${dernier.exercice} de ${formaterMontantCourt(dernier.valeur)}${
          precedent?.valeur
            ? `, ${dernier.valeur >= precedent.valeur ? "en progression" : "en recul"} par rapport à ${precedent.exercice}`
            : ""
        }${
          e.chiffreAffaires.some((c) => c.resultat !== null)
            ? `, résultat ${resultatsPositifs >= 2 ? "positif sur les deux derniers exercices" : "négatif sur au moins un exercice récent"}`
            : ""
        }.`
      : "Aucun chiffre d’affaires publié dans les comptes déposés : la situation financière n’est pas vérifiable.",
    verdict: !dernier?.valeur
      ? "Non évalué"
      : resultatsPositifs >= 2 && (!precedent?.valeur || dernier.valeur >= precedent.valeur)
        ? "Satisfaisant"
        : resultatsPositifs >= 1
          ? "Moyen"
          : "Insuffisant",
    famille: "publique",
  };

  const anciennete: CritereAppreciation = {
    cle: "anciennete",
    libelle: "Ancienneté et événements juridiques",
    constat: `${
      e.anciennete === null
        ? "Ancienneté inconnue"
        : e.anciennete < 1
          ? "Moins d’un an d’activité"
          : `${e.anciennete} an${e.anciennete > 1 ? "s" : ""} d’activité`
    }, ${
      e.procedures
        ? `${e.procedures} procédure${e.procedures > 1 ? "s" : ""} collective${e.procedures > 1 ? "s" : ""} publiée${e.procedures > 1 ? "s" : ""}`
        : "aucune procédure collective"
    }, ${e.evenements3Ans} événement${e.evenements3Ans > 1 ? "s" : ""} enregistré${e.evenements3Ans > 1 ? "s" : ""} sur trois ans.`,
    verdict: e.procedures
      ? "Insuffisant"
      : e.anciennete !== null && e.anciennete >= 10
        ? "Satisfaisant"
        : e.anciennete !== null && e.anciennete >= 3
          ? "Moyen"
          : "Insuffisant",
    famille: "publique",
  };

  const criteres = [reclamations, resolution, transparenceLegale, stabilite, anciennete];

  // ── Indice de confiance ───────────────────────────────────────────────────
  const evalues = criteres.filter((c) => c.verdict !== "Non évalué");
  const obtenus = evalues.reduce((t, c) => t + POINTS_VERDICT[c.verdict], 0);
  const maximum = evalues.length * 20;
  const indice = maximum ? Math.round((obtenus / maximum) * 100) : 0;

  // ── Niveau de vigilance ───────────────────────────────────────────────────
  const niveauVigilance =
    e.alertesElevees >= 2 ? "élevé" : e.alertesElevees >= 1 || e.alertesSurveiller >= 2 ? "modéré" : "faible";

  const familleFaible = criteres.filter((c) => c.verdict === "Insuffisant");
  const commentaire = construireCommentaire(niveauVigilance, familleFaible, publie);

  return {
    niveauVigilance,
    commentaire,
    criteres,
    indice,
    bande: bandeIndice(indice),
    comportementPublie: publie,
  };
}

function nonEvalue(cle: string, libelle: string, verifies: number): CritereAppreciation {
  return {
    cle,
    libelle,
    constat: `Données insuffisantes pour établir un score fiable : ${verifies} dossier(s) vérifié(s) sur les douze derniers mois, seuil de publication à ${SEUIL_PUBLICATION_EXPERIENCE}.`,
    verdict: "Non évalué",
    famille: "declarative",
  };
}

function verdictReponse(taux: number | null, delai: number | null): Verdict {
  if (taux === null) return "Non évalué";
  const base = seuils(taux, 80, 60);
  if (base === "Satisfaisant" && delai !== null && delai > 30) return "Moyen";
  return base;
}

function seuils(valeur: number | null, satisfaisant: number, moyen: number): Verdict {
  if (valeur === null) return "Non évalué";
  if (valeur >= satisfaisant) return "Satisfaisant";
  if (valeur >= moyen) return "Moyen";
  return "Insuffisant";
}

function construireCommentaire(
  niveau: "faible" | "modéré" | "élevé",
  faibles: CritereAppreciation[],
  publie: boolean,
): string {
  const declaratifsFaibles = faibles.some((c) => c.famille === "declarative");
  const publicsFaibles = faibles.some((c) => c.famille === "publique");

  if (niveau === "élevé") {
    return publicsFaibles
      ? "La situation légale ou financière présente des anomalies, et le comportement déclaré face aux réclamations reste en deçà de la moyenne observée."
      : "Le comportement déclaré face aux réclamations reste nettement en deçà de la moyenne observée, alors que la situation légale ne présente pas d’anomalie.";
  }
  if (niveau === "modéré") {
    if (declaratifsFaibles && !publicsFaibles) {
      return "Le comportement déclaré face aux réclamations reste en deçà de la moyenne observée, alors que la situation légale et financière de l’entreprise ne présente pas d’anomalie.";
    }
    if (publicsFaibles && !declaratifsFaibles) {
      return "Les registres publics font apparaître des points à surveiller, alors que le traitement déclaré des réclamations ne présente pas d’écart notable.";
    }
    return "Quelques points méritent votre attention, sans anomalie majeure dans les registres publics.";
  }
  return publie
    ? "Aucun point de vigilance majeur : les registres publics sont à jour et le traitement déclaré des réclamations se situe dans la moyenne observée."
    : "Aucun point de vigilance majeur dans les registres publics. Le comportement face aux réclamations n’est pas encore évaluable, faute d’un volume suffisant de dossiers vérifiés.";
}

export function bandeIndice(indice: number): string {
  if (indice >= 80) return "situation favorable";
  if (indice >= 60) return "situation correcte, avec points de vigilance";
  if (indice >= 40) return "situation fragile";
  return "situation défavorable";
}

export function couleurVerdict(verdict: Verdict): string {
  switch (verdict) {
    case "Satisfaisant":
      return "var(--rfi-vert)";
    case "Moyen":
      return "var(--rfi-ambre)";
    case "Insuffisant":
      return "var(--rfi-rouge)";
    default:
      return "var(--rfi-neutre)";
  }
}

export function couleurVigilance(niveau: "faible" | "modéré" | "élevé"): string {
  return niveau === "élevé" ? "var(--rfi-rouge)" : niveau === "modéré" ? "var(--rfi-ambre)" : "var(--rfi-vert)";
}

function formaterMontantCourt(valeur: number): string {
  if (Math.abs(valeur) >= 1_000_000) {
    return `${(valeur / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€`;
  }
  if (Math.abs(valeur) >= 1_000) {
    return `${Math.round(valeur / 1_000).toLocaleString("fr-FR")} k€`;
  }
  return `${Math.round(valeur).toLocaleString("fr-FR")} €`;
}

export { formaterMontantCourt };
