/**
 * Amorçage en masse des fiches entreprise depuis la base Sirene.
 * `npm run import:entreprises`
 *
 * Pourquoi un fichier plutôt que l'API : l'API Recherche d'entreprises met
 * 357 ms par appel — mesuré — soit près de dix heures pour cent mille sociétés,
 * et autant de sollicitations d'un service public. Le fichier StockUniteLegale
 * contient les quatre millions d'unités légales françaises et se lit en flux :
 * moins d'une heure, sans un seul appel réseau après le téléchargement.
 *
 * L'API garde son rôle : rafraîchir quelques fiches par jour. Elle n'est pas
 * faite pour en amorcer cent mille.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/db";
import { slugEntreprise } from "../src/lib/format";
import { NATURES_JURIDIQUES, familleJuridique } from "../src/lib/referentiels/natures-juridiques";
import { libelleNaf, secteurDepuisNaf } from "../src/lib/referentiels/naf";

const URL_STOCK =
  "https://static.data.gouv.fr/resources/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/20260801-072607/stock-stockunitelegale-csv.zip";
const ARCHIVE = path.join(process.cwd(), "storage", "sirene-unites-legales.zip");
/**
 * Lots d'écriture. Relevé à 5 000 pour l'import intégral : à 500, treize
 * millions de lignes demanderaient vingt-six mille allers-retours vers la base.
 */
const LOT = 5_000;

/**
 * Import intégral du répertoire, au-delà des seules entreprises dont on connaît
 * un site. Deux exclusions demeurent quoi qu'il arrive : les unités ayant
 * exercé leur droit d'opposition, et les personnes physiques dont l'identité
 * est un nom propre.
 */
const TOUT = process.env.IMPORT_TOUT !== "false";

/**
 * Reprise après interruption : numéro de ligne à partir duquel relire.
 *
 * Le flux est déterministe — même archive, même ordre — donc la ligne N
 * désigne toujours le même enregistrement. Sauter jusqu'à elle évite de
 * recharger en mémoire les millions de SIREN déjà écrits juste pour les
 * reconnaître ; l'index unique du SIREN suffit à écarter le chevauchement.
 */
const DEPUIS = Number(process.env.IMPORT_DEPUIS ?? 0) || 0;

async function telecharger(): Promise<void> {
  if (existsSync(ARCHIVE) && statSync(ARCHIVE).size > 500_000_000) {
    console.log(`  archive déjà présente (${Math.round(statSync(ARCHIVE).size / 1e6)} Mo)`);
    return;
  }
  console.log("  téléchargement de StockUniteLegale (971 Mo)…");
  await new Promise<void>((resolve, reject) => {
    const c = spawn("curl", ["-fL", "--retry", "2", "-o", ARCHIVE, URL_STOCK], { stdio: ["ignore", "ignore", "inherit"] });
    c.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`curl a échoué (${code})`))));
  });
}

/** Découpe une ligne CSV en respectant les guillemets. */
function colonnes(ligne: string): string[] {
  const sortie: string[] = [];
  let courant = "";
  let entreGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '"') {
      if (entreGuillemets && ligne[i + 1] === '"') { courant += '"'; i++; }
      else entreGuillemets = !entreGuillemets;
    } else if (c === "," && !entreGuillemets) { sortie.push(courant); courant = ""; }
    else courant += c;
  }
  sortie.push(courant);
  return sortie;
}

async function main() {
  console.log("\nAmorçage des fiches entreprise depuis Sirene\n");

  // On ne retient que les SIREN pour lesquels on connaît un site : ce sont les
  // seuls qui produiront une fiche boutique exploitable.
  const couplages = await prisma.siteConnu.findMany({ select: { siren: true, site: true, origine: true } });
  const attendus = new Map(couplages.map((c) => [c.siren, c]));
  console.log(
    TOUT
      ? `  import intégral · ${attendus.size.toLocaleString("fr-FR")} SIREN recevront en plus un site connu`
      : `  ${attendus.size} SIREN recherchés (issus de la table des sites connus)`,
  );

  // En reprise, l'ensemble des SIREN déjà écrits n'est pas chargé : à douze
  // millions d'entrées il pèserait plus que la mémoire disponible, alors que
  // `skipDuplicates` obtient le même résultat côté base.
  const dejaLa = DEPUIS
    ? new Set<string>()
    : new Set((await prisma.entreprise.findMany({ select: { siren: true } })).map((e) => e.siren));
  console.log(
    DEPUIS
      ? `  reprise à la ligne ${DEPUIS.toLocaleString("fr-FR")} · doublons écartés par la base\n`
      : `  ${dejaLa.size} fiche(s) déjà en base\n`,
  );

  await telecharger();
  console.log("  lecture du fichier en flux…\n");

  const flux = spawn("unzip", ["-p", ARCHIVE], { stdio: ["ignore", "pipe", "ignore"] });
  const lecteur = createInterface({ input: flux.stdout, crlfDelay: Infinity });

  let entete: string[] = [];
  let lues = 0, retenues = 0, nonDiffusibles = 0, personnesPhysiques = 0;
  let tampon: Prisma.EntrepriseCreateManyInput[] = [];

  const vider = async () => {
    if (tampon.length === 0) return;
    await prisma.entreprise.createMany({ data: tampon, skipDuplicates: true });
    retenues += tampon.length;
    tampon = [];
    process.stdout.write(`\r  ${lues.toLocaleString("fr-FR")} lignes lues · ${retenues.toLocaleString("fr-FR")} fiches créées`);
  };

  for await (const ligne of lecteur) {
    if (!entete.length) { entete = colonnes(ligne); continue; }
    lues++;
    if (lues < DEPUIS) continue;
    if (lues % 200_000 === 0) {
      process.stdout.write(`\r  ${lues.toLocaleString("fr-FR")} lignes lues · ${retenues.toLocaleString("fr-FR")} fiches créées`);
    }

    // Filtre bon marché avant tout découpage coûteux.
    const siren = ligne.slice(0, 9);
    if (!/^\d{9}$/.test(siren) || dejaLa.has(siren)) continue;
    if (!TOUT && !attendus.has(siren)) continue;

    const c = colonnes(ligne);
    const v = (nom: string) => c[entete.indexOf(nom)] ?? "";

    // Droit d'opposition à la diffusion : la fiche ne doit pas exister.
    if ((v("statutDiffusionUniteLegale") || "O").toUpperCase() !== "O") { nonDiffusibles++; continue; }

    // Entrepreneur individuel : la dénomination est vide et l'identité est
    // celle d'une personne physique. On ne publie jamais ces noms.
    const denomination = v("denominationUniteLegale").trim();
    if (!denomination) { personnesPhysiques++; continue; }

    const naf = v("activitePrincipaleUniteLegale").trim() || null;
    const categorie = v("categorieJuridiqueUniteLegale").trim() || null;
    const creation = v("dateCreationUniteLegale").trim();

    tampon.push({
      siren,
      denomination: denomination.toUpperCase(),
      sigle: v("sigleUniteLegale").trim() || null,
      slug: slugEntreprise(denomination, siren),
      categorieJuridique: categorie,
      formeJuridique: (categorie ? NATURES_JURIDIQUES[categorie] : null) ?? familleJuridique(categorie),
      naf,
      nafLibelle: naf ? libelleNaf(naf) : null,
      secteur: naf ? secteurDepuisNaf(naf) : null,
      dateImmatriculation: creation ? new Date(creation) : null,
      trancheEffectif: v("trancheEffectifsUniteLegale").trim() || null,
      etatAdministratif: v("etatAdministratifUniteLegale").trim() === "C" ? "CESSEE" : "ACTIVE",
      ...(attendus.has(siren)
        ? {
            siteWeb: attendus.get(siren)!.site,
            siteWebSource: attendus.get(siren)!.origine,
            siteWebPreuve: `${attendus.get(siren)!.origine === "osm" ? "OpenStreetMap" : "Wikidata"} — non reconfirmé sur le site`,
            siteWebVerifieLe: new Date(),
          }
        : {}),
    });

    if (tampon.length >= LOT) await vider();
  }
  await vider();

  console.log(
    `\n\n  ${lues.toLocaleString("fr-FR")} lignes parcourues` +
      `\n  ${retenues.toLocaleString("fr-FR")} fiche(s) entreprise créée(s)` +
      `\n  ${nonDiffusibles} écartée(s) pour opposition à la diffusion` +
      `\n  ${personnesPhysiques} écartée(s) : personne physique, nom jamais publié\n`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
