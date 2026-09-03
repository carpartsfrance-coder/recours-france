/**
 * Chronomètre, une par une, les requêtes d'une fiche entreprise.
 *
 * Trois fiches parisiennes sur quatre répondent 500 en production, après douze
 * à vingt-neuf secondes, quand les mêmes requêtes tiennent en quelques
 * millisecondes sur une copie locale de la même base. La différence ne se
 * devine pas : elle se mesure là où le problème se produit.
 *
 * Rien ne passe par la ligne de commande, pour les mêmes raisons que
 * `npm run admin` : l'adresse de la base est reprise de `DATABASE_URL` si elle
 * est posée, demandée sans écho sinon.
 *
 *   npm run diagnostic
 *   npm run diagnostic -- --slug=danone-552032534
 *
 * Le rapport classe les requêtes de la plus lente à la plus rapide, puis
 * demande à PostgreSQL son plan d'exécution pour la pire — c'est lui qui dit
 * quel index manque, là où le chronomètre ne dit que « c'est lent ».
 */

import "dotenv/config";
import { createInterface } from "node:readline";
import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const slugDemande = args.find((a) => a.startsWith("--slug="))?.split("=")[1];

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let masquer = false;
{
  const interne = rl as unknown as { _writeToOutput: (s: string) => void };
  const ecrire = interne._writeToOutput.bind(rl);
  interne._writeToOutput = (s: string) => {
    if (!masquer || s.includes("?") || s.includes(":")) ecrire(s);
    else if (s.trim().length > 0) ecrire("*");
  };
}
function demander(question: string, masque = false): Promise<string> {
  masquer = masque;
  return new Promise((r) => rl.question(question, (rep) => { masquer = false; if (masque) process.stdout.write("\n"); r(rep.trim()); }));
}
function sansSecret(url: string): string {
  try { const u = new URL(url); return `${u.protocol}//${u.username ? "***@" : ""}${u.host}${u.pathname}`; }
  catch { return "(adresse illisible)"; }
}

/** Les champs que `voisines()` sélectionne — mêmes colonnes, même coût. */
const CHAMPS = { id: true, slug: true, denomination: true, commune: true };

async function main() {
  console.log("Diagnostic d'une fiche entreprise — Recours France\n");

  let url = process.env.DATABASE_URL ?? "";
  if (url) {
    console.log(`Base trouvée dans l'environnement : ${sansSecret(url)}`);
    if ((await demander("L'utiliser ? [O/n] ")).toLowerCase().startsWith("n")) url = "";
  }
  if (!url) {
    console.log("\nColle l'adresse de la base (elle ne s'affichera pas).");
    console.log("Sur Render : Dashboard → la base Postgres → « External Database URL ».");
    url = await demander("DATABASE_URL : ", true);
  }
  if (!url.startsWith("postgres")) { console.error("\nCe n'est pas une adresse PostgreSQL."); process.exit(1); }

  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    const [entreprises, signalements] = await Promise.all([
      prisma.entreprise.count(), prisma.signalement.count(),
    ]);
    console.log(`\nBase : ${sansSecret(url)}`);
    console.log(`  ${entreprises.toLocaleString("fr-FR")} entreprises, ${signalements} signalement(s)`);

    const slug = slugDemande || (await demander("\nSlug de la fiche [danone-552032534] : ")) || "danone-552032534";
    const e = await prisma.entreprise.findUnique({
      where: { slug },
      select: { id: true, siren: true, secteur: true, departement: true, communeSlug: true, denomination: true },
    });
    if (!e) { console.error(`\nAucune entreprise pour « ${slug} ».`); return; }
    console.log(`\n${e.denomination} — secteur « ${e.secteur} », département ${e.departement}, commune « ${e.communeSlug} »\n`);

    const hors = { siren: { not: e.siren } };
    const actives = { etatAdministratif: "ACTIVE" as const };

    // Chaque entrée reproduit une requête réellement exécutée au rendu de la
    // fiche. Elles sont lancées une par une, jamais en parallèle : le but est
    // de savoir laquelle coûte, pas de reproduire le temps total.
    const mesures: { nom: string; ms: number; lignes: number }[] = [];
    const chrono = async (nom: string, fn: () => Promise<unknown>) => {
      process.stdout.write(`  ${nom.padEnd(38)}`);
      const t = Date.now();
      let lignes = 0;
      try {
        const r = await fn();
        lignes = Array.isArray(r) ? r.length : typeof r === "number" ? r : r ? 1 : 0;
      } catch (err) {
        console.log(`  ÉCHEC — ${err instanceof Error ? err.message.split("\n")[0] : err}`);
        mesures.push({ nom, ms: Date.now() - t, lignes: -1 });
        return;
      }
      const ms = Date.now() - t;
      mesures.push({ nom, ms, lignes });
      console.log(`${String(ms).padStart(7)} ms   ${lignes} ligne(s)`);
    };

    await chrono("fiche par slug", () => prisma.entreprise.findUnique({ where: { slug } }));
    await chrono("compte des signalements", () => prisma.signalement.count({ where: { entrepriseId: e.id, moderation: "PUBLIE" } }));
    await chrono("établissements", () => prisma.etablissement.findMany({ where: { entrepriseId: e.id }, orderBy: [{ estSiege: "desc" }, { commune: "asc" }] }));
    await chrono("évènements BODACC", () => prisma.evenement.findMany({ where: { entrepriseId: e.id }, orderBy: { date: "desc" }, take: 40 }));
    await chrono("comptes annuels", () => prisma.compteAnnuel.findMany({ where: { entrepriseId: e.id }, orderBy: { exercice: "desc" } }));
    await chrono("sources de données", () => prisma.donneeSource.findMany({ where: { entrepriseId: e.id } }));
    await chrono("décisions de justice", () => prisma.decisionJustice.findMany({ where: { entrepriseId: e.id }, orderBy: { date: "desc" }, take: 25 }));
    await chrono("signalements publiés", () => prisma.signalement.findMany({ where: { entrepriseId: e.id, moderation: "PUBLIE" }, orderBy: { creeLe: "desc" }, take: 10 }));
    await chrono("boutique rattachée", () => prisma.boutique.findFirst({ where: { entrepriseId: e.id }, select: { slug: true, domaine: true } }));

    await chrono("voisines — même ville", () =>
      prisma.entreprise.findMany({
        where: { ...hors, ...actives, secteur: e.secteur, departement: e.departement, communeSlug: e.communeSlug },
        select: CHAMPS, orderBy: { denomination: "asc" }, take: 8,
      }));
    await chrono("voisines — même département", () =>
      prisma.entreprise.findMany({
        where: { ...hors, ...actives, departement: e.departement, secteur: e.secteur },
        select: CHAMPS, orderBy: { denomination: "asc" }, take: 8,
      }));
    await chrono("voisines — secteur, signalées", () =>
      prisma.entreprise.findMany({
        where: { ...hors, ...actives, secteur: e.secteur, signalements: { some: { moderation: "PUBLIE" } } },
        select: CHAMPS, take: 8,
      }));
    await chrono("voisines — secteur, avec site", () =>
      prisma.entreprise.findMany({
        where: { ...hors, ...actives, secteur: e.secteur, siteWeb: { not: null } },
        select: CHAMPS, take: 8,
      }));

    const classees = [...mesures].sort((a, b) => b.ms - a.ms);
    const total = mesures.reduce((s, m) => s + m.ms, 0);
    console.log(`\n  Total : ${total} ms`);
    console.log(`  La plus lente : « ${classees[0].nom} » à ${classees[0].ms} ms — ${Math.round((100 * classees[0].ms) / Math.max(1, total))} % du total\n`);

    // Le chronomètre dit « c'est lent » ; le plan dit pourquoi. On ne le
    // demande que pour les requêtes de voisinage : les autres portent sur une
    // clé étrangère indexée et ne peuvent pas déraper.
    if (classees[0].ms > 500 && classees[0].nom.startsWith("voisines")) {
      console.log("  Plan d'exécution de la requête la plus lente :\n");
      const plans: Record<string, string> = {
        "voisines — même ville": `SELECT id FROM "Entreprise" WHERE "etatAdministratif"='ACTIVE' AND secteur=$1 AND departement=$2 AND "communeSlug"=$3 AND siren<>$4 ORDER BY denomination ASC LIMIT 8`,
        "voisines — même département": `SELECT id FROM "Entreprise" WHERE "etatAdministratif"='ACTIVE' AND secteur=$1 AND departement=$2 AND siren<>$3 ORDER BY denomination ASC LIMIT 8`,
        "voisines — secteur, signalées": `SELECT e.id FROM "Entreprise" e WHERE e."etatAdministratif"='ACTIVE' AND e.secteur=$1 AND e.siren<>$2 AND EXISTS (SELECT 1 FROM "Signalement" s WHERE s."entrepriseId"=e.id AND s.moderation='PUBLIE') LIMIT 8`,
        "voisines — secteur, avec site": `SELECT id FROM "Entreprise" WHERE "etatAdministratif"='ACTIVE' AND secteur=$1 AND "siteWeb" IS NOT NULL AND siren<>$2 LIMIT 8`,
      };
      const sql = plans[classees[0].nom];
      const params: unknown[] =
        classees[0].nom === "voisines — même ville" ? [e.secteur, e.departement, e.communeSlug, e.siren]
        : classees[0].nom === "voisines — même département" ? [e.secteur, e.departement, e.siren]
        : [e.secteur, e.siren];
      const plan = await prisma.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`, ...params);
      for (const l of plan.slice(0, 12)) console.log("    " + l["QUERY PLAN"]);
    }

    console.log("\n  Index présents sur « Entreprise » :");
    const idx = await prisma.$queryRawUnsafe<{ indexdef: string }[]>(
      `SELECT indexdef FROM pg_indexes WHERE tablename='Entreprise' ORDER BY indexname`);
    for (const i of idx) console.log("    " + i.indexdef.replace(/^CREATE (UNIQUE )?INDEX /, "").replace(/ ON public\."Entreprise"/, " ::"));
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main().catch((e) => { console.error(`\n${e instanceof Error ? e.message : e}`); process.exit(1); });
