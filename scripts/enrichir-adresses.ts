/**
 * Adresse du siège, depuis le fichier StockEtablissement de Sirene.
 *
 * Le fichier des unités légales — celui qui a fourni les treize millions de
 * fiches — ne porte aucune adresse : la géographie vit dans le fichier des
 * établissements. Sans elle, pas de page « Garages à Fos-sur-Mer », donc pas
 * de requête locale captée, donc un annuaire que personne ne trouve.
 *
 * Treize millions de mises à jour ligne à ligne prendraient la nuit. On passe
 * donc par une table de transit chargée en COPY, puis une seule jointure : la
 * base fait le travail en un ordre au lieu de treize millions.
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const ARCHIVE = path.join(process.cwd(), "storage", "sirene-etablissements.zip");
const TRANSIT = path.join(process.cwd(), "storage", "adresses-sieges.tsv");

/** Découpage CSV tolérant les guillemets : un libellé de voie contient des virgules. */
function colonnes(ligne: string): string[] {
  const out: string[] = [];
  let courant = "";
  let dansGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '"') {
      if (dansGuillemets && ligne[i + 1] === '"') { courant += '"'; i++; }
      else dansGuillemets = !dansGuillemets;
    } else if (c === "," && !dansGuillemets) {
      out.push(courant); courant = "";
    } else courant += c;
  }
  out.push(courant);
  return out;
}

function normaliser(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/**
 * Département depuis le code commune INSEE, et non depuis le code postal :
 * la Corse s'écrit 2A/2B là où le code postal dit 20, et l'outre-mer tient sur
 * trois chiffres quand la métropole en utilise deux.
 */
function departement(codeCommune: string): string | null {
  const c = codeCommune.trim().toUpperCase();
  if (!/^[0-9][0-9AB][0-9]{3}$/.test(c)) return null;
  if (c.startsWith("97") || c.startsWith("98")) return c.slice(0, 3);
  return c.slice(0, 2);
}

/** Échappement du format texte de COPY : tabulation, retour ligne, antislash. */
function champ(valeur: string | null): string {
  if (valeur === null || valeur === "") return "\\N";
  return valeur.replace(/\\/g, "\\\\").replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

async function main() {
  await fs.access(ARCHIVE).catch(() => {
    throw new Error(`Archive absente : ${ARCHIVE}`);
  });

  console.log("Extraction des sièges depuis le fichier des établissements\n");

  const flux = spawn("unzip", ["-p", ARCHIVE], { stdio: ["ignore", "pipe", "ignore"] });
  const lecteur = createInterface({ input: flux.stdout, crlfDelay: Infinity });
  const sortie = createWriteStream(TRANSIT, { encoding: "utf8" });

  let entete: string[] = [];
  let idx: Record<string, number> = {};
  let lues = 0, sieges = 0, sansCommune = 0;

  const ecrire = (l: string) =>
    sortie.write(l) ? Promise.resolve() : new Promise<void>((r) => sortie.once("drain", () => r()));

  for await (const ligne of lecteur) {
    if (!entete.length) {
      entete = colonnes(ligne);
      for (const nom of [
        "siren", "siret", "etablissementSiege",
        "numeroVoieEtablissement", "typeVoieEtablissement", "libelleVoieEtablissement",
        "codePostalEtablissement", "libelleCommuneEtablissement", "codeCommuneEtablissement",
        "enseigne1Etablissement",
      ]) {
        const i = entete.indexOf(nom);
        if (i < 0) throw new Error(`Colonne absente du fichier : ${nom}`);
        idx[nom] = i;
      }
      continue;
    }
    lues++;
    if (lues % 500_000 === 0) {
      process.stdout.write(`\r  ${lues.toLocaleString("fr-FR")} lignes lues · ${sieges.toLocaleString("fr-FR")} sièges retenus`);
    }

    // Filtre bon marché : on ne découpe que les lignes de siège.
    if (!ligne.includes("true")) continue;
    const c = colonnes(ligne);
    if ((c[idx.etablissementSiege] ?? "").trim().toLowerCase() !== "true") continue;

    const siren = (c[idx.siren] ?? "").trim();
    if (!/^\d{9}$/.test(siren)) continue;

    const commune = (c[idx.libelleCommuneEtablissement] ?? "").trim();
    if (!commune) { sansCommune++; continue; }

    const dept = departement(c[idx.codeCommuneEtablissement] ?? "");
    const voie = [
      (c[idx.numeroVoieEtablissement] ?? "").trim(),
      (c[idx.typeVoieEtablissement] ?? "").trim(),
      (c[idx.libelleVoieEtablissement] ?? "").trim(),
    ].filter(Boolean).join(" ");

    sieges++;
    await ecrire(
      [
        champ(siren),
        champ((c[idx.siret] ?? "").trim() || null),
        champ(voie || null),
        champ((c[idx.codePostalEtablissement] ?? "").trim() || null),
        champ(commune),
        champ(normaliser(commune) || null),
        champ(dept),
        champ((c[idx.enseigne1Etablissement] ?? "").trim() || null),
      ].join("\t") + "\n",
    );
  }

  await new Promise<void>((r) => sortie.end(r));
  console.log(`\r  ${lues.toLocaleString("fr-FR")} lignes lues · ${sieges.toLocaleString("fr-FR")} sièges retenus${" ".repeat(20)}`);
  if (sansCommune) console.log(`  ${sansCommune.toLocaleString("fr-FR")} siège(s) sans commune (souvent à l'étranger)`);
  console.log(`\n  fichier de transit : ${TRANSIT}`);
  console.log("  → charger avec : npm run adresses:charger");
}

main().catch((e) => { console.error(e); process.exit(1); });
