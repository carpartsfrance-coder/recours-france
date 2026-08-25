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
 *     un signalement, ou une décision de justice. Ce sont les entreprises avec
 *     lesquelles un consommateur peut effectivement avoir eu affaire. ~71 000.
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

/**
 * Le palier, non comme une clause mais comme une liste de clauses à réunir.
 *
 * Le palier 1 tient en un `OR` de trois critères — un site, une boutique, un
 * signalement. Écrit ainsi, aucun index ne s'applique : Postgres relit la
 * plage entière et filtre. Sur une tranche d'un dixième du répertoire, un
 * million trois cent mille lignes, quarante secondes mesurées.
 *
 * Interrogés séparément, chacun trouve son index — l'index partiel des
 * sociétés ayant un site, la clé étrangère des boutiques, celle des
 * signalements. Trois cent cinquante millisecondes à eux trois, en parallèle.
 * L'appelant réunit les résultats et écarte les doublons ; c'est ce que la
 * base aurait fait, en moins bien.
 *
 * Aux paliers 2 et 3 il n'y a pas de `OR` : la liste ne compte qu'une clause,
 * et l'appelant n'a rien de particulier à faire.
 */
export function clausesPlanDeSite(): Prisma.EntrepriseWhereInput[] {
  if (PALIER_OUVERT >= 3) return [OU_INDEXABLE];
  /**
   * Les deux exclusions tiennent dans un seul `NOT`, sous forme de liste.
   *
   * Écrites en deux clés `NOT` successives — l'une venant du socle par
   * diffusion, l'autre ajoutée ici — la seconde écrasait la première : les
   * sociétés civiles rentraient par la fenêtre. Cent neuf fiches y passaient
   * au palier d'ouverture, où il faut un site déclaré pour entrer ; au palier
   * suivant, c'étaient deux millions de sociétés civiles immobilières, soit
   * exactement ce que l'exclusion existe pour empêcher.
   */
  const sansCategories: Prisma.EntrepriseWhereInput = {
    etatAdministratif: "ACTIVE",
    NOT: [
      { categorieJuridique: { in: SOCIETES_CIVILES } },
      { categorieJuridique: { startsWith: DROIT_PUBLIC_ADMINISTRATIF } },
    ],
  };
  if (PALIER_OUVERT === 2) {
    return [{ ...sansCategories, secteur: { notIn: SECTEURS_GRAND_PUBLIC_EXCLUS } }];
  }
  const socle = sansCategories;
  return [
    { ...socle, siteWeb: { not: null } },
    { ...socle, boutiques: { some: {} } },
    { ...socle, signalements: { some: {} } },
    // Les décisions de justice sont arrivées après l'écriture de ce palier, et
    // n'y figuraient donc pas. Ce sont pourtant le contenu le plus singulier du
    // site : une fiche qui en porte onze n'a d'équivalent nulle part ailleurs.
    // DISTRIMOTOR, la fiche la mieux fournie du répertoire, se trouvait exclue
    // du plan de site faute de site déclaré — et dix-huit des vingt fiches
    // portant une décision avec elle.
    { ...socle, decisions: { some: {} } },
  ];
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

/**
 * Ce que le plan de site propose parmi les boutiques : celles rattachées à une
 * société, et celles portant un signalement.
 *
 * Mesuré page à page en production : une boutique rattachée rend cent
 * quatre-vingt-quinze lignes de texte — SIREN, adresse, forme juridique, date
 * d'immatriculation, provenance du rattachement. Une boutique non rattachée en
 * rend cent quatre-vingt-quatre, et ces cent quatre-vingt-quatre lignes sont
 * les mêmes d'une boutique à l'autre : seul le nom de domaine change. Darty.com
 * et Pepinet.fr rendaient le même document.
 *
 * Cent quinze mille neuf cents pages identiques proposées à un moteur sur un
 * domaine d'un mois, c'est la définition de ce qu'il sanctionne. Elles restent
 * indexables et atteignables — la règle de la maison est de hiérarchiser par le
 * plan de site, pas d'exclure par `noindex` — mais elles ne sont plus
 * proposées.
 *
 * Le jour où ces pages porteront quelque chose qui leur est propre, le filtre
 * n'aura plus lieu d'être.
 */
export const OU_BOUTIQUE_PLAN_DE_SITE: Prisma.BoutiqueWhereInput = {
  AND: [
    OU_BOUTIQUE_INDEXABLE,
    { OR: [{ entrepriseId: { not: null } }, { signalements: { some: {} } }] },
  ],
};
