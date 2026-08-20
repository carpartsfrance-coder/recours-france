import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { DEPARTEMENTS, SECTEURS, cheminCommune, cheminDepartement, cheminSecteur } from "@/lib/maillage";
import {
  PAR_FICHIER,
  RANG_COMMUNES,
  RANG_DEPARTEMENTS,
  RANG_ENTREPRISES,
  RANG_SIGNAL,
  RANG_STATIQUES,
  base,
  nombreDeTranches,
  prefixes,
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
  try {
    const total = await nombreDeTranches();
    return Array.from({ length: total }, (_, id) => ({ id }));
  } catch {
    return [{ id: 0 }];
  }
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

  if (rangDemande === RANG_DEPARTEMENTS) {
    const peuples = await prisma.entreprise.groupBy({
      by: ["secteur", "departement"],
      where: { etatAdministratif: "ACTIVE", departement: { not: null } },
      _count: { _all: true },
    });
    return peuples.flatMap((d) => {
      const href = d.secteur ? cheminDepartement(d.secteur, d.departement!) : null;
      return href
        ? [{ url: `${b}${href}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 }]
        : [];
    });
  }

  // Les fiches qui portent un signal — une déclaration de consommateur ou un
  // site rattaché — passent avant le gros du répertoire. Le budget
  // d'exploration est fini : autant qu'il commence par ce qui a du contenu.
  if (rangDemande === RANG_SIGNAL) {
    const fiches = await prisma.entreprise.findMany({
      where: { OR: [{ signalements: { some: {} } }, { siteWeb: { not: null } }] },
      select: { slug: true, majLe: true },
      orderBy: { majLe: "desc" },
      take: PAR_FICHIER,
    });
    return fiches.map((e) => ({
      url: `${b}/entreprises/${e.slug}`,
      lastModified: e.majLe,
      changeFrequency: "daily" as const,
      priority: 0.9,
    }));
  }

  if (rangDemande < RANG_SIGNAL) {
    const departement = DEPARTEMENTS[rangDemande - RANG_COMMUNES]?.code;
    if (!departement) return [];
    const communes = await prisma.entreprise.groupBy({
      by: ["secteur", "commune"],
      where: { etatAdministratif: "ACTIVE", departement, commune: { not: null } },
      _count: { _all: true },
    });
    return communes.flatMap((c) => {
      const href = c.secteur ? cheminCommune(c.secteur, departement, c.commune!) : null;
      return href
        ? [{ url: `${b}${href}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 }]
        : [];
    });
  }

  const liste = await prefixes();
  const rang = rangDemande - RANG_ENTREPRISES;

  if (rang < liste.length) {
    const p = liste[rang];
    // Encadrement textuel plutôt que `left(siren,4) = p` : seule cette forme
    // se résout par l'index unique du SIREN.
    const fiches = await prisma.entreprise.findMany({
      where: { siren: { gte: p.padEnd(9, "0"), lte: p.padEnd(9, "9") } },
      select: { slug: true, majLe: true },
      take: PAR_FICHIER,
    });
    return fiches.map((e) => ({
      url: `${b}/entreprises/${e.slug}`,
      lastModified: e.majLe,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  }

  const boutiques = await prisma.boutique.findMany({
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
