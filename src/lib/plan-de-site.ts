/**
 * Découpage du plan de site.
 *
 * Le protocole plafonne un fichier à 50 000 adresses ; treize millions de
 * fiches en réclament donc des milliers, que seul un index rassemble. Les
 * rangs vivent ici plutôt que dans `app/sitemap.ts` parce que deux routes s'en
 * servent — les tranches et leur index — et qu'une divergence entre les deux
 * produirait un index désignant des fichiers inexistants.
 */

import { prisma } from "@/lib/db";
import { DEPARTEMENTS } from "@/lib/referentiels/naf";
import { ADRESSE } from "./adresse";

export const PAR_FICHIER = 50_000;
export const LONGUEUR_PREFIXE = 4;
export const DUREE_CACHE = 86_400;

/** Tranches réservées avant les fiches : pages fixes, puis regroupements. */
export const RANG_STATIQUES = 0;
export const RANG_DEPARTEMENTS = 1;
export const RANG_COMMUNES = 2; // une tranche par département
export const RANG_SIGNAL = RANG_COMMUNES + DEPARTEMENTS.length;
export const RANG_ENTREPRISES = RANG_SIGNAL + 1;

export function base(): string {
  return ADRESSE;
}

/**
 * Préfixes de SIREN effectivement peuplés. Publier des tranches vides
 * gaspillerait le budget d'exploration sur des fichiers sans contenu.
 *
 * Le relevé balaie toute la table : on le garde en mémoire une journée. Sans
 * cela il serait refait à chaque tranche demandée, soit plusieurs milliers de
 * balayages complets pour un seul passage de robot.
 */
let memo: { calcule: number; valeur: string[] } | null = null;

export async function prefixes(): Promise<string[]> {
  if (memo && Date.now() - memo.calcule < DUREE_CACHE * 1000) return memo.valeur;
  // Le cast est indispensable : Prisma transmet le nombre en bigint, et
  // Postgres ne connaît pas de left(text, bigint).
  const lignes = await prisma.$queryRaw<{ p: string }[]>`
    SELECT DISTINCT left(siren, ${LONGUEUR_PREFIXE}::int) AS p FROM "Entreprise" ORDER BY 1
  `;
  memo = { calcule: Date.now(), valeur: lignes.map((l) => l.p) };
  return memo.valeur;
}

export async function nombreDeTranches(): Promise<number> {
  const [p, nbBoutiques] = await Promise.all([prefixes(), prisma.boutique.count()]);
  return RANG_ENTREPRISES + p.length + Math.max(1, Math.ceil(nbBoutiques / PAR_FICHIER));
}
