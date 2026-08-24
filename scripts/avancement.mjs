// Où en est la collecte des décisions ? Un pourcentage, trois lignes.
import fs from "node:fs";
const DEBUT = new Date("2023-01-01");
const FIN = new Date();
const NOMS = { tcom: "Tribunaux de commerce", tj: "Tribunaux judiciaires", ca: "Cours d'appel" };

let etat = {};
try { etat = JSON.parse(fs.readFileSync(new URL("../.collecte-etat.json", import.meta.url), "utf8")); }
catch { console.log("Pas encore commencé (ou première semaine en cours)."); process.exit(0); }

const jours = (a, b) => Math.max(0, Math.round((b - a) / 86400000));
const total = jours(DEBUT, FIN) * 3;
let fait = 0;
for (const [cle, nom] of Object.entries(NOMS)) {
  const ou = etat[cle] ? new Date(etat[cle]) : DEBUT;
  const part = Math.min(100, Math.round((100 * jours(DEBUT, ou)) / jours(DEBUT, FIN)));
  fait += jours(DEBUT, ou > FIN ? FIN : ou);
  const barre = "█".repeat(Math.round(part / 5)).padEnd(20, "·");
  console.log(`${nom.padEnd(24)} ${barre} ${String(part).padStart(3)} %`);
}
console.log(`\nGlobal : ${Math.min(100, Math.round((100 * fait) / total))} %`);
