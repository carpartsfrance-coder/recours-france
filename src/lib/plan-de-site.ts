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
/**
 * Trois chiffres, non quatre.
 *
 * Le préfixe borne chaque tranche par l'index unique du SIREN. Sa longueur
 * décide du nombre de tranches publiées : quatre chiffres en font dix mille,
 * dont la grande majorité seraient vides puisque les SIREN ne se répartissent
 * pas uniformément. Trois en font mille — quatre-vingt-six fiches chacune au
 * palier d'ouverture actuel, huit mille neuf cents si l'on ouvrait tout, ce
 * qui reste sous le plafond de cinquante mille URL par fichier.
 */
export const LONGUEUR_PREFIXE = 3;
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
 * Préfixes de SIREN, énumérés plutôt que relevés.
 *
 * Cette fonction interrogeait la base : `SELECT DISTINCT left(siren, 3)`. Une
 * expression sur la colonne, donc aucun index utilisable, donc un balayage des
 * treize millions de lignes — huit secondes mesurées. La production coupe à
 * dix : l'index du plan de site répondait 500, et Google, incapable de le
 * lire, n'a indexé que ce qui lui était soumis à la main.
 *
 * Un préfixe de trois chiffres ne prend que mille valeurs, et elles sont
 * connues d'avance. Les énumérer coûte zéro requête et ne peut pas échouer.
 *
 * Le prix est une poignée de tranches vides — sur huit millions neuf cent mille
 * sociétés actives, presque tous les préfixes sont peuplés. Un fichier vide
 * coûte une requête au robot ; un index en erreur lui coûte le site entier.
 */
export async function prefixes(): Promise<string[]> {
  const total = 10 ** LONGUEUR_PREFIXE;
  return Array.from({ length: total }, (_, i) => String(i).padStart(LONGUEUR_PREFIXE, "0"));
}

/**
 * Le nombre de boutiques est estimé, non compté.
 *
 * `count(*)` balaie la table. Un plan de site n'a pas besoin d'exactitude au
 * près : il lui faut le nombre de tranches, et `reltuples` — la statistique
 * que Postgres tient à jour — le donne instantanément. Une tranche de trop ou
 * de moins se corrige au prochain passage.
 */
export async function nombreDeTranches(): Promise<number> {
  const [p, estimation] = await Promise.all([
    prefixes(),
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT GREATEST(reltuples, 0)::bigint AS n FROM pg_class WHERE relname = 'Boutique'
    `,
  ]);
  const nbBoutiques = Number(estimation[0]?.n ?? 0);
  return RANG_ENTREPRISES + p.length + Math.max(1, Math.ceil(nbBoutiques / PAR_FICHIER));
}
