/**
 * Découpage du plan de site.
 *
 * Le protocole plafonne un fichier à 50 000 adresses, et les rangs vivent ici
 * plutôt que dans `app/sitemap.ts` parce que deux routes s'en servent — les
 * tranches et leur index — et qu'une divergence entre les deux produirait un
 * index désignant des fichiers inexistants.
 *
 * ── Ce qui a disparu, et pourquoi ──────────────────────────────────────────
 * Ce fichier portait un étagement par paliers (`SEO_PALIER`), un découpage par
 * préfixe de SIREN, et onze tranches de pages de ville. Tout cela dimensionnait
 * l'ouverture progressive de treize millions de fiches.
 *
 * La mesure de septembre 2026 a tranché autrement : 280 fiches portent un
 * contenu qui leur soit propre (voir `lib/indexation.ts`). Un palier n'a plus
 * rien à étager, un préfixe plus rien à découper, et les 216 910 pages de ville
 * sont passées en `noindex` — les proposer au plan de site reviendrait à
 * demander à un robot d'explorer ce qu'on lui interdit d'indexer.
 *
 * Le plan de site tient donc en cinq fichiers. Rouvrir l'étagement le jour où
 * les signalements arrivent ne se fera pas par variable d'environnement : ce
 * sera une décision de contenu, pas de réglage.
 */

import { prisma } from "@/lib/db";
import { OU_BOUTIQUE_PLAN_DE_SITE, clausesPlanDeSite } from "@/lib/indexation";
import { ADRESSE } from "./adresse";

export const PAR_FICHIER = 50_000;

export const DUREE_CACHE = 86_400;

/** Tranches réservées avant les fiches : pages fixes, puis regroupements. */
export const RANG_STATIQUES = 0;
export const RANG_DEPARTEMENTS = 1;
export const RANG_ENTREPRISES = 2;

export function base(): string {
  return ADRESSE;
}

type Fiche = { slug: string; majLe: Date };
let memoire: { liste: Fiche[]; le: number } | null = null;

/**
 * Les fiches indexables, gardées en mémoire une journée.
 *
 * Un critère, une requête : réunis par `OR`, ils redonnent un balayage complet
 * des treize millions de lignes. Chacun de son côté se résout par la clé
 * étrangère de sa table — quelques milliers de lignes à lire en tout. L'union
 * et le dédoublonnage se font ici, ce que la base aurait fait en moins bien.
 */
export async function fichesIndexables(): Promise<Fiche[]> {
  const maintenant = Date.now();
  if (memoire && maintenant - memoire.le < DUREE_CACHE * 1000) return memoire.liste;

  const lots = await Promise.all(
    clausesPlanDeSite().map((where) =>
      prisma.entreprise.findMany({ where, select: { slug: true, majLe: true } }),
    ),
  );
  const parSlug = new Map<string, Date>();
  for (const lot of lots) for (const e of lot) parSlug.set(e.slug, e.majLe);

  const liste = [...parSlug].map(([slug, majLe]) => ({ slug, majLe }));
  memoire = { liste, le: maintenant };
  return liste;
}

/** Combien de fichiers les fiches d'entreprise occupent. */
export async function tranchesFiches(): Promise<number> {
  const fiches = await fichesIndexables();
  return Math.max(1, Math.ceil(fiches.length / PAR_FICHIER));
}

/**
 * Le nombre de tranches, calculé sans la base.
 *
 * Sert de repli quand la base est indisponible : le repli ne renvoyait que la
 * tranche 0, et une base absente le temps d'un appel faisait répondre 404 à
 * tout le reste du plan de site. Les majorants valent mieux qu'un plan de site
 * amputé — une tranche annoncée et vide coûte une requête au robot.
 */
export function tranchesSansBase(): number {
  return RANG_ENTREPRISES + TRANCHES_FICHES_MAX + TRANCHES_BOUTIQUES_MAX;
}

/** Majorants : cinquante mille fiches et cent mille boutiques. */
const TRANCHES_FICHES_MAX = 1;
const TRANCHES_BOUTIQUES_MAX = 2;

/**
 * Les boutiques proposées sont comptées, non estimées.
 *
 * `reltuples` donnait le nombre de lignes de la table — 185 058 — alors que le
 * plan de site n'en propose que les rattachées à une société ou porteuses d'un
 * signalement, soit 69 149. L'index aurait annoncé quatre tranches pour deux
 * réellement peuplées.
 */
export async function nombreDeTranches(): Promise<number> {
  const [fiches, nbBoutiques] = await Promise.all([
    tranchesFiches(),
    prisma.boutique.count({ where: OU_BOUTIQUE_PLAN_DE_SITE }),
  ]);
  return RANG_ENTREPRISES + fiches + Math.max(1, Math.ceil(nbBoutiques / PAR_FICHIER));
}
