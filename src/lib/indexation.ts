import type { Prisma } from "@prisma/client";

/**
 * Ce qui est proposé aux moteurs, et dans quel ordre.
 *
 * Deux mécanismes distincts, qu'il ne faut pas confondre.
 *
 *  — `noindex` exclut définitivement. Réservé à ce qui n'a aucun sens à
 *    paraître, jamais à ce qui est simplement moins prioritaire : une page
 *    laissée longtemps en `noindex` cesse d'être réexplorée, et la rouvrir
 *    ensuite coûte des mois.
 *
 *  — Le plan de site hiérarchise. C'est lui qui exprime la priorité, avec le
 *    maillage interne. Une fiche hors du plan de site reste indexable et reste
 *    atteignable par les liens ; elle attend simplement son tour.
 *
 * Un domaine neuf qui soumet sept millions de pages quasi jumelles est jugé sur
 * la moyenne. Pappers et societe.com en ont autant d'indexées, mais après vingt
 * ans d'ancienneté. D'où l'étagement : on présente d'abord ce qu'on a de mieux,
 * on ouvre quand le premier palier est effectivement indexé.
 */

/**
 * Sociétés civiles — code 6540 de la nomenclature Insee, plus le 6588 résiduel.
 *
 * Une SCI n'a pas de consommateurs : aucun litige de consommation n'est
 * possible avec elle, par construction. Deux millions de fiches demandant
 * « un problème avec cette société ? » à des sociétés civiles immobilières
 * abîmeraient la moyenne du domaine sans jamais servir personne.
 *
 * Les codes voisins ne sont pas visés : 6521 et 6532 sont des coopératives, qui
 * vendent bel et bien à des particuliers. D'où l'énumération exacte plutôt
 * qu'un préfixe.
 */
const SOCIETES_CIVILES = ["6540", "6588"];

/**
 * Secteurs où un litige de consommation existe réellement.
 *
 * « autre » et « immobilier » en sont exclus : le premier rassemble surtout des
 * associations, du conseil aux entreprises et des clubs sportifs, le second est
 * aux quatre cinquièmes des sociétés civiles.
 */
const SECTEURS_GRAND_PUBLIC_EXCLUS = ["autre", "immobilier"];

export type PourIndexation = {
  etatAdministratif: string;
  categorieJuridique: string | null;
};

/**
 * Une fiche mérite-t-elle de paraître dans les résultats de recherche ?
 *
 * Non pour une société radiée : la page lui demande de réagir à un litige, ce
 * qui n'a pas de sens et ne rend service à personne. Non pour une société
 * civile, qui n'a pas de clients.
 */
export function ficheIndexable(e: PourIndexation): boolean {
  if (e.etatAdministratif !== "ACTIVE") return false;
  if (e.categorieJuridique && SOCIETES_CIVILES.includes(e.categorieJuridique)) return false;
  return true;
}

/** La même règle, côté base. */
export const OU_INDEXABLE: Prisma.EntrepriseWhereInput = {
  etatAdministratif: "ACTIVE",
  NOT: { categorieJuridique: { in: SOCIETES_CIVILES } },
};

/**
 * Le palier proposé au plan de site.
 *
 * 1 — la fiche porte un signal réel : un site déclaré, une boutique en ligne,
 *     ou un signalement. Ce sont les entreprises avec lesquelles un
 *     consommateur peut effectivement avoir eu affaire. ~86 000.
 * 2 — active, dans un secteur grand public. ~3,26 millions.
 * 3 — le reste des actives : indexable et atteignable par le maillage, mais
 *     hors du plan de site tant que les paliers précédents ne sont pas
 *     effectivement indexés.
 *
 * Le palier ouvert se règle par variable d'environnement, sans redéploiement de
 * code : la décision d'élargir se prend au vu de la Search Console, pas au
 * calendrier.
 */
export const PALIER_OUVERT = Math.min(3, Math.max(1, Number(process.env.SEO_PALIER ?? 1) || 1));

export function ouPlanDeSite(): Prisma.EntrepriseWhereInput {
  if (PALIER_OUVERT >= 3) return OU_INDEXABLE;
  if (PALIER_OUVERT === 2) {
    return { ...OU_INDEXABLE, secteur: { notIn: SECTEURS_GRAND_PUBLIC_EXCLUS } };
  }
  return {
    ...OU_INDEXABLE,
    OR: [
      { siteWeb: { not: null } },
      { boutiques: { some: {} } },
      { signalements: { some: {} } },
    ],
  };
}

/**
 * Une boutique ne s'ouvre aux moteurs qu'une fois qu'elle a quelque chose à dire.
 *
 * Le référentiel des boutiques sert d'abord le produit : rattacher un
 * signalement au bon domaine quand un consommateur déclare un litige avec une
 * boutique en ligne. Publier chacune de ces fiches est une autre affaire.
 *
 * Mesuré sur une page boutique réelle : six cent soixante-dix-sept mots, dont
 * DIX lui appartiennent — 98,5 % de gabarit. C'est le modèle le plus mince du
 * site. En publier cent quarante mille de cette nature ferait exactement ce
 * qu'on cherche à éviter depuis le début : noyer les pages qui méritent d'être
 * lues sous des pages qui n'apprennent rien, et faire juger le domaine sur sa
 * moyenne.
 *
 * Le critère est donc le même que pour les fiches d'entreprise, et il est
 * automatique : dès qu'une boutique porte un signalement, elle a du contenu
 * propre, elle devient indexable et rejoint le plan de site. Aucune décision à
 * reprendre à la main.
 */
export function boutiqueIndexable(b: { signalements?: unknown[]; _count?: { signalements: number } }): boolean {
  if (typeof b._count?.signalements === "number") return b._count.signalements > 0;
  return Array.isArray(b.signalements) && b.signalements.length > 0;
}

/** La même règle, côté base. */
export const OU_BOUTIQUE_INDEXABLE: Prisma.BoutiqueWhereInput = {
  signalements: { some: { moderation: "PUBLIE" } },
};
