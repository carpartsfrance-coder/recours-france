/**
 * Crée une fiche boutique pour chaque entreprise dont on connaît le site.
 * `npm run import:boutiques`
 *
 * La boutique est le sujet que le consommateur reconnaît : il a acheté sur un
 * site, pas chez une personne morale dont il ignore le nom. La fiche existe
 * donc par son domaine, et l'entreprise y est rattachée comme un enrichissement.
 */
import { prisma } from "../src/lib/db";
import { normaliserDomaine, nomDepuisDomaine } from "../src/lib/boutiques";

const LOT = 1000;

async function main() {
  console.log("\nCréation des fiches boutique\n");

  const dejaLa = new Set(
    (await prisma.boutique.findMany({ select: { domaine: true } })).map((b) => b.domaine),
  );
  console.log(`  ${dejaLa.size} boutique(s) déjà en base`);

  let curseur: string | undefined;
  let vues = 0, creees = 0, sansDomaine = 0, doublons = 0;
  const prises = new Set(dejaLa);

  for (;;) {
    const lot = await prisma.entreprise.findMany({
      where: { siteWeb: { not: null } },
      select: { id: true, siteWeb: true, siteWebSource: true, denomination: true },
      orderBy: { id: "asc" },
      take: LOT,
      ...(curseur ? { cursor: { id: curseur }, skip: 1 } : {}),
    });
    if (lot.length === 0) break;
    curseur = lot[lot.length - 1].id;
    vues += lot.length;

    const aCreer: { domaine: string; nom: string; slug: string; entrepriseId: string; rattachementSource: string | null; rattachementLe: Date }[] = [];
    for (const e of lot) {
      const domaine = normaliserDomaine(e.siteWeb!);
      if (!domaine) { sansDomaine++; continue; }
      // Deux sociétés peuvent porter le même domaine dans les bases
      // contributives : la première rencontrée garde la fiche, on ne tranche pas.
      if (prises.has(domaine)) { doublons++; continue; }
      prises.add(domaine);
      aCreer.push({
        domaine,
        nom: nomDepuisDomaine(domaine),
        slug: domaine.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        entrepriseId: e.id,
        rattachementSource: e.siteWebSource,
        rattachementLe: new Date(),
      });
    }

    if (aCreer.length) {
      await prisma.boutique.createMany({ data: aCreer, skipDuplicates: true });
      creees += aCreer.length;
    }
    process.stdout.write(`\r  ${vues.toLocaleString("fr-FR")} entreprise(s) parcourue(s) · ${creees.toLocaleString("fr-FR")} boutique(s) créée(s)`);
  }

  console.log(
    `\n\n  ${creees.toLocaleString("fr-FR")} fiche(s) boutique créée(s)` +
      `\n  ${doublons} domaine(s) déjà pris par une autre société` +
      `\n  ${sansDomaine} adresse(s) inexploitable(s)\n`,
  );
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
