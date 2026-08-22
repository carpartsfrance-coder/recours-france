import { PrismaClient } from "@prisma/client";

/**
 * Toute requête est bornée dans le temps.
 *
 * Sans limite, une requête mal servie ne ralentit pas la page : elle la bloque.
 * Mesuré en production, une recherche a occupé une connexion trois cents
 * secondes sans jamais répondre, pendant que les autres visiteurs attendaient
 * leur tour sur un pool saturé.
 *
 * Dix secondes : au-delà, la page a de toute façon perdu son lecteur, et mieux
 * vaut une erreur franche qu'une attente sans fin. Les tâches planifiées, qui
 * ont besoin de longues requêtes, ouvrent leurs propres connexions par psql.
 */
const DELAI_MAX_MS = Number(process.env.DELAI_REQUETE_MS ?? 10_000);

function avecDelai(url: string | undefined): string | undefined {
  if (!url || DELAI_MAX_MS <= 0) return url;
  try {
    const u = new URL(url);
    // `options` est transmis tel quel au serveur ; on ne l'écrase pas s'il
    // porte déjà un réglage voulu.
    if (!u.searchParams.has("options")) {
      u.searchParams.set("options", `-c statement_timeout=${DELAI_MAX_MS}`);
    }
    return u.toString();
  } catch {
    return url;
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
