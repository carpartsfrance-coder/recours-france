/**
 * Importe la table SIREN → site officiel depuis Wikidata.
 * `npm run import:sites`
 *
 * À relancer tous les quelques mois : la table bouge lentement. Ce n'est pas
 * une tâche quotidienne, et elle n'est donc pas surveillée comme telle.
 */
import { prisma } from "../src/lib/db";
import { tableComplete as tableWikidata } from "../src/lib/sources/wikidata";
import { tableComplete as tableOsm } from "../src/lib/sources/osm";

async function main() {
  // Wikidata d'abord : ses fiches sont plus curées et couvrent les marques
  // notables. OpenStreetMap complète ensuite la longue traîne sans écraser.
  console.log("\nInterrogation de Wikidata…");
  const wikidata = await tableWikidata();
  console.log(`  ${wikidata.length} couplage(s)`);

  console.log("\nInterrogation d'OpenStreetMap…");
  let osm: { siren: string; site: string; libelle: string }[] = [];
  try {
    osm = await tableOsm();
    console.log(`  ${osm.length} couplage(s)`);
  } catch (e) {
    console.log(`  échec : ${String(e).slice(0, 120)} — on continue avec Wikidata seul`);
  }

  const sources: { origine: string; lignes: typeof wikidata }[] = [
    { origine: "wikidata", lignes: wikidata },
    { origine: "osm", lignes: osm },
  ];

  let ecrits = 0;
  const paquet = 500;
  for (const { origine, lignes } of sources) {
    for (let i = 0; i < lignes.length; i += paquet) {
      const tranche = lignes.slice(i, i + paquet);
      await prisma.$transaction(
        tranche.map((c) =>
          prisma.siteConnu.upsert({
            where: { siren: c.siren },
            create: { siren: c.siren, site: c.site, libelle: c.libelle || null, origine },
            // Une source déjà présente n'est pas remplacée : Wikidata passant en
            // premier, OSM ne peut que combler des trous.
            update: {},
          }),
        ),
      );
      ecrits += tranche.length;
      process.stdout.write(`\r  ${origine} : ${ecrits} ligne(s) traitée(s)`);
    }
  }
  const total = await prisma.siteConnu.count();
  console.log(`\n\n${total} couplage(s) en base.`);

  // Application immédiate aux fiches existantes. Aucune requête réseau : c'est
  // une jointure locale, instantanée quel que soit le volume du catalogue.
  const sansSite = await prisma.entreprise.findMany({
    where: { siteWeb: null },
    select: { id: true, siren: true, denomination: true },
  });
  const connus = await prisma.siteConnu.findMany({
    where: { siren: { in: sansSite.map((e) => e.siren) } },
  });
  const parSiren = new Map(connus.map((c) => [c.siren, c]));

  let appliques = 0;
  for (const e of sansSite) {
    const c = parSiren.get(e.siren);
    if (!c) continue;
    await prisma.entreprise.update({
      where: { id: e.id },
      data: {
        siteWeb: c.site,
        siteWebSource: c.origine,
        // Wikidata est modifiable par tous : la provenance est enregistrée telle
        // quelle, sans prétendre à une confirmation qui n'a pas eu lieu.
        siteWebPreuve:
          c.origine === "osm"
            ? "OpenStreetMap (ref:FR:SIRET + website) — non reconfirmé sur le site"
            : "Wikidata (P1616/P3215 + P856) — non reconfirmé sur le site",
        siteWebVerifieLe: new Date(),
        siteWebTenteLe: new Date(),
      },
    });
    appliques++;
    console.log(`  ${e.denomination.padEnd(42)} ${c.site}`);
  }
  console.log(`\n${appliques} fiche(s) complétée(s) sur ${sansSite.length} sans site.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
