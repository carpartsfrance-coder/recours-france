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
import { OU_BOUTIQUE_PLAN_DE_SITE, PALIER_OUVERT } from "@/lib/indexation";
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
 * Les valeurs d'un préfixe sont connues d'avance. Les énumérer coûte zéro
 * requête et ne peut pas échouer. Le prix est une poignée de tranches vides ;
 * un fichier vide coûte une requête au robot, un index en erreur lui coûte le
 * site entier.
 */
export async function prefixes(): Promise<string[]> {
  const n = longueurPrefixe();
  return Array.from({ length: 10 ** n }, (_, i) => String(i).padStart(n, "0"));
}

/**
 * Les boutiques proposées sont comptées, non estimées.
 *
 * `reltuples` donnait le nombre de lignes de la table — cent quatre-vingt-cinq
 * mille — alors que le plan de site n'en propose plus que les rattachées à une
 * société, soit soixante-neuf mille. L'index aurait annoncé quatre tranches
 * pour deux réellement peuplées.
 *
 * Le compte exact coûte trente millisecondes, l'index `entrepriseId` suffisant
 * à le faire sans toucher la table.
 */
/**
 * Le nombre de tranches, calculé sans la base.
 *
 * Sert de repli quand la base est indisponible : tout est connu d'avance sauf
 * le nombre de tranches de boutiques, qu'on majore. Une tranche annoncée et
 * vide coûte une requête au robot ; une tranche omise lui cache ce qu'elle
 * contient.
 */
export function tranchesSansBase(): number {
  return RANG_ENTREPRISES + 10 ** longueurPrefixe() + TRANCHES_BOUTIQUES_MAX;
}

/** Majorant : cent quatre-vingt-cinq mille boutiques, cinquante mille par fichier. */
const TRANCHES_BOUTIQUES_MAX = 4;

export async function nombreDeTranches(): Promise<number> {
  const [p, nbBoutiques] = await Promise.all([
    prefixes(),
    prisma.boutique.count({ where: OU_BOUTIQUE_PLAN_DE_SITE }),
  ]);
  return RANG_ENTREPRISES + p.length + Math.max(1, Math.ceil(nbBoutiques / PAR_FICHIER));
}
