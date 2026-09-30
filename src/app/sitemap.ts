import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { OU_BOUTIQUE_PLAN_DE_SITE } from "@/lib/indexation";
import { SECTEURS, cheminDepartement, cheminSecteur } from "@/lib/maillage";
import {
  PAR_FICHIER,
  RANG_DEPARTEMENTS,
  RANG_ENTREPRISES,
  RANG_STATIQUES,
  base,
  fichesIndexables,
  nombreDeTranches,
  tranchesFiches,
  tranchesSansBase,
} from "@/lib/plan-de-site";

/**
 * Plan de site découpé.
 *
 * Le protocole plafonne un fichier à 50 000 adresses ; un index rassemble les
 * tranches. Le découpage vit dans `lib/plan-de-site.ts`, parce que l'index et
 * les tranches doivent s'accorder sur les mêmes rangs.
 *
 * Le plan ne propose plus que ce qui est indexable — voir `lib/indexation.ts`.
 * Il proposait 369 476 adresses en septembre 2026 quand rien n'empêchait
 * Google d'en indexer 339 000 ; le domaine a été déclassé, et les pages de
 * ville, de même que les fiches sans contenu propre, sont passées en
 * `noindex`. Les proposer encore au robot dépenserait son budget contre nous.
 *
 * Un plan de site ne fait de toute façon pas indexer — il signale l'existence
 * des pages, rien de plus. Ce qui décide de l'exploration, c'est le maillage
 * interne construit dans `lib/maillage.ts`, et c'est lui qui avait suffi à
 * tout faire entrer dans l'index.
 */

/**
 * Les tranches sont produites à la demande, jamais à la compilation.
 *
 * Sans cela, Next tentait de pré-générer chaque tranche — dix-sept processus
 * en parallèle, chacun ouvrant ses connexions à la base. PostgreSQL saturait
 * au bout de trente-quatre pages : « sorry, too many clients already », et la
 * compilation échouait.
 *
 * Un plan de site n'a de toute façon rien à faire dans une compilation : il
 * est demandé quelques fois par jour par des robots.
 */
export const dynamic = "force-dynamic";

/**
 * Le relevé des tranches ne doit jamais faire échouer une compilation.
 *
 * Next appelle cette fonction pendant le build pour enregistrer les routes.
 * Elle interrogeait la base — et chez l'hébergeur, la compilation tourne sans
 * DATABASE_URL : « Environment variable not found », et le déploiement entier
 * s'arrêtait sur un plan de site.
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
    // Le repli ne renvoyait que la tranche 0 : une base indisponible le temps
    // d'un appel réduisait le plan de site à sa première tranche et faisait
    // répondre 404 à toutes les autres. Le repli se calcule donc sans la base.
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
      // d'aucune donnée, et désormais l'essentiel de ce que le site présente.
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
   * mille six cents couples : dix secondes mesurées en production. Google
   * abandonne un plan de site qui répond si lentement, et celui-ci est le
   * deuxième fichier de l'index — le premier que le robot ouvre après les
   * pages fixes.
   *
   * `CompteurAnnuaire` contient exactement ces couples, écrits chaque nuit par
   * `scripts/compteurs-annuaire.ts` avec la même agrégation. On les relit.
   * L'agrégation reste en secours : sur une base fraîchement installée la
   * table est vide, et un plan de site vide vaut moins qu'un plan de site lent.
   *
   * C'est le dernier étage de l'annuaire qui reste indexable. Les pages de
   * ville sont passées en `noindex` : elles recopiaient le répertoire Sirene
   * dans un gabarit partagé par 216 909 autres, et n'ont jamais capté un clic.
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

  /**
   * Les fiches d'entreprise, puis les boutiques.
   *
   * La liste des fiches est relevée une fois par jour et découpée ici. Elle en
   * compte 280 : le découpage par préfixe de SIREN, qui existait pour tenir
   * treize millions de lignes hors mémoire, a été retiré avec les paliers.
   */
  const tranches = await tranchesFiches();
  const rang = rangDemande - RANG_ENTREPRISES;

  if (rang < tranches) {
    const fiches = (await fichesIndexables()).slice(rang * PAR_FICHIER, (rang + 1) * PAR_FICHIER);
    return fiches.map((e) => ({
      url: `${b}/entreprises/${e.slug}`,
      lastModified: e.majLe,
      changeFrequency: "daily" as const,
      priority: 0.9,
    }));
  }

  // Seules les boutiques rattachées à une société ou porteuses d'un
  // signalement : les autres rendent toutes le même document, au nom de
  // domaine près.
  const boutiques = await prisma.boutique.findMany({
    where: OU_BOUTIQUE_PLAN_DE_SITE,
    select: { slug: true, majLe: true },
    orderBy: { id: "asc" },
    skip: (rang - tranches) * PAR_FICHIER,
    take: PAR_FICHIER,
  });
  return boutiques.map((x) => ({
    url: `${b}/boutiques/${x.slug}`,
    lastModified: x.majLe,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
}
