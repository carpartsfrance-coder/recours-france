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
import { OU_BOUTIQUE_PLAN_DE_SITE, PALIER_OUVERT, clausesPlanDeSite } from "@/lib/indexation";
import { ADRESSE } from "./adresse";

export const PAR_FICHIER = 50_000;

/**
 * La longueur du préfixe suit le palier ouvert.
 *
 * Le préfixe borne chaque tranche par l'index unique du SIREN, et sa longueur
 * décide du nombre de fichiers publiés : un chiffre en fait dix, deux en font
 * cent, trois en font mille.
 *
 * Elle était fixée à trois, dimensionnée pour le jour où les treize millions de
 * fiches seraient ouvertes. Au palier d'ouverture, soixante et onze mille
 * fiches se répartissaient donc sur mille fichiers — soixante-et-onze adresses
 * par fichier, deux cent quatre-vingt-un fichiers vides, et mille requêtes
 * demandées à un robot pour découvrir ce qui tient dans deux. Un domaine neuf
 * n'obtient pas mille requêtes de plan de site ; il en obtient quelques-unes
 * par jour.
 *
 * Le nombre de fichiers suit désormais le nombre de pages réellement
 * proposées : dix au palier 1 (~7 100 adresses chacun), cent au palier 2
 * (~33 000), mille au palier 3 (~13 000). Chacun reste sous le plafond de
 * cinquante mille.
 */
export function longueurPrefixe(): number {
  return PALIER_OUVERT;
}

/**
 * Les départements sont regroupés, non publiés un par un.
 *
 * Chaque département donnait un fichier — cent un fichiers pour trois cent mille
 * adresses de villes. Regroupés par dix, ils en donnent onze, et les requêtes
 * d'un même fichier partent ensemble : la plus lente décide, pas leur somme.
 */
export const DEPARTEMENTS_PAR_TRANCHE = 10;
export const TRANCHES_COMMUNES = Math.ceil(DEPARTEMENTS.length / DEPARTEMENTS_PAR_TRANCHE);

/**
 * Nombre minimal d'entreprises pour qu'une page de ville entre au plan de site.
 *
 * Mesuré sur la base entière : sur trois cent trois mille pages de ville,
 * quatre-vingt-six mille six cent soixante-dix-neuf n'en listent qu'une seule.
 * Celle-là ne dit rien que la fiche de l'entreprise ne dise déjà, et elle le
 * dit dans un gabarit partagé par les trois cent mille autres. La proposer,
 * c'est dépenser du budget d'exploration contre soi.
 *
 * Le seuil ne rend rien inaccessible : ces pages restent indexables et
 * atteignables par le maillage. Elles ne sont simplement plus proposées.
 * Relever le seuil resserre davantage — mesuré : 2 → 216 909 pages,
 * 3 → 176 030, 5 → 134 357, 10 → 88 848.
 */
export const SEUIL_COMMUNE = 2;

export const DUREE_CACHE = 86_400;

/** Tranches réservées avant les fiches : pages fixes, puis regroupements. */
export const RANG_STATIQUES = 0;
export const RANG_DEPARTEMENTS = 1;
export const RANG_COMMUNES = 2; // une tranche par groupe de départements
export const RANG_SIGNAL = RANG_COMMUNES + TRANCHES_COMMUNES;
/**
 * La tranche de mise en avant n'existe pas au palier d'ouverture.
 *
 * Elle sert à faire passer devant les fiches qui ont du contenu quand les
 * tranches suivantes en comptent des millions. Au palier d'ouverture elles n'en
 * comptent que soixante et onze mille, énumérées dans l'ordre voulu : reprendre
 * les mêmes adresses en tête ne ferait qu'un fichier de plus et vingt-cinq
 * doublons.
 */
export const RANG_ENTREPRISES = RANG_SIGNAL + (PALIER_OUVERT === 1 ? 0 : 1);

export function base(): string {
  return ADRESSE;
}

/**
 * Au palier d'ouverture, les fiches sont énumérées ; au-delà, encadrées.
 *
 * Le préfixe de SIREN existe pour découper ce qu'on ne peut pas tenir en
 * mémoire. Au palier d'ouverture il n'y a que soixante et onze mille fiches :
 * les énumérer coûte une seconde quatre, elles tiennent en deux fichiers, et le
 * découpage par préfixe devient une complication pure. Il coûtait même cher —
 * chaque tranche encadrait un dixième du répertoire, un million trois cent
 * mille lignes, et les préfixes 5 à 9 dépassaient les dix secondes que la base
 * s'accorde.
 *
 * Aux paliers suivants la liste ne tient plus en mémoire, et l'encadrement par
 * préfixe reprend son rôle.
 */
export function enumerable(): boolean {
  return PALIER_OUVERT === 1;
}

type Fiche = { slug: string; majLe: Date };
let memoire: { liste: Fiche[]; le: number } | null = null;

/**
 * L'union des critères du palier, gardée en mémoire une journée.
 *
 * Un critère, une requête : réunis par `OR`, ils redonnent un balayage complet.
 * L'union et le dédoublonnage se font ici, ce que la base aurait fait en moins
 * bien.
 *
 * Le plan de site est demandé quelques fois par jour par des robots ; le tenir
 * en mémoire évite de refaire quatre requêtes à chaque tranche, et une liste de
 * soixante et onze mille chaînes pèse quelques mégaoctets.
 */
export async function fichesDuPalier(): Promise<Fiche[]> {
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

/**
 * Préfixes de SIREN, énumérés plutôt que relevés.
 *
 * Cette fonction interrogeait la base : `SELECT DISTINCT left(siren, 3)`. Une
 * expression sur la colonne, donc aucun index utilisable, donc un balayage des
 * treize millions de lignes — huit secondes mesurées. La production coupe à
 * dix : l'index du plan de site répondait 500.
 *
 * Les valeurs d'un préfixe sont connues d'avance. Les énumérer coûte zéro
 * requête et ne peut pas échouer.
 */
export function prefixes(): string[] {
  const n = longueurPrefixe();
  return Array.from({ length: 10 ** n }, (_, i) => String(i).padStart(n, "0"));
}

/** Combien de fichiers les fiches d'entreprise occupent. */
export async function tranchesFiches(): Promise<number> {
  if (!enumerable()) return prefixes().length;
  const fiches = await fichesDuPalier();
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
  const fiches = enumerable() ? TRANCHES_FICHES_MAX : 10 ** longueurPrefixe();
  return RANG_ENTREPRISES + fiches + TRANCHES_BOUTIQUES_MAX;
}

/** Majorants : soixante-quinze mille fiches et quatre-vingt-quinze mille boutiques. */
const TRANCHES_FICHES_MAX = 2;
const TRANCHES_BOUTIQUES_MAX = 2;

/**
 * Les boutiques proposées sont comptées, non estimées.
 *
 * `reltuples` donnait le nombre de lignes de la table — cent quatre-vingt-cinq
 * mille — alors que le plan de site n'en propose plus que les rattachées à une
 * société, soit soixante-neuf mille. L'index aurait annoncé quatre tranches
 * pour deux réellement peuplées.
 */
export async function nombreDeTranches(): Promise<number> {
  const [fiches, nbBoutiques] = await Promise.all([
    tranchesFiches(),
    prisma.boutique.count({ where: OU_BOUTIQUE_PLAN_DE_SITE }),
  ]);
  return RANG_ENTREPRISES + fiches + Math.max(1, Math.ceil(nbBoutiques / PAR_FICHIER));
}
