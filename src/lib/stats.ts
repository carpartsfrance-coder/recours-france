/**
 * Agrégation des signalements de consommateurs.
 *
 * Règles opposables appliquées ici :
 *  — seuls les signalements VÉRIFIÉS entrent dans les statistiques de comportement ;
 *  — une résolution n'est comptée qu'après confirmation explicite du consommateur ;
 *  — les délais publiés sont des MÉDIANES, jamais des moyennes ;
 *  — la base est glissante sur douze mois et affichée sous chaque indicateur.
 */
import { prisma } from "./db";
import { avecJustificatif } from "./format";
import {
  calculerExperience,
  calculerTransparence,
  SEUIL_PUBLICATION_EXPERIENCE,
  type EntreesTransparence,
} from "./scoring";
import { LIBELLES_CATEGORIE } from "./format";

const JOUR = 86_400_000;

export function debutFenetre(mois = 12): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - mois);
  return d;
}

export function mediane(valeurs: number[]): number | null {
  if (!valeurs.length) return null;
  const tri = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(tri.length / 2);
  return tri.length % 2 ? tri[milieu] : Math.round((tri[milieu - 1] + tri[milieu]) / 2);
}

const STATUTS_CLOTURE = ["RESOLU_CONFIRME", "NON_RESOLU", "ABANDONNE"] as const;

export type StatistiquesEntreprise = {
  total12Mois: number;
  verifies: number;
  nonVerifies: number;
  avecReponse: number;
  tauxReponse: number | null;
  clotures: number;
  /** Dossiers vérifiés non clôturés à ce jour, quel que soit leur statut déclaré. */
  enCours: number;
  /** Ancienneté, en jours, de chaque dossier avec justificatif encore ouvert. */
  ouverts: { jours: number }[];
  resolus: number;
  tauxResolution: number | null;
  nonResolus: number;
  tauxNonResolus: number | null;
  delaiMedian: number | null;
  evolution90j: number | null;
  dernierSignalement: Date | null;
  motifs: { cle: string; libelle: string; nombre: number; pourcentage: number }[];
  tendance: { mois: string; libelle: string; nombre: number }[];
  scoreExperiencePubliable: boolean;
  manquantsPourPublication: number;
};

/** Tous les chiffres affichés dans le bloc « Signalements consommateurs ». */
export async function statistiquesEntreprise(entrepriseId: string): Promise<StatistiquesEntreprise> {
  const depuis = debutFenetre(12);

  const signalements = await prisma.signalement.findMany({
    where: { entrepriseId, moderation: "PUBLIE", creeLe: { gte: depuis } },
    select: {
      creeLe: true,
      closLe: true,
      categorie: true,
      niveauVerification: true,
      statut: true,
      reponseDeclaree: true,
      resolutionConfirmee: true,
      resolutionConfirmeeLe: true,
    },
  });

  const verifies = signalements.filter((s) => avecJustificatif(s.niveauVerification));
  const nonVerifies = signalements.length - verifies.length;

  const avecReponse = verifies.filter((s) => s.reponseDeclaree).length;
  const clotures = verifies.filter(
    (s) => s.closLe !== null || STATUTS_CLOTURE.includes(s.statut as (typeof STATUTS_CLOTURE)[number]),
  );
  const resolus = clotures.filter((s) => s.resolutionConfirmee).length;
  const nonResolus = clotures.length - resolus;

  // Dossiers vérifiés encore ouverts : base des points de vigilance sur les délais.
  const ouverts = verifies
    .filter((s) => s.closLe === null && !STATUTS_CLOTURE.includes(s.statut as (typeof STATUTS_CLOTURE)[number]))
    .map((s) => ({ jours: Math.max(0, Math.round((Date.now() - s.creeLe.getTime()) / JOUR)) }))
    .sort((a, b) => b.jours - a.jours);

  // Délai médian : uniquement sur les résolutions confirmées.
  const delais = verifies
    .filter((s) => s.resolutionConfirmee && s.resolutionConfirmeeLe)
    .map((s) => Math.max(0, Math.round((s.resolutionConfirmeeLe!.getTime() - s.creeLe.getTime()) / JOUR)));

  // Évolution : 90 derniers jours contre les 90 précédents.
  const maintenant = Date.now();
  const recents = signalements.filter((s) => maintenant - s.creeLe.getTime() <= 90 * JOUR).length;
  const precedents = signalements.filter((s) => {
    const age = maintenant - s.creeLe.getTime();
    return age > 90 * JOUR && age <= 180 * JOUR;
  }).length;
  const evolution90j = precedents > 0 ? ((recents - precedents) / precedents) * 100 : recents > 0 ? 100 : null;

  // Motifs : volume agrégé, tous niveaux de vérification confondus.
  const parCategorie = new Map<string, number>();
  for (const s of signalements) parCategorie.set(s.categorie, (parCategorie.get(s.categorie) ?? 0) + 1);
  const motifs = [...parCategorie.entries()]
    .map(([cle, nombre]) => ({
      cle,
      libelle: LIBELLES_CATEGORIE[cle] ?? cle,
      nombre,
      pourcentage: signalements.length ? Math.round((nombre / signalements.length) * 100) : 0,
    }))
    .sort((a, b) => b.nombre - a.nombre);

  // Tendance sur 12 mois.
  const tendance: StatistiquesEntreprise["tendance"] = [];
  const initiales = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - i);
    const fin = new Date(d);
    fin.setMonth(fin.getMonth() + 1);
    const nombre = signalements.filter((s) => s.creeLe >= d && s.creeLe < fin).length;
    tendance.push({
      mois: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      libelle: initiales[d.getMonth()],
      nombre,
    });
  }

  const dernier = signalements.reduce<Date | null>(
    (max, s) => (max === null || s.creeLe > max ? s.creeLe : max),
    null,
  );

  return {
    total12Mois: signalements.length,
    verifies: verifies.length,
    nonVerifies,
    avecReponse,
    tauxReponse: verifies.length ? (avecReponse / verifies.length) * 100 : null,
    clotures: clotures.length,
    enCours: ouverts.length,
    ouverts,
    resolus,
    tauxResolution: clotures.length ? (resolus / clotures.length) * 100 : null,
    nonResolus,
    tauxNonResolus: clotures.length ? (nonResolus / clotures.length) * 100 : null,
    delaiMedian: mediane(delais),
    evolution90j,
    dernierSignalement: dernier,
    motifs,
    tendance,
    scoreExperiencePubliable: verifies.length >= SEUIL_PUBLICATION_EXPERIENCE,
    manquantsPourPublication: Math.max(0, SEUIL_PUBLICATION_EXPERIENCE - verifies.length),
  };
}

/** Calcule les deux indices SANS les enregistrer (affichage d'une fiche). */
export async function indicesEntreprise(entrepriseId: string) {
  const entreprise = await prisma.entreprise.findUnique({
    where: { id: entrepriseId },
    include: {
      comptes: { orderBy: { exercice: "desc" } },
      evenements: { orderBy: { date: "desc" }, take: 200 },
    },
  });
  if (!entreprise) return null;

  const troisAns = Date.now() - 3 * 365.25 * JOUR;
  const entrees: EntreesTransparence = {
    denomination: entreprise.denomination,
    siretSiege: entreprise.siretSiege,
    naf: entreprise.naf,
    adresseSiege: entreprise.adresseSiege,
    dateImmatriculation: entreprise.dateImmatriculation,
    etatAdministratif: entreprise.etatAdministratif,
    representantLegal: entreprise.representantLegal,
    capital: entreprise.capital ? Number(entreprise.capital) : null,
    exercicesDeposes: entreprise.comptes
      .filter((c) => c.dateDepot !== null || c.source === "BODACC")
      .map((c) => ({ exercice: c.exercice, confidentiel: c.confidentiel })),
    evenements3Ans: entreprise.evenements.filter((e) => e.date.getTime() >= troisAns).length,
    procedures: entreprise.evenements.filter((e) => e.procedureCollective).map((e) => ({ date: e.date })),
    sourcesSynchronisees: {
      sirene: Boolean(entreprise.syncSirene),
      rne: Boolean(entreprise.syncRne) || entreprise.comptes.some((c) => c.source === "RNE"),
      bodacc: Boolean(entreprise.syncBodacc),
    },
  };

  const transparence = calculerTransparence(entrees);
  const stats = await statistiquesEntreprise(entrepriseId);
  const experience = calculerExperience({
    verifies: stats.verifies,
    avecReponse: stats.avecReponse,
    clotures: stats.clotures,
    resolus: stats.resolus,
    nonResolus: stats.nonResolus,
    delaiMedian: stats.delaiMedian,
    evolution90j: stats.evolution90j,
  });

  return { transparence, experience, stats };
}

/**
 * Recalcule, enregistre et historise les indices.
 * Appelé par le recalcul quotidien et après chaque action de modération.
 * L'historique est conservé cinq ans (règle métier n° 8).
 */
export async function recalculerIndices(entrepriseId: string) {
  const calcul = await indicesEntreprise(entrepriseId);
  if (!calcul) return null;
  const { transparence, experience, stats } = calcul;

  await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: {
      indiceTransparence: transparence.score,
      indiceExperience: experience.publie ? experience.score : null,
      indicesCalculeLe: new Date(),
    },
  });

  await prisma.scoreSnapshot.create({
    data: {
      entrepriseId,
      transparence: transparence.score,
      experience: experience.publie ? experience.score : null,
      detail: {
        transparence: transparence.criteres,
        experience: experience.criteres,
        base: { verifies: stats.verifies, total: stats.total12Mois },
      },
    },
  });

  return calcul;
}

/** Compteurs affichés dans une ligne d'annuaire, en une seule requête groupée. */
export async function compteursAnnuaire(entrepriseIds: string[]) {
  if (!entrepriseIds.length) return new Map<string, { total: number; verifies: number; tauxReponse: number | null }>();
  const depuis = debutFenetre(12);

  const lignes = await prisma.signalement.findMany({
    where: { entrepriseId: { in: entrepriseIds }, moderation: "PUBLIE", creeLe: { gte: depuis } },
    select: { entrepriseId: true, niveauVerification: true, reponseDeclaree: true },
  });

  const resultat = new Map<string, { total: number; verifies: number; tauxReponse: number | null }>();
  for (const id of entrepriseIds) resultat.set(id, { total: 0, verifies: 0, tauxReponse: null });

  const reponses = new Map<string, number>();
  for (const l of lignes) {
    if (!l.entrepriseId) continue;
    const entree = resultat.get(l.entrepriseId);
    if (!entree) continue;
    entree.total++;
    if (avecJustificatif(l.niveauVerification)) {
      entree.verifies++;
      if (l.reponseDeclaree) reponses.set(l.entrepriseId, (reponses.get(l.entrepriseId) ?? 0) + 1);
    }
  }
  for (const [id, entree] of resultat) {
    entree.tauxReponse = entree.verifies ? ((reponses.get(id) ?? 0) / entree.verifies) * 100 : null;
  }
  return resultat;
}

/** Chiffres de la page d'accueil et de l'annuaire. */
/**
 * Nombre approché de fiches.
 *
 * `count(*)` sans filtre parcourt les treize millions de lignes : PostgreSQL
 * ne peut pas tenir de compteur, son modèle de concurrence lui interdisant de
 * savoir sans regarder combien de lignes sont visibles pour la transaction en
 * cours. Mesuré à 9,3 s en local et 49 s en production — sur la page
 * d'accueil, à chaque visite.
 *
 * `reltuples` est l'estimation entretenue par ANALYZE. Elle coûte une lecture
 * de catalogue, et pour un ordre de grandeur affiché en pied de page c'est
 * exactement ce qu'il faut : personne n'a besoin du chiffre à l'unité, et il
 * change de toute façon à chaque publication mensuelle du répertoire.
 */
async function nombreApprocheDeFiches(): Promise<number> {
  const [ligne] = await prisma.$queryRaw<{ n: bigint | null }[]>`
    SELECT reltuples::bigint AS n FROM pg_class WHERE relname = 'Entreprise'
  `;
  const n = Number(ligne?.n ?? 0);
  // Une table jamais analysée renvoie -1 ; le comptage exact reste alors le
  // seul recours, et il est rapide sur une table vide ou presque.
  return n > 0 ? n : prisma.entreprise.count();
}

export async function statistiquesPlateforme() {
  const [entreprises, signalements, verifies, avis] = await Promise.all([
    nombreApprocheDeFiches(),
    prisma.signalement.count({ where: { moderation: "PUBLIE" } }),
    prisma.signalement.count({
      where: { moderation: "PUBLIE", niveauVerification: { in: ["PIECE_DEPOSEE", "PIECE_EXAMINEE"] } },
    }),
    prisma.avis.count({ where: { moderation: "PUBLIE" } }),
  ]);
  return { entreprises, signalements, verifies, avis };
}
