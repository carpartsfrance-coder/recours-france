import type { Prisma } from "@prisma/client";
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import {
  OU_BOUTIQUE_PLAN_DE_SITE,
  OU_INDEXABLE,
  PALIER_OUVERT,
  clausesPlanDeSite,
} from "@/lib/indexation";
import { DEPARTEMENTS, SECTEURS, cheminCommune, cheminDepartement, cheminSecteur } from "@/lib/maillage";
import {
  DEPARTEMENTS_PAR_TRANCHE,
  PAR_FICHIER,
  RANG_COMMUNES,
  RANG_DEPARTEMENTS,
  RANG_ENTREPRISES,
  RANG_SIGNAL,
  RANG_STATIQUES,
  SEUIL_COMMUNE,
  base,
  nombreDeTranches,
  prefixes,
  tranchesSansBase,
} from "@/lib/plan-de-site";

/**
 * Plan de site découpé.
 *
 * Le protocole plafonne un fichier à 50 000 adresses ; treize millions de
 * fiches en réclament donc plusieurs centaines, rassemblés par un index. Le
 * découpage suit le préfixe du SIREN, ce qui donne des tranches stables et,
 * surtout, interrogeables par balayage d'index : paginer par `OFFSET` à cette
 * échelle ferait relire la table depuis le début à chaque tranche.
 *
 * Un plan de site ne fait pas indexer pour autant — il signale l'existence des
 * pages, rien de plus. Ce qui décide de l'exploration, c'est le maillage
 * interne construit dans `lib/maillage.ts`.
 */

/**
 * Les tranches sont produites à la demande, jamais à la compilation.
 *
 * Sans cela, Next tentait de pré-générer les 7 566 tranches — dix-sept
 * processus en parallèle, chacun ouvrant ses connexions à la base. PostgreSQL
 * saturait au bout de trente-quatre pages : « sorry, too many clients
 * already », et la compilation échouait.
 *
 * Un plan de site n'a de toute façon rien à faire dans une compilation : il
 * est demandé quelques fois par jour par des robots, et le relevé des
 * préfixes est gardé en mémoire une journée.
 */
export const dynamic = "force-dynamic";

/**
 * Le relevé des tranches ne doit jamais faire échouer une compilation.
 *
 * Next appelle cette fonction pendant le build pour enregistrer les routes.
 * Elle interrogeait la base — et chez l'hébergeur, la compilation tourne sans
 * DATABASE_URL : « Environment variable not found », et le déploiement entier
 * s'arrête sur un plan de site.
 *
 * Le rattrapage ne perd rien. Les tranches sont rendues à la demande, et Next
 * accepte un segment absent de cette liste : ce qu'elle contient décide de ce
 * qui est pré-rendu, pas de ce qui est servi. L'inventaire réel des tranches
 * est publié par /sitemap-index.xml, produit à l'exécution — c'est lui que
 * robots.txt désigne, et lui seul que les moteurs lisent.
 */
export async function generateSitemaps() {
  let total: number;
  try {
    total = await nombreDeTranches();
  } catch {
    // Le repli ne renvoyait que la tranche 0. Next ne sert que les rangs
    // énumérés ici : une base indisponible le temps d'un appel réduisait le
    // plan de site à sa première tranche et faisait répondre 404 à toutes les
    // autres. Le repli se calcule donc sans la base — seul le nombre de
    // tranches de boutiques y était.
    total = tranchesSansBase();
  }
  return Array.from({ length: total }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: number | string | Promise<number | string>;
}): Promise<MetadataRoute.Sitemap> {
  const b = base();
  const now = new Date();

  // Next annonce un nombre, mais transmet une promesse portant le segment
  // d'URL — `handler({ params, id: idPromise })` dans son chargeur de routes.
  // Sans l'attendre, la conversion donne NaN et toutes les tranches sortent
  // vides sans qu'aucune erreur ne soit signalée.
  const rangDemande = Number(await id);
  if (!Number.isFinite(rangDemande) || rangDemande < 0) return [];

  if (rangDemande === RANG_STATIQUES) {
    const chemins = [
      "", "/entreprises", "/boutiques", "/annuaire", "/signaler", "/methodologie",
      "/aide", "/aide/justificatifs", "/aide/droits", "/demarches-officielles",
      // Les guides de démarche : les seules pages indexables qui ne dépendent
      // d'aucune donnée, donc les seules à pouvoir capter du trafic avant que
      // les fiches d'entreprise n'existent.
      "/aide/remboursement-refuse", "/aide/commande-non-recue", "/aide/garantie-refusee",
      "/aide/resiliation-prelevement", "/aide/reclamation-ecrite", "/aide/mediateur",
      "/a-propos", "/contact", "/mentions-legales", "/conditions-generales",
      "/donnees-personnelles", "/accessibilite", "/cookies", "/charte-de-moderation",
    ];
    return [
      ...chemins.map((c) => ({
        url: `${b}${c}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: c === "" ? 1 : 0.7,
      })),
      ...SECTEURS.map((s) => ({
        url: `${b}${cheminSecteur(s.code)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  }

  /**
   * Les couples secteur × département sont lus, non recomptés.
   *
   * Cette tranche agrégeait les treize millions de lignes pour n'en tirer que
   * mille sept cents couples : dix secondes mesurées en production. Google
   * abandonne un plan de site qui répond si lentement, et celui-ci est le
   * deuxième fichier de l'index — le premier que le robot ouvre après les
   * pages fixes.
   *
   * `CompteurAnnuaire` contient exactement ces couples, écrits chaque nuit par
   * `scripts/compteurs-annuaire.ts` avec la même agrégation. On les relit.
   * L'agrégation reste en secours : sur une base fraîchement installée la
   * table est vide, et un plan de site vide vaut moins qu'un plan de site lent.
   */
  if (rangDemande === RANG_DEPARTEMENTS) {
    const compteurs = await prisma.compteurAnnuaire.findMany({
      where: { departement: { not: "" } },
      select: { secteur: true, departement: true },
    });
    const couples =
      compteurs.length > 0
        ? compteurs
        : (
            await prisma.entreprise.groupBy({
              by: ["secteur", "departement"],
              where: { etatAdministratif: "ACTIVE", departement: { not: null } },
              _count: { _all: true },
            })
          ).map((d) => ({ secteur: d.secteur, departement: d.departement }));

    return couples.flatMap((d) => {
      const href = d.secteur && d.departement ? cheminDepartement(d.secteur, d.departement) : null;
      return href
        ? [{ url: `${b}${href}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 }]
        : [];
    });
  }

  // Les fiches qui portent un signal — une déclaration de consommateur ou un
  // site rattaché — passent avant le gros du répertoire. Le budget
  // d'exploration est fini : autant qu'il commence par ce qui a du contenu.
  /**
   * Les deux critères sont interrogés séparément, non par un `OR`.
   *
   * Réunis dans une même clause, aucun index ne s'applique : Postgres relisait
   * les treize millions de lignes — sept gigaoctets, douze secondes mesurées en
   * production — pour n'en retenir que quatre-vingt-six mille. Passé les dix
   * secondes que la base s'accorde, la requête était interrompue et cette
   * tranche répondait 500. Celle qui porte les meilleures fiches du site,
   * priorité 0,9, était donc vide depuis toujours.
   *
   * Séparés, chacun trouve son index — l'index partiel sur les sociétés ayant
   * un site pour le premier, la clé étrangère pour le second. Une seconde à
   * eux deux.
   *
   * Les fiches portant un signalement ou une décision de justice passent en
   * tête et échappent au plafond de cinquante mille : elles sont une poignée,
   * et ce sont les seules pages du site à porter autre chose que du registre.
   */
  if (rangDemande === RANG_SIGNAL) {
    // Au palier d'ouverture, les tranches par préfixe contiennent déjà
    // exactement ces fiches : reprendre les cinquante mille plus récentes en
    // doublerait huit pour cent du plan de site sans rien y ajouter. Seules les
    // fiches portant un signalement sont reprises — elles sont une poignée, et
    // ce sont les seules pages du site à porter un récit. Aux paliers suivants,
    // où les tranches comptent des millions de fiches, la reprise retrouve son
    // rôle : mettre en avant ce qui a du contenu.
    // Un critère, une requête. Réunis par `OR`, deux critères pourtant indexés
    // chacun de leur côté redonnent un balayage complet : la tranche est
    // repassée de six centièmes de seconde à onze en les rassemblant.
    const contenu: Prisma.EntrepriseWhereInput[] = [
      { ...OU_INDEXABLE, signalements: { some: {} } },
      { ...OU_INDEXABLE, decisions: { some: {} } },
    ];
    const lots = await Promise.all([
      ...contenu.map((where) =>
        prisma.entreprise.findMany({
          where,
          select: { slug: true, majLe: true },
          orderBy: { majLe: "desc" },
          take: PAR_FICHIER,
        }),
      ),
      PALIER_OUVERT === 1
        ? Promise.resolve([] as { slug: string; majLe: Date }[])
        : prisma.entreprise.findMany({
            where: { ...OU_INDEXABLE, siteWeb: { not: null } },
            select: { slug: true, majLe: true },
            orderBy: { majLe: "desc" },
            take: PAR_FICHIER,
          }),
    ]);
    const parSlug = new Map<string, Date>();
    for (const lot of lots) for (const e of lot) parSlug.set(e.slug, e.majLe);
    const fiches = [...parSlug].slice(0, PAR_FICHIER).map(([slug, majLe]) => ({ slug, majLe }));
    return fiches.map((e) => ({
      url: `${b}/entreprises/${e.slug}`,
      lastModified: e.majLe,
      changeFrequency: "daily" as const,
      priority: 0.9,
    }));
  }

  /**
   * Une tranche couvre dix départements, non un seul.
   *
   * Cent un fichiers pour trois cent mille adresses de villes : un robot qui
   * n'ouvre que quelques fichiers par jour n'en verrait jamais le bout. Les
   * requêtes d'un même groupe partent ensemble — la plus lente décide du
   * temps de réponse, pas leur somme.
   *
   * Le regroupement porte sur `communeSlug`, non sur `commune`. L'adresse
   * produite est la même — `cheminCommune` réduit de toute façon la valeur en
   * fragment d'URL — mais l'index qui existe déjà porte sur
   * `(secteur, departement, communeSlug, etatAdministratif)`. Grouper sur le
   * nom brut le rendait inutilisable : Postgres relisait la table par le seul
   * index de département, soit sept gigaoctets pour Paris et vingt secondes
   * mesurées. Sur le slug, il balaie l'index seul.
   *
   * Deux noms qui se réduisent au même fragment se trouvent fusionnés, ce qui
   * est exactement ce qu'il faut : ils désignaient déjà la même page.
   *
   * Le seuil écarte les villes qui ne comptent qu'une entreprise dans le
   * secteur : cette page ne dit rien que la fiche ne dise déjà.
   */
  if (rangDemande < RANG_SIGNAL) {
    const debut = (rangDemande - RANG_COMMUNES) * DEPARTEMENTS_PAR_TRANCHE;
    const lot = DEPARTEMENTS.slice(debut, debut + DEPARTEMENTS_PAR_TRANCHE);
    if (lot.length === 0) return [];

    const groupes = await Promise.all(
      lot.map(async (d) => ({
        departement: d.code,
        lignes: await prisma.entreprise.groupBy({
          by: ["secteur", "communeSlug"],
          where: {
            etatAdministratif: "ACTIVE",
            departement: d.code,
            communeSlug: { not: null },
          },
          _count: { _all: true },
        }),
      })),
    );

    return groupes.flatMap(({ departement, lignes }) =>
      lignes.flatMap((c) => {
        if (c._count._all < SEUIL_COMMUNE) return [];
        const href = c.secteur ? cheminCommune(c.secteur, departement, c.communeSlug!) : null;
        return href
          ? [{ url: `${b}${href}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 }]
          : [];
      }),
    );
  }

  const liste = await prefixes();
  const rang = rangDemande - RANG_ENTREPRISES;

  if (rang < liste.length) {
    const p = liste[rang];
    // Encadrement textuel plutôt que `left(siren,1) = p` : seule cette forme
    // se résout par l'index unique du SIREN.
    //
    // Le palier d'ouverture s'ajoute à l'encadrement : le plan de site ne
    // propose que ce qu'on veut faire explorer maintenant. Les fiches des
    // paliers suivants restent indexables et atteignables par le maillage —
    // elles attendent leur tour, elles ne sont pas exclues.
    //
    // Ses critères sont interrogés un par un et réunis ici : réunis dans un
    // `OR`, aucun index ne s'y appliquait et la tranche mettait quarante
    // secondes.
    const siren = { gte: p.padEnd(9, "0"), lte: p.padEnd(9, "9") };
    const lots = await Promise.all(
      clausesPlanDeSite().map((clause) =>
        prisma.entreprise.findMany({
          where: { ...clause, siren },
          select: { slug: true, majLe: true },
          take: PAR_FICHIER,
        }),
      ),
    );
    const parSlug = new Map<string, Date>();
    for (const lot of lots) for (const e of lot) parSlug.set(e.slug, e.majLe);
    const fiches = [...parSlug]
      .slice(0, PAR_FICHIER)
      .map(([slug, majLe]) => ({ slug, majLe }));

    return fiches.map((e) => ({
      url: `${b}/entreprises/${e.slug}`,
      lastModified: e.majLe,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  }

  // Seules les boutiques portant une déclaration : les autres sont en
  // noindex, les déclarer serait se contredire.
  const boutiques = await prisma.boutique.findMany({
    where: OU_BOUTIQUE_PLAN_DE_SITE,
    select: { slug: true, majLe: true },
    orderBy: { id: "asc" },
    skip: (rang - liste.length) * PAR_FICHIER,
    take: PAR_FICHIER,
  });
  return boutiques.map((x) => ({
    url: `${b}/boutiques/${x.slug}`,
    lastModified: x.majLe,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
}
