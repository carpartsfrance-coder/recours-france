/**
 * Annonce les adresses du plan de site aux moteurs qui lisent IndexNow.
 *
 * La source est le plan de site lui-même, lu en ligne : c'est déjà la liste de
 * ce qu'on veut faire explorer, et la relire garantit qu'on n'annonce jamais
 * autre chose que ce qu'on propose à Google. Reconstruire la liste ici en
 * ferait une seconde vérité, qui divergerait au premier changement de palier.
 *
 * Google ne lit pas IndexNow. Bing, Yandex, Seznam et Naver le lisent, et Bing
 * alimente les réponses de Copilot et de ChatGPT. C'est une autre porte, pas un
 * raccourci vers la première.
 *
 * L'adresse visée est `APP_URL`. En local elle vaut `http://localhost:3200`,
 * qu'aucun moteur ne peut relire : le script refuse de partir sur une adresse
 * locale plutôt que d'envoyer des adresses inatteignables.
 *
 *   npm run indexnow -- --essai          annonce seulement les pages fixes
 *   npm run indexnow -- --depuis=14      reprend à la tranche 14
 *   npm run indexnow                     annonce tout le plan de site
 */

import "dotenv/config";

import { ADRESSE } from "../src/lib/adresse";
import { CLE_INDEXNOW, PAR_ENVOI, annoncer, verifierCle } from "../src/lib/indexnow";

const args = process.argv.slice(2);
const essai = args.includes("--essai");
const depuis = Number(args.find((a) => a.startsWith("--depuis="))?.split("=")[1] ?? 0) || 0;

/** Extraction sans analyseur XML : le plan de site est produit par nos soins. */
function adressesDe(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function lire(url: string): Promise<string> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} répond ${r.status}`);
  return r.text();
}

async function main() {
  console.log(`IndexNow — ${ADRESSE}\n`);

  if (!CLE_INDEXNOW) {
    console.error("INDEXNOW_KEY absente de l'environnement. Rien n'est envoyé.");
    process.exit(1);
  }

  if (/localhost|127\.0\.0\.1/.test(ADRESSE)) {
    console.error(
      `APP_URL vaut ${ADRESSE}. Aucun moteur ne peut relire une adresse locale ;\n` +
        "lancer avec APP_URL=\"https://recours-france.fr\" npm run indexnow.",
    );
    process.exit(1);
  }

  process.stdout.write("Vérification de la clé… ");
  await verifierCle();
  console.log("le site publie bien la clé annoncée.\n");

  const index = await lire(`${ADRESSE}/sitemap-index.xml`);
  const tranches = adressesDe(index);
  console.log(`${tranches.length} tranche(s) dans l'index.`);

  const aTraiter = essai ? tranches.slice(0, 1) : tranches.slice(depuis);
  if (essai) console.log("Mode essai : seule la première tranche est annoncée.\n");
  else if (depuis > 0) console.log(`Reprise à la tranche ${depuis}.\n`);
  else console.log("");

  let total = 0;
  let refusees = 0;

  for (const [i, tranche] of aTraiter.entries()) {
    const rang = essai ? 0 : depuis + i;
    const adresses = adressesDe(await lire(tranche));
    if (adresses.length === 0) {
      console.log(`  tranche ${String(rang).padStart(3)} — vide`);
      continue;
    }

    const { envoyees, lots, refus } = await annoncer(adresses);
    total += envoyees;
    refusees += adresses.length - envoyees;

    const etat = refus.length === 0 ? "" : `  ⚠ ${refus.join(" ; ")}`;
    console.log(
      `  tranche ${String(rang).padStart(3)} — ${adresses.length} adresse(s), ` +
        `${lots} envoi(s) de ${PAR_ENVOI} max, ${envoyees} acceptée(s)${etat}`,
    );
  }

  console.log(`\n${total} adresse(s) annoncée(s)${refusees > 0 ? `, ${refusees} refusée(s)` : ""}.`);
  console.log(
    "\nLes moteurs relèvent à leur rythme ; l'acceptation n'est pas l'indexation.\n" +
      "Le suivi se fait dans Bing Webmaster Tools, pas dans la Search Console.",
  );
}

main().catch((e) => {
  console.error(`\n${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
