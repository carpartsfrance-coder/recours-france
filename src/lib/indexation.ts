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

/**
 * Les personnes morales de droit public administratif, hors du plan de site.
 *
 * La catégorie juridique 7 rassemble l'État, les collectivités territoriales
 * et les établissements publics administratifs : préfectures, mairies, lycées,
 * collèges. Elles figuraient au plan de site pour la seule raison qu'elles ont
 * un site internet — quatorze mille huit cent quatre-vingt-quatre fiches, soit
 * un sixième de ce qui est proposé à l'exploration.
 *
 * Personne ne cherche « avis collège Robert Schuman », et un différend avec un
 * établissement scolaire ne relève pas du droit de la consommation mais du
 * recours administratif. Les proposer dilue le budget d'exploration sur des
 * pages qui ne répondront jamais à une requête.
 *
 * Les établissements publics à caractère industriel et commercial ne sont pas
 * concernés : ils relèvent de la catégorie 4, et un litige avec eux est bien
 * un litige de consommation.
 *
 * Ces fiches restent indexables et atteignables par le maillage : c'est leur
 * proposition au robot qui cesse, pas leur existence.
 */
const DROIT_PUBLIC_ADMINISTRATIF = "7";

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
    return {
      ...OU_INDEXABLE,
      NOT: { categorieJuridique: { startsWith: DROIT_PUBLIC_ADMINISTRATIF } },
      secteur: { notIn: SECTEURS_GRAND_PUBLIC_EXCLUS },
    };
  }
  return {
    ...OU_INDEXABLE,
    NOT: { categorieJuridique: { startsWith: DROIT_PUBLIC_ADMINISTRATIF } },
    OR: [
      { siteWeb: { not: null } },
      { boutiques: { some: {} } },
      { signalements: { some: {} } },
    ],
  };
}

/**
 * Les boutiques sont indexables — décision de l'éditeur, prise en connaissance
 * de cause.
 *
 * La mesure qui l'a précédée : une page boutique comptait six cent
 * soixante-dix-sept mots, dont DIX lui appartenaient. J'ai recommandé de ne
 * publier que celles portant une déclaration ; l'éditeur a tranché autrement,
 * et il a une raison que la mesure ne dit pas — « avis maboutique.fr » est
 * exactement la requête d'un consommateur qui hésite avant de commander, et
 * cette page est la seule au monde qui puisse lui répondre.
 *
 * Le compromis n'est donc pas d'indexer moins, mais de publier davantage : la
 * page porte désormais l'identité de la société quand elle est connue, la
 * dernière activité constatée du domaine, et les démarches propres à un litige
 * en ligne. Un index qui ne coûte rien à qui le lit.
 *
 * Restent exclues les boutiques éteintes : un domaine sans activité depuis
 * plus de trois ans n'a plus de client à renseigner, et sa page dirait
 * seulement qu'elle ne sait rien.
 */
const INACTIVITE_MAX_ANNEES = 3;

function limiteActivite(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - INACTIVITE_MAX_ANNEES);
  return d;
}

export function boutiqueIndexable(b: { derniereActivite?: Date | null }): boolean {
  // Une date inconnue ne condamne pas : elle signifie seulement que la source
  // ne l'a pas fournie, pas que le site est mort.
  if (!b.derniereActivite) return true;
  return b.derniereActivite >= limiteActivite();
}

/** La même règle, côté base. */
export const OU_BOUTIQUE_INDEXABLE: Prisma.BoutiqueWhereInput = {
  OR: [{ derniereActivite: null }, { derniereActivite: { gte: limiteActivite() } }],
};
