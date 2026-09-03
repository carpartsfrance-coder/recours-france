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
    // `count(*)` balaie la table. Sur treize millions de lignes il dépasse le
    // délai que la production s'accorde — le diagnostic mourait sur sa
    // première ligne. `reltuples` est la statistique que PostgreSQL tient à
    // jour ; elle est approximative et instantanée, ce qui suffit ici.
    console.log(`\nBase : ${sansSecret(url)}`);
    const tailles = await prisma.$queryRawUnsafe<{ table: string; lignes: bigint; taille: string }[]>(`
      SELECT relname AS "table", GREATEST(reltuples,0)::bigint AS lignes,
             pg_size_pretty(pg_total_relation_size(oid)) AS taille
      FROM pg_class WHERE relname IN ('Entreprise','Signalement','Boutique','Evenement','CompteAnnuel')
        AND relkind='r' ORDER BY pg_total_relation_size(oid) DESC`);
    for (const t of tailles) {
      console.log(`  ${t.table.padEnd(14)} ~${Number(t.lignes).toLocaleString("fr-FR").padStart(12)} lignes   ${t.taille}`);
    }

    // Les statistiques du planificateur.
    //
    // Sans elles, PostgreSQL ne sait pas combien de lignes une valeur va
    // ramener : il choisit alors un plan au jugé, excellent pour certaines
    // valeurs et catastrophique pour d'autres. C'est le seul mécanisme connu
    // qui produise « rapide dans la Creuse, coupé à Paris » avec les mêmes
    // index et les mêmes données.
    const stats = await prisma.$queryRawUnsafe<{ relname: string; last_analyze: Date | null; last_autoanalyze: Date | null; n_live_tup: bigint; n_dead_tup: bigint }[]>(`
      SELECT relname, last_analyze, last_autoanalyze, n_live_tup, n_dead_tup
      FROM pg_stat_user_tables WHERE relname IN ('Entreprise','Signalement') ORDER BY relname`);
    console.log("\n  Statistiques du planificateur :");
    for (const t of stats) {
      const d = (x: Date | null) => (x ? new Date(x).toISOString().slice(0, 16).replace("T", " ") : "JAMAIS");
      console.log(`    ${t.relname.padEnd(13)} analyse ${d(t.last_analyze)}   auto-analyse ${d(t.last_autoanalyze)}`);
      console.log(`    ${"".padEnd(13)} ${Number(t.n_live_tup).toLocaleString("fr-FR")} lignes vivantes, ${Number(t.n_dead_tup).toLocaleString("fr-FR")} mortes`);
    }

    const reglages = await prisma.$queryRawUnsafe<{ name: string; setting: string; unit: string | null }[]>(`
      SELECT name, setting, unit FROM pg_settings
      WHERE name IN ('statement_timeout','shared_buffers','work_mem','effective_cache_size','max_connections','random_page_cost')
      ORDER BY name`);
    console.log("\n  Réglages du serveur :");
    for (const r of reglages) console.log(`    ${r.name.padEnd(22)} ${r.setting}${r.unit ? " " + r.unit : ""}`);

    const slug = slugDemande || (await demander("\nSlug de la fiche [danone-552032534] : ")) || "danone-552032534";
    const e = await prisma.entreprise.findUnique({
      where: { slug },
      select: { id: true, siren: true, secteur: true, departement: true, communeSlug: true, denomination: true },
    });
    if (!e) { console.error(`\nAucune entreprise pour « ${slug} ».`); return; }
    console.log(`\n${e.denomination} — secteur « ${e.secteur} », département ${e.departement}, commune « ${e.communeSlug} »\n`);

    const hors = { siren: { not: e.siren } };
    const actives = { etatAdministratif: "ACTIVE" as const };

    // On appelle le vrai code, pas une reconstitution.
    //
    // La première version de ce diagnostic réécrivait à la main les requêtes
    // du rendu. Elles répondaient toutes en quelques millisecondes pendant que
    // la page tombait à douze secondes : la reconstitution était fausse
    // quelque part, et c'est précisément ce qu'on cherchait. En important les
    // fonctions du site après avoir posé `DATABASE_URL`, on mesure ce que la
    // page exécute, aux colonnes et aux jointures près.
    process.env.DATABASE_URL = url;
    const { chargerEntreprise, detailEntreprise } = await import("../src/lib/fiche");
    const { voisines } = await import("../src/lib/maillage");
    const { prisma: prismaSite } = await import("../src/lib/db");

    const mesures: { nom: string; ms: number; lignes: number }[] = [];
    const chrono = async (nom: string, fn: () => Promise<unknown>) => {
      process.stdout.write(`  ${nom.padEnd(38)}`);
      const t = Date.now();
      try {
        const r = await fn();
        const lignes = Array.isArray(r) ? r.length : typeof r === "number" ? r : r ? 1 : 0;
        const ms = Date.now() - t;
        mesures.push({ nom, ms, lignes });
        console.log(`${String(ms).padStart(7)} ms   ${lignes} ligne(s)`);
      } catch (err) {
        const ms = Date.now() - t;
        mesures.push({ nom, ms, lignes: -1 });
        console.log(`${String(ms).padStart(7)} ms   ÉCHEC — ${err instanceof Error ? err.message.split("\n").filter((x) => x.includes("message:") || x.includes("Timed out")).join(" ").slice(0, 80) || "voir ci-dessous" : err}`);
      }
    };

    await chrono("chargerEntreprise (métadonnées)", () => chargerEntreprise(slug));
    await chrono("compte des signalements", () => prismaSite.signalement.count({ where: { entrepriseId: e.id, moderation: "PUBLIE" } }));
    await chrono("chargerEntreprise (page)", () => chargerEntreprise(slug));
    await chrono("detailEntreprise", () => detailEntreprise(e.id));
    await chrono("signalements publiés", () => prismaSite.signalement.findMany({ where: { entrepriseId: e.id, moderation: "PUBLIE" }, orderBy: { creeLe: "desc" }, take: 10 }));
    await chrono("signalements résolus", () => prismaSite.signalement.count({ where: { entrepriseId: e.id, moderation: "PUBLIE", resolutionConfirmee: true } }));
    await chrono("boutique rattachée", () => prismaSite.boutique.findFirst({ where: { entrepriseId: e.id }, select: { slug: true, domaine: true } }));
    await chrono("voisines (fonction complète)", async () => {
      const v = await voisines({ siren: e.siren, secteur: e.secteur, departement: e.departement, commune: null, communeSlug: e.communeSlug });
      return [...v.memeVille, ...v.memeDepartement, ...v.memeSecteur];
    });

    const classees = [...mesures].sort((a, b) => b.ms - a.ms);
    const total = mesures.reduce((s, m) => s + m.ms, 0);
    const distante = !/localhost|127\.0\.0\.1/.test(url);
    console.log(
      `\n  Total : ${total} ms` +
        (distante ? ` — chaque ligne inclut l'aller-retour réseau depuis ce poste, d'où un plancher.` : ""),
    );
    console.log(`  La plus lente : « ${classees[0].nom} » à ${classees[0].ms} ms\n`);

    // Le chronomètre mesure l'aller-retour ; `EXPLAIN ANALYZE` mesure le
    // serveur seul. Depuis un poste distant, cinquante millisecondes de réseau
    // par requête suffisent à noyer la différence entre une requête à un
    // milliseconde et une à quarante — d'où le plan, demandé pour chacune des
    // quatre requêtes de voisinage, qui sont les seules à pouvoir déraper.
    console.log("  Temps d'exécution côté serveur, et plan retenu :\n");
    const aExpliquer: [string, string, unknown[]][] = [
      ["voisines — même ville",
       `SELECT id FROM "Entreprise" WHERE "etatAdministratif"='ACTIVE' AND secteur=$1 AND departement=$2 AND "communeSlug"=$3 AND siren<>$4 ORDER BY denomination ASC LIMIT 8`,
       [e.secteur, e.departement, e.communeSlug, e.siren]],
      ["voisines — même département",
       `SELECT id FROM "Entreprise" WHERE "etatAdministratif"='ACTIVE' AND secteur=$1 AND departement=$2 AND siren<>$3 ORDER BY denomination ASC LIMIT 8`,
       [e.secteur, e.departement, e.siren]],
      ["voisines — secteur, signalées",
       `SELECT e.id FROM "Entreprise" e WHERE e."etatAdministratif"='ACTIVE' AND e.secteur=$1 AND e.siren<>$2 AND EXISTS (SELECT 1 FROM "Signalement" s WHERE s."entrepriseId"=e.id AND s.moderation='PUBLIE') LIMIT 8`,
       [e.secteur, e.siren]],
      ["voisines — secteur, avec site",
       `SELECT id FROM "Entreprise" WHERE "etatAdministratif"='ACTIVE' AND secteur=$1 AND "siteWeb" IS NOT NULL AND siren<>$2 LIMIT 8`,
       [e.secteur, e.siren]],
    ];
    for (const [nom, sql, params] of aExpliquer) {
      try {
        const plan = await prisma.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`, ...params);
        const lignes = plan.map((x) => x["QUERY PLAN"]);
        const duree = lignes.find((l) => l.startsWith("Execution Time"))?.replace("Execution Time: ", "") ?? "?";
        console.log(`    ${nom.padEnd(32)} ${duree}`);
        for (const l of lignes.filter((l) => /Scan|Sort|Heap|Filter|rows removed/i.test(l)).slice(0, 4)) {
          console.log(`        ${l.trim().slice(0, 130)}`);
        }
      } catch (err) {
        console.log(`    ${nom.padEnd(32)} ÉCHEC — ${err instanceof Error ? err.message.split("\n")[0].slice(0, 90) : err}`);
      }
      console.log("");
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
