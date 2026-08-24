/**
 * Collecte des décisions de justice et rattachement aux fiches.
 *
 * Deux modes.
 *
 * Une entreprise : `--siren=432892412` — recherche par sa dénomination,
 * lecture des décisions trouvées, rattachement.
 *
 * Tout le corpus : `--tout --depuis=2023-01-01` — moisson par `/export`,
 * semaine par semaine, juridiction par juridiction. `/search` plafonne à dix
 * mille résultats par requête, quel que soit le nombre réel de décisions ;
 * l'export par tranches de dates n'a pas ce plafond, et rend les décisions
 * complètes — texte et zones — ce qui épargne un appel par décision.
 *
 * La progression s'écrit dans `.collecte-etat.json` après chaque semaine
 * terminée : interrompre puis relancer reprend où l'on s'était arrêté, sur la
 * même machine. Les écritures sont des upserts — rejouer une tranche ne
 * duplique rien.
 *
 * Sans clé PISTE, le script s'arrête sans rien faire.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  chercher, decision, exporter, judilibreConfigure, normaliserDenomination,
  partiesMorales, rapprocher, type Candidat, type DecisionJudilibre,
} from "../src/lib/sources/judilibre";

const prisma = new PrismaClient();
const PAUSE_MS = 250;
const ETAT = path.join(__dirname, "..", ".collecte-etat.json");

/** Mots de procédure qu'aucun rapprochement ne doit prendre pour un nom. */
const PROCEDURE = new Set([
  "DEMANDE", "DEFENSE", "PARTIE", "PARTIES", "DEMANDEUR", "DEMANDEURS",
  "DEFENDEUR", "DEFENDEURS", "DEMANDERESSE", "DEFENDERESSE", "APPELANT",
  "APPELANTE", "INTIME", "INTIMEE", "REQUERANT", "REQUERANTE",
]);

function argument(nom: string, defaut: string): string {
  return process.argv.find((a) => a.startsWith(`--${nom}=`))?.split("=")[1] ?? defaut;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

const compteurs = { vues: 0, avecParties: 0, rattachees: 0, parSiren: 0, ambigues: 0, inconnues: 0 };

/** Rattache les parties d'une décision aux fiches, selon la règle stricte. */
async function traiter(d: DecisionJudilibre, appliquer: boolean, verbeux: boolean) {
  compteurs.vues++;
  const parties = partiesMorales(d);
  if (parties.length === 0) return;
  compteurs.avecParties++;

  for (const p of parties) {
    if (PROCEDURE.has(normaliserDenomination(p.denomination))) continue;

    // Le numéro d'immatriculation tranche seul quand la décision le donne.
    let candidats: Candidat[] = [];
    if (p.siren) {
      candidats = await prisma.entreprise.findMany({
        where: { siren: p.siren },
        select: { id: true, siren: true, denomination: true, formeJuridique: true },
      });
      if (candidats.length) compteurs.parSiren++;
    }

    if (candidats.length === 0) {
      const cle = normaliserDenomination(p.denomination);
      if (cle.length < 4) continue;
      // Égalité exacte sur l'index de la colonne : cinq millisecondes quel
      // que soit le mot. Toute forme approchante — fonction sur la colonne,
      // ILIKE — a fini par dépasser le délai de la production.
      const variantes = [...new Set([p.denomination, p.denomination.toUpperCase(), cle])];
      const trouves = await prisma.entreprise.findMany({
        where: { denomination: { in: variantes } },
        select: { id: true, siren: true, denomination: true, formeJuridique: true },
        take: 25,
      });
      candidats = trouves.filter((c) => normaliserDenomination(c.denomination) === cle);
    }

    if (candidats.length === 0) { compteurs.inconnues++; continue; }
    const retenu = rapprocher(p, candidats);
    if (!retenu) { compteurs.ambigues++; continue; }

    compteurs.rattachees++;
    if (verbeux) {
      console.log(`  ${d.juridiction} ${d.date?.toISOString().slice(0, 10)} n°${d.numero} → ${retenu.denomination} (${retenu.siren}, ${p.role})`);
    }

    if (appliquer && d.date) {
      await prisma.decisionJustice.upsert({
        where: { entrepriseId_judilibreId: { entrepriseId: retenu.id, judilibreId: d.id } },
        create: {
          entrepriseId: retenu.id, judilibreId: d.id,
          juridiction: d.juridiction ?? "?", chambre: d.chambre,
          numero: d.numero, ecli: d.ecli, date: d.date,
          solution: d.solutionLibelle ?? d.solution,
          role: p.role, denominationCitee: p.denomination,
        },
        update: { solution: d.solutionLibelle ?? d.solution, role: p.role },
      });
    }
  }
}

function bilan() {
  console.log(`\ndécisions lues        : ${compteurs.vues}`);
  console.log(`avec personne morale  : ${compteurs.avecParties}`);
  console.log(`rattachées            : ${compteurs.rattachees}`);
  console.log(`   dont par SIREN     : ${compteurs.parSiren}`);
  console.log(`écartées, homonymie   : ${compteurs.ambigues}`);
  console.log(`hors référentiel      : ${compteurs.inconnues}`);
}

/* ── Mode « tout le corpus » ─────────────────────────────────────────────── */

type Etat = Record<string, string>;

function lireEtat(): Etat {
  try { return JSON.parse(fs.readFileSync(ETAT, "utf8")); } catch { return {}; }
}
function ecrireEtat(e: Etat) {
  fs.writeFileSync(ETAT, JSON.stringify(e, null, 2));
}

const jour = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Réessaie un appel qui a échoué de façon passagère.
 *
 * La passerelle de l'État rend parfois un 400 isolé sur une requête qui,
 * rejouée telle quelle, répond 200 — constaté au lot trois d'une tranche dont
 * les lots deux et quatre passaient. Une collecte de nuit ne doit pas mourir
 * là-dessus : six tentatives espacées couvrent une indisponibilité de quatre
 * minutes. Le 416 n'est jamais réessayé, c'est la fin normale de pagination.
 */
async function avecReprises<T>(appel: () => Promise<T>): Promise<T> {
  const attentes = [2_000, 5_000, 15_000, 30_000, 60_000, 120_000];
  for (let essai = 0; ; essai++) {
    try {
      return await appel();
    } catch (e) {
      const statut = (e as { statut?: number }).statut;
      if (statut === 416 || essai >= attentes.length) throw e;
      console.log(`  [réessai ${essai + 1}/${attentes.length} dans ${attentes[essai] / 1000} s — ${statut ?? e}]`);
      await dormir(attentes[essai]);
    }
  }
}

async function moissonner(depuis: string, appliquer: boolean) {
  const etat = lireEtat();
  const aujourdhui = new Date();

  for (const juridiction of ["tcom", "tj", "ca"]) {
    let curseur = new Date(etat[juridiction] ?? depuis);
    if (etat[juridiction]) console.log(`\n═══ ${juridiction} — reprise au ${jour(curseur)} ═══`);
    else console.log(`\n═══ ${juridiction} — depuis le ${jour(curseur)} ═══`);

    while (curseur <= aujourdhui) {
      const fin = new Date(curseur);
      fin.setDate(fin.getDate() + 6);
      const borne = fin > aujourdhui ? aujourdhui : fin;

      let lot = 0;
      let totalTranche = 0;
      for (;;) {
        let recolte;
        try {
          recolte = await avecReprises(() => exporter({
            juridiction, depuis: jour(curseur), jusqua: jour(borne), taille: 50, lot,
          }));
        } catch (e) {
          // Le plafond de pagination répond 416 : la tranche est épuisée.
          if ((e as { statut?: number }).statut === 416) break;
          throw e;
        }
        if (lot === 0) totalTranche = recolte.total;
        if (recolte.decisions.length === 0) break;
        for (const d of recolte.decisions) await traiter(d, appliquer, false);
        lot++;
        await dormir(PAUSE_MS);
      }

      console.log(`  ${jour(curseur)} → ${jour(borne)} : ${totalTranche} décision(s) · cumul ${compteurs.rattachees} rattachée(s)`);

      // L'état ne s'écrit qu'une semaine terminée : une interruption au
      // milieu la fera simplement rejouer, et les upserts absorbent le rejeu.
      curseur = new Date(borne);
      curseur.setDate(curseur.getDate() + 1);
      etat[juridiction] = jour(curseur);
      ecrireEtat(etat);
    }
  }
}

/* ── Mode « une entreprise » ─────────────────────────────────────────────── */

async function uneEntreprise(sirenCible: string, depuis: string, lots: number, taille: number, appliquer: boolean) {
  const cible = await prisma.entreprise.findFirst({
    where: { siren: sirenCible },
    select: { denomination: true },
  });
  if (!cible) {
    console.error(`Aucune entreprise au SIREN ${sirenCible}.`);
    process.exit(1);
  }
  console.log(`SIREN ${sirenCible} → recherche « ${cible.denomination} »`);

  for (const juridiction of ["tj", "tcom", "ca"]) {
    for (let page = 0; page < lots; page++) {
      const hits = await chercher(cible.denomination, { taille, page, juridictions: [juridiction], depuis });
      if (hits.length === 0) break;
      for (const h of hits) {
        await dormir(PAUSE_MS);
        const d = await decision(h.id).catch(() => null);
        if (d) await traiter(d, appliquer, true);
      }
    }
  }
}

/* ── Entrée ──────────────────────────────────────────────────────────────── */

async function main() {
  if (!judilibreConfigure()) {
    console.error("JUDILIBRE_API_KEY absente : rien à faire.");
    process.exit(1);
  }

  await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS unaccent").catch(() => undefined);

  const appliquer = process.argv.includes("--appliquer");
  const depuis = argument("depuis", "2023-01-01");
  console.log(appliquer ? "Écriture en base activée." : "Simulation : rien ne sera écrit (--appliquer pour exécuter).");

  if (process.argv.includes("--tout")) {
    await moissonner(depuis, appliquer);
  } else {
    const siren = argument("siren", "").replace(/\D/g, "");
    if (!siren) {
      console.error("Indiquez --siren=XXXXXXXXX pour une entreprise, ou --tout pour le corpus.");
      process.exit(1);
    }
    await uneEntreprise(siren, depuis, Number(argument("lots", "3")), Number(argument("taille", "20")), appliquer);
  }
  bilan();
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
