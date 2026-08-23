/**
 * Import d'une liste de domaines dans le référentiel des boutiques.
 *
 * Ces domaines servent le PRODUIT, pas le référencement. Quand un consommateur
 * déclare un litige avec une boutique en ligne, `boutiquePour()` retrouve la
 * fiche correspondante et y rattache le signalement ; sans référentiel, chaque
 * saisie crée un doublon et les signalements d'une même boutique se dispersent.
 *
 * Ils ne sont PAS publiés pour autant. Une page boutique sans signalement
 * compte dix mots qui lui appartiennent sur six cent soixante-dix-sept —
 * mesuré — et cent quarante mille pages de cette nature abîmeraient la moyenne
 * du domaine au lieu de la servir. La règle d'indexation (lib/indexation.ts)
 * ne les ouvre aux moteurs qu'une fois qu'elles portent une déclaration.
 *
 *   npm run import:domaines -- chemin/vers/fichier.csv [--appliquer]
 *
 * Colonnes attendues : url, domaine, derniere_activite, extension_fr.
 */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { PrismaClient } from "@prisma/client";
import { nomDepuisDomaine, normaliserDomaine } from "../src/lib/boutiques";

const prisma = new PrismaClient();
const LOT = 5_000;

/**
 * Un domaine inactif depuis des années n'intéresse personne.
 *
 * Le fichier remonte jusqu'à 2021. Une boutique sans activité depuis plus de
 * trois ans ne recevra pas de litige de consommation : l'importer encombrerait
 * le référentiel et ralentirait les rapprochements.
 */
const ANCIENNETE_MAX_ANNEES = 3;

function slugDepuisDomaine(domaine: string): string {
  return domaine.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const chemin = process.argv[2];
  const appliquer = process.argv.includes("--appliquer");
  if (!chemin) {
    console.error("Usage : npm run import:domaines -- fichier.csv [--appliquer]");
    process.exit(1);
  }

  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - ANCIENNETE_MAX_ANNEES);

  const dejaLa = new Set(
    (await prisma.boutique.findMany({ select: { domaine: true } })).map((b) => b.domaine),
  );
  console.log(`  ${dejaLa.size.toLocaleString("fr-FR")} boutique(s) déjà en base\n`);

  let lues = 0, retenus = 0, ignoresAge = 0, ignoresForme = 0, doublons = 0, ecrits = 0;
  const lot: { domaine: string; nom: string; slug: string }[] = [];
  const slugsVus = new Set<string>();

  async function vider() {
    if (!lot.length) return;
    if (appliquer) {
      const r = await prisma.boutique.createMany({ data: lot, skipDuplicates: true });
      ecrits += r.count;
    }
    lot.length = 0;
  }

  const flux = createInterface({ input: createReadStream(chemin, { encoding: "utf-8" }) });
  let entete = true;
  for await (const ligne of flux) {
    if (entete) { entete = false; continue; }
    if (!ligne.trim()) continue;
    lues++;

    const [, brut, derniere] = ligne.split(",");
    const domaine = normaliserDomaine(brut ?? "");
    if (!domaine) { ignoresForme++; continue; }
    if (derniere && new Date(derniere) < limite) { ignoresAge++; continue; }
    if (dejaLa.has(domaine)) { doublons++; continue; }

    // Le slug est unique en base : deux domaines qui se réduisent au même slug
    // — « ma-boutique.fr » et « ma.boutique.fr » — feraient échouer le lot
    // entier. On garde le premier et on compte l'autre comme doublon.
    const slug = slugDepuisDomaine(domaine);
    if (slugsVus.has(slug)) { doublons++; continue; }
    slugsVus.add(slug);
    dejaLa.add(domaine);

    lot.push({ domaine, nom: nomDepuisDomaine(domaine), slug });
    retenus++;
    if (lot.length >= LOT) await vider();
    if (lues % 25_000 === 0) console.log(`  ${lues.toLocaleString("fr-FR")} lues, ${retenus.toLocaleString("fr-FR")} retenues…`);
  }
  await vider();

  const n = (x: number) => x.toLocaleString("fr-FR");
  console.log(`\n  lues                        ${n(lues)}`);
  console.log(`  écartées — forme invalide   ${n(ignoresForme)}`);
  console.log(`  écartées — inactives > ${ANCIENNETE_MAX_ANNEES} ans ${n(ignoresAge)}`);
  console.log(`  écartées — déjà connues     ${n(doublons)}`);
  console.log(`  retenues                    ${n(retenus)}`);
  console.log(appliquer ? `  écrites en base             ${n(ecrits)}` : "\n  Simulation. Relancez avec --appliquer pour écrire.");

  if (appliquer) {
    const total = await prisma.boutique.count();
    console.log(`\n  ${n(total)} boutique(s) au référentiel.`);
    console.log("  Elles ne sont pas indexées tant qu'elles ne portent pas de signalement.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
