/**
 * Synchronisation quotidienne des sources publiques.
 * À planifier une fois par jour (cron) : `npm run sync`.
 *
 * Relit Sirene, le RNE, le BODACC, l'annuaire des médiateurs et, lorsqu'un site
 * officiel est renseigné, les coordonnées du service consommateurs. Recalcule
 * ensuite les indices et historise le résultat.
 */
import { PrismaClient } from "@prisma/client";
import { synchroniserEntreprise } from "../src/lib/sources";
import { recalculerIndices } from "../src/lib/stats";
import { executerTache } from "../src/lib/taches";

const prisma = new PrismaClient();
const PAUSE_MS = 400; // respecte les API publiques

async function main() {
  const limite = Number(process.argv.find((a) => a.startsWith("--limite="))?.split("=")[1] ?? 0);
  const cible = process.argv.find((a) => a.startsWith("--siren="))?.split("=")[1];

  const entreprises = cible
    ? await prisma.entreprise.findMany({ where: { siren: cible.replace(/\D/g, "") } })
    : await prisma.entreprise.findMany({
        orderBy: [{ syncSirene: "asc" }],
        take: limite > 0 ? limite : undefined,
      });

  console.log(`Synchronisation de ${entreprises.length} fiche(s)\n`);
  let ok = 0;
  let echecs = 0;

  for (const e of entreprises) {
    process.stdout.write(`• ${e.denomination} (${e.siren})… `);
    try {
      const resultat = await synchroniserEntreprise(e.siren);
      if (!resultat) {
        console.log("introuvable");
        echecs++;
        continue;
      }
      const calcul = await recalculerIndices(resultat.entrepriseId);
      const enEchec = resultat.sources.filter((s) => s.statut === "erreur").map((s) => s.source);
      console.log(
        `ok — indice ${calcul?.transparence.score ?? "—"}/100${enEchec.length ? ` (échecs : ${enEchec.join(", ")})` : ""}`,
      );
      ok++;
    } catch (err) {
      console.log(`échec : ${String(err).slice(0, 140)}`);
      echecs++;
    }
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }

  console.log(`\n${ok} fiche(s) synchronisée(s), ${echecs} échec(s).`);
  return { traites: ok, echecs, detail: `${entreprises.length} fiche(s) parcourue(s)` };
}

executerTache("sync", main)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
