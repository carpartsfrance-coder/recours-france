/**
 * Maillage interne de l'annuaire.
 *
 * Treize millions de fiches déposées côte à côte sans un lien entre elles
 * forment treize millions de culs-de-sac : un robot qui en visite une repart
 * aussitôt, et le référencement ne décolle jamais. Les annuaires installés ne
 * publient d'ailleurs aucun plan de site — ni societe.com ni pappers.fr n'en
 * exposent un ; ce qui les fait explorer, c'est la densité de leurs liens
 * internes, que chaque fiche entretient vers ses voisines.
 *
 * Ce module produit les deux étages qui manquaient : les pages de regroupement
 * (secteur, puis département, puis commune) et les liens latéraux d'une fiche
 * vers ses semblables.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEPARTEMENTS, SECTEURS, libelleSecteur, nomDepartement } from "@/lib/referentiels/naf";

/** Réduit un libellé à un fragment d'URL stable. */
export function slug(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/**
 * Un département s'écrit `13-bouches-du-rhone`. Le code ouvre le segment pour
 * lever l'ambiguïté des homonymes — la Corse-du-Sud et la Haute-Corse
 * partagent une racine, et beaucoup de communes portent le même nom d'un
 * bout à l'autre du pays.
 */
export function slugDepartement(code: string): string | null {
  const nom = nomDepartement(code);
  return nom ? `${code.toLowerCase()}-${slug(nom)}` : null;
}

export function departementDepuisSlug(fragment: string): string | null {
  const code = fragment.split("-")[0]?.toUpperCase() ?? "";
  return DEPARTEMENTS.some((d) => d.code === code) ? code : null;
}

export function secteurExiste(code: string): boolean {
  return SECTEURS.some((s) => s.code === code);
}

/** Chemins canoniques des pages de regroupement. */
export const cheminSecteur = (secteur: string) => `/annuaire/${secteur}`;
export const cheminDepartement = (secteur: string, code: string) => {
  const d = slugDepartement(code);
  return d ? `/annuaire/${secteur}/${d}` : null;
};
export const cheminCommune = (secteur: string, code: string, commune: string) => {
  const d = slugDepartement(code);
  return d ? `/annuaire/${secteur}/${d}/${slug(commune)}` : null;
};

/** Champs communs aux listes de l'annuaire. */
export const CHAMPS_LISTE = {
  id: true,
  slug: true,
  denomination: true,
  enseigne: true,
  commune: true,
  adresseSiege: true,
  nafLibelle: true,
  siteWeb: true,
  _count: { select: { signalements: true } },
} as const;

export type LigneListe = {
  id: string;
  slug: string;
  denomination: string;
  enseigne: string | null;
  commune: string | null;
  adresseSiege: string | null;
  nafLibelle: string | null;
  siteWeb: string | null;
  _count: { signalements: number };
};

/**
 * Liste d'entreprises, celles qui portent un signal d'abord.
 *
 * Trier directement par nombre de signalements obligerait la base à parcourir
 * tout le secteur — deux cent mille lignes pour en afficher soixante. On
 * procède donc en trois lectures qui s'appuient chacune sur un index : les
 * entreprises déclarées, puis celles dont on connaît le site, puis le reste par
 * ordre alphabétique. Ce dernier tri seul remonterait les dénominations
 * commençant par une ponctuation, « # HASHTAG LAVAGE » ou « +AUTO », et
 * donnerait à la page l'aspect d'un déversement de données brutes.
 */
export async function listerAvecSignalDAbord(
  where: Prisma.EntrepriseWhereInput,
  take: number,
): Promise<LigneListe[]> {
  const lignes: LigneListe[] = [];
  const vus: string[] = [];

  const etapes: Prisma.EntrepriseWhereInput[] = [
    { signalements: { some: { moderation: "PUBLIE" } } },
    { siteWeb: { not: null } },
    {},
  ];

  for (const filtre of etapes) {
    if (lignes.length >= take) break;
    const lot = await prisma.entreprise.findMany({
      where: { ...where, ...filtre, ...(vus.length ? { id: { notIn: vus } } : {}) },
      select: CHAMPS_LISTE,
      orderBy: { denomination: "asc" },
      take: take - lignes.length,
    });
    lignes.push(...lot);
    vus.push(...lot.map((l) => l.id));
  }

  return lignes;
}

/**
 * Décomptes de l'annuaire, lus dans la table recalculée chaque nuit.
 *
 * Compter en direct coûtait près de deux secondes sur la page d'accueil de
 * l'annuaire — treize millions de lignes parcourues pour afficher seize
 * nombres. Un repli sur le comptage direct reste prévu : sans lui, la page
 * serait vide tant que la tâche nocturne n'a pas tourné une première fois.
 */
export async function decomptes(secteur?: string): Promise<Map<string, number>> {
  const lignes = await prisma.compteurAnnuaire.findMany({
    where: secteur ? { secteur, departement: { not: "" } } : { departement: "" },
    select: { secteur: true, departement: true, nombre: true },
  });
  if (lignes.length > 0) {
    return new Map(lignes.map((l) => [secteur ? l.departement : l.secteur, l.nombre]));
  }

  const groupes = await prisma.entreprise.groupBy({
    by: secteur ? ["departement"] : ["secteur"],
    _count: { _all: true },
    where: {
      etatAdministratif: "ACTIVE",
      ...(secteur ? { secteur, departement: { not: null } } : {}),
    },
  });
  return new Map(
    groupes.map((g) => [
      (secteur ? (g as { departement: string | null }).departement : (g as { secteur: string | null }).secteur) ?? "autre",
      g._count._all,
    ]),
  );
}

export type Voisine = {
  id: string;
  slug: string;
  denomination: string;
  commune: string | null;
  nafLibelle: string | null;
  signalements: number;
};

const CHAMPS = {
  id: true,
  slug: true,
  denomination: true,
  commune: true,
  nafLibelle: true,
  _count: { select: { signalements: true } },
} as const;

function aplatir(lignes: { _count: { signalements: number } }[]): Voisine[] {
  return lignes.map((l) => {
    const { _count, ...reste } = l as Record<string, unknown> & { _count: { signalements: number } };
    return { ...(reste as Omit<Voisine, "signalements">), signalements: _count.signalements };
  });
}

/**
 * Entreprises du même secteur, en privilégiant celles qui portent une
 * déclaration.
 *
 * Le tri direct par nombre de signalements paraissait naturel mais coûtait un
 * balayage complet : pour désigner huit voisines, la base triait les deux cent
 * mille entreprises du secteur, et la fiche mettait neuf secondes à s'afficher.
 * On part donc de la table des signalements — quelques centaines de lignes —
 * puis on complète avec une lecture d'index. Le résultat est le même, à ceci
 * près qu'il s'obtient en quelques millisecondes.
 */
async function voisinesDuSecteur(secteur: string, siren: string) {
  const hors = { siren: { not: siren } };
  const actives = { etatAdministratif: "ACTIVE" as const };

  const signales = await prisma.entreprise.findMany({
    where: { ...hors, ...actives, secteur, signalements: { some: { moderation: "PUBLIE" } } },
    select: CHAMPS,
    take: 8,
  });
  if (signales.length >= 8) return signales;

  const complement = await prisma.entreprise.findMany({
    where: {
      ...hors,
      ...actives,
      secteur,
      siteWeb: { not: null },
      id: { notIn: signales.map((e) => e.id) },
    },
    select: CHAMPS,
    take: 8 - signales.length,
  });
  return [...signales, ...complement];
}

/**
 * Entreprises à proposer depuis une fiche.
 *
 * L'ordre des tentatives va du plus proche au plus lâche : même métier dans la
 * même commune, puis même métier dans le département, puis toute activité dans
 * la commune. Une fiche sans adresse — c'est le cas tant que les
 * établissements ne sont pas importés — se rabat sur le seul secteur, ce qui
 * suffit à rendre le graphe parcourable en attendant.
 */
export async function voisines(entreprise: {
  siren: string;
  secteur: string | null;
  departement: string | null;
  commune: string | null;
}): Promise<{ memeVille: Voisine[]; memeDepartement: Voisine[]; memeSecteur: Voisine[] }> {
  const hors = { siren: { not: entreprise.siren } };
  const actives = { etatAdministratif: "ACTIVE" as const };

  const [memeVille, memeDepartement, memeSecteur] = await Promise.all([
    entreprise.commune && entreprise.secteur
      ? prisma.entreprise.findMany({
          where: { ...hors, ...actives, commune: entreprise.commune, secteur: entreprise.secteur },
          select: CHAMPS,
          orderBy: { denomination: "asc" },
          take: 8,
        })
      : [],
    entreprise.departement && entreprise.secteur
      ? prisma.entreprise.findMany({
          where: { ...hors, ...actives, departement: entreprise.departement, secteur: entreprise.secteur },
          select: CHAMPS,
          orderBy: { denomination: "asc" },
          take: 8,
        })
      : [],
    entreprise.secteur ? voisinesDuSecteur(entreprise.secteur, entreprise.siren) : [],
  ]);

  const vus = new Set<string>();
  const filtrer = (lignes: Voisine[]) =>
    lignes.filter((l) => {
      if (vus.has(l.slug)) return false;
      vus.add(l.slug);
      return true;
    });

  return {
    memeVille: filtrer(aplatir(memeVille)),
    memeDepartement: filtrer(aplatir(memeDepartement)),
    memeSecteur: filtrer(aplatir(memeSecteur)),
  };
}

export { libelleSecteur, nomDepartement, SECTEURS, DEPARTEMENTS };
