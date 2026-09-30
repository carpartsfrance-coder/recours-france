import type { Prisma } from "@prisma/client";

/**
 * Ce qui est proposé aux moteurs.
 *
 * ── La règle précédente, et ce qui l'a démentie ────────────────────────────
 * Ce fichier posait qu'on n'excluait jamais par `noindex`, et qu'on se
 * contentait de hiérarchiser par le plan de site : une fiche hors du plan
 * restait indexable et atteignable, elle attendait son tour. Le raisonnement
 * était juste sur un point — une page laissée longtemps en `noindex` cesse
 * d'être réexplorée — et faux sur l'essentiel : il supposait que le plan de
 * site décide de ce qui entre dans l'index. Il n'en décide pas.
 *
 * Relevé en Search Console le 30 septembre 2026, sur un domaine de deux mois :
 *
 *   — 339 000 pages dans l'index, pour 369 476 adresses au plan de site ;
 *   — aucune action manuelle, donc aucune pénalité : le domaine a été
 *     déclassé par les systèmes de qualité, pas sanctionné ;
 *   — le trafic est tombé de ~300 clics par jour à zéro entre le 12 et le
 *     15 septembre, et n'est jamais remonté ;
 *   — 22 650 erreurs 5xx relevées, Googlebot saturant l'instance sur des
 *     centaines de milliers d'adresses.
 *
 * Le maillage interne avait suffi à tout faire indexer. Le plan de site
 * étageait 71 000 fiches ; Google en a indexé 339 000, parce que les pages de
 * ville s'enchaînent les unes aux autres et mènent à toutes les fiches. On
 * avait donc la surface d'un annuaire de treize millions de lignes, et le
 * contenu d'une trentaine de pages rédigées.
 *
 * ── La règle qui la remplace ───────────────────────────────────────────────
 * Une page n'est indexable que si elle porte quelque chose qui lui est propre.
 * Pas « quelque chose de plus que les autres pages du site » : quelque chose
 * qu'on ne trouve pas ailleurs. Recopier le répertoire Sirene n'y suffit pas —
 * il est public, et d'autres le recopient depuis vingt ans.
 *
 * Mesuré sur la base complète, 12 997 993 fiches :
 *
 *   — 6 portent un signalement de consommateur ;
 *   — 20 portent une décision de justice ;
 *   — 191 portent un compte annuel déposé ;
 *   — 260 portent une publication BODACC ;
 *   — 280 en portent au moins un des quatre.
 *
 * Deux cent quatre-vingts. C'est la taille réelle de ce site aujourd'hui, et
 * c'est ce qu'il faut présenter tant qu'il n'a rien de plus. Le jour où les
 * signalements arrivent, les fiches correspondantes deviennent indexables
 * d'elles-mêmes : la règle est une mesure du contenu, pas une liste figée.
 *
 * ── Le prix, assumé ────────────────────────────────────────────────────────
 * Rouvrir une page laissée en `noindex` coûte des mois. C'est moins cher que
 * de laisser 339 000 pages creuses décider de la moyenne du domaine.
 */

/**
 * Sociétés civiles — code 6540 de la nomenclature Insee, plus le 6588 résiduel.
 *
 * Une SCI n'a pas de consommateurs : aucun litige de consommation n'est
 * possible avec elle, par construction.
 *
 * Les codes voisins ne sont pas visés : 6521 et 6532 sont des coopératives, qui
 * vendent bel et bien à des particuliers. D'où l'énumération exacte plutôt
 * qu'un préfixe.
 */
const SOCIETES_CIVILES = ["6540", "6588"];

/**
 * Les personnes morales de droit public administratif.
 *
 * La catégorie juridique 7 rassemble l'État, les collectivités territoriales
 * et les établissements publics administratifs : préfectures, mairies, lycées,
 * collèges. Personne ne cherche « avis collège Robert Schuman », et un
 * différend avec un établissement scolaire ne relève pas du droit de la
 * consommation mais du recours administratif.
 *
 * Les établissements publics à caractère industriel et commercial ne sont pas
 * concernés : ils relèvent de la catégorie 4, et un litige avec eux est bien
 * un litige de consommation.
 */
const DROIT_PUBLIC_ADMINISTRATIF = "7";

export type PourIndexation = {
  etatAdministratif: string;
  categorieJuridique: string | null;
};

/**
 * Ce qu'une fiche porte en propre.
 *
 * Les quatre seuls contenus du site qu'un autre annuaire n'affiche pas déjà.
 * L'identité au registre n'en fait pas partie : elle est la même partout, et
 * c'est elle qui compose les 99,99 % de pages qui se ressemblent.
 */
export type ContenuFiche = {
  signalements: number;
  decisions: number;
  comptes: number;
  evenements: number;
};

export function ficheAvecContenu(c: ContenuFiche): boolean {
  return c.signalements > 0 || c.decisions > 0 || c.comptes > 0 || c.evenements > 0;
}

/**
 * Une fiche mérite-t-elle de paraître dans les résultats de recherche ?
 *
 * Non pour une société radiée : la page lui demande de réagir à un litige, ce
 * qui n'a pas de sens. Non pour une société civile, qui n'a pas de clients.
 * Non, désormais, pour une fiche qui ne porte que son identité au registre :
 * elle est titrée « Avis sur X » et n'a aucun avis à montrer.
 */
export function ficheIndexable(e: PourIndexation, contenu: ContenuFiche): boolean {
  if (e.etatAdministratif !== "ACTIVE") return false;
  if (e.categorieJuridique && SOCIETES_CIVILES.includes(e.categorieJuridique)) return false;
  if (e.categorieJuridique?.startsWith(DROIT_PUBLIC_ADMINISTRATIF)) return false;
  return ficheAvecContenu(contenu);
}

/**
 * La même règle, côté base — et la seule liste que le plan de site propose.
 *
 * Plan de site et `noindex` disent désormais la même chose. Ils divergeaient :
 * le plan proposait 81 763 fiches à l'exploration quand aucune règle ne les
 * empêchait d'entrer dans l'index. Proposer à un robot ce qu'on lui interdit
 * ensuite d'indexer est le pire des deux mondes — on dépense son budget
 * d'exploration pour rien.
 *
 * Quatre clauses plutôt qu'un `OR` : réunis dans une même clause, aucun index
 * ne s'applique et Postgres relit les treize millions de lignes. Séparés,
 * chacun se résout par la clé étrangère de sa table. L'appelant réunit les
 * résultats et écarte les doublons.
 */
export function clausesPlanDeSite(): Prisma.EntrepriseWhereInput[] {
  /**
   * Les exclusions tiennent dans un seul `NOT`, sous forme de liste.
   *
   * Écrites en deux clés `NOT` successives, la seconde écrasait la première et
   * les sociétés civiles rentraient par la fenêtre.
   */
  const socle: Prisma.EntrepriseWhereInput = {
    etatAdministratif: "ACTIVE",
    NOT: [
      { categorieJuridique: { in: SOCIETES_CIVILES } },
      { categorieJuridique: { startsWith: DROIT_PUBLIC_ADMINISTRATIF } },
    ],
  };
  // L'ordre compte : le budget d'exploration est fini, autant qu'il commence
  // par ce qui porte un récit ou une décision plutôt que par un compte annuel.
  return [
    { ...socle, signalements: { some: {} } },
    { ...socle, decisions: { some: {} } },
    { ...socle, comptes: { some: {} } },
    { ...socle, evenements: { some: {} } },
  ];
}

/**
 * Les boutiques : rattachées à une société, ou porteuses d'un signalement.
 *
 * L'éditeur avait tranché pour l'indexation de toutes les boutiques, contre la
 * recommandation, et il avait une raison qui tient toujours : « avis
 * maboutique.fr » est exactement la requête d'un consommateur qui hésite avant
 * de commander, et cette page est la seule au monde qui puisse lui répondre.
 *
 * Elle ne le peut que si elle sait quelque chose. Mesuré page à page : une
 * boutique rattachée rend 195 lignes de texte — SIREN, adresse, forme
 * juridique, date d'immatriculation, provenance du rattachement. Une boutique
 * non rattachée en rend 184, et ces 184 lignes sont les mêmes d'une boutique à
 * l'autre : seul le nom de domaine change. Darty.com et Pepinet.fr rendaient
 * le même document.
 *
 * 115 909 boutiques sur 185 058 sont dans ce cas. Elles sortent de l'index.
 * Les 69 149 restantes répondent vraiment à la question posée.
 *
 * Restent exclues les boutiques éteintes : un domaine sans signe de vie depuis
 * plus de trois ans n'a plus de client à renseigner.
 */
const INACTIVITE_MAX_ANNEES = 3;

function limiteActivite(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - INACTIVITE_MAX_ANNEES);
  return d;
}

export type PourIndexationBoutique = {
  derniereActivite?: Date | null;
  entrepriseId: string | null;
  signalements: number;
};

export function boutiqueIndexable(b: PourIndexationBoutique): boolean {
  // Une date inconnue ne condamne pas : elle signifie seulement que la source
  // ne l'a pas fournie, pas que le site est mort.
  if (b.derniereActivite && b.derniereActivite < limiteActivite()) return false;
  return b.entrepriseId !== null || b.signalements > 0;
}

/** La même règle, côté base. Plan de site et `noindex` ne peuvent plus diverger. */
export const OU_BOUTIQUE_PLAN_DE_SITE: Prisma.BoutiqueWhereInput = {
  AND: [
    { OR: [{ derniereActivite: null }, { derniereActivite: { gte: limiteActivite() } }] },
    { OR: [{ entrepriseId: { not: null } }, { signalements: { some: { moderation: "PUBLIE" } } }] },
  ],
};
