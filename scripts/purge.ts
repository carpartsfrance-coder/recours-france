/**
 * Purge des données arrivées au terme de leur durée de conservation.
 *
 * Les durées ci-dessous ne sont pas un choix technique : elles recopient ce que
 * la page /donnees-personnelles promet aux utilisateurs. Toute modification ici
 * doit être répercutée là-bas, et réciproquement — sinon la page devient une
 * fausse déclaration.
 *
 * À planifier une fois par jour : `npm run purge -- --appliquer`
 * Sans --appliquer, le script énumère sans rien supprimer.
 */
import { prisma } from "../src/lib/db";
import { supprimerPiece } from "../src/lib/upload";
import { executerTache } from "../src/lib/taches";

const MOIS = 30 * 24 * 60 * 60 * 1000;
const ANS = 365 * 24 * 60 * 60 * 1000;

/** « Justificatifs : 24 mois après le dépôt, puis suppression automatique. » */
const RETENTION_JUSTIFICATIFS = 24 * MOIS;
/** « Signalement et données structurées : 5 ans à compter du dépôt. » */
const RETENTION_SIGNALEMENTS = 5 * ANS;
/** « Lien de suivi : 90 jours, prolongé à chaque consultation. » */
const GRACE_JETONS = 90 * 24 * 60 * 60 * 1000;
/** « Journal de modération : 5 ans, pour permettre la traçabilité des décisions. » */
const RETENTION_JOURNAL = 5 * ANS;
/** Empreinte IP : conservée le temps utile à la prévention des dépôts massifs. */
const RETENTION_EMPREINTES = 12 * MOIS;

const appliquer = process.argv.includes("--appliquer");
const maintenant = Date.now();
const avant = (ms: number) => new Date(maintenant - ms);

let total = 0;
function rapporter(libelle: string, nombre: number) {
  total += nombre;
  const verbe = appliquer ? "supprimé(s)" : "à supprimer";
  console.log(`  ${String(nombre).padStart(6)} ${libelle} ${verbe}`);
}

async function main() {
  console.log(appliquer ? "\nPurge — application réelle\n" : "\nPurge — simulation (ajouter --appliquer)\n");

  // ── 1. Justificatifs arrivés à terme ─────────────────────────────────────
  // Le fichier sur disque doit partir avant la ligne en base : sans elle on
  // perdrait le chemin et l'octet resterait orphelin indéfiniment.
  const pieces = await prisma.justificatif.findMany({
    where: { deposeLe: { lt: avant(RETENTION_JUSTIFICATIFS) } },
    select: { id: true, cheminStockage: true },
  });
  if (appliquer) {
    for (const p of pieces) await supprimerPiece(p.cheminStockage);
    await prisma.justificatif.deleteMany({ where: { id: { in: pieces.map((p) => p.id) } } });
  }
  rapporter("justificatif(s) de plus de 24 mois", pieces.length);

  // ── 2. Signalements arrivés à terme ──────────────────────────────────────
  // La cascade Prisma efface les lignes liées, mais pas les fichiers : on les
  // retire explicitement avant de laisser la base faire son travail.
  const anciens = await prisma.signalement.findMany({
    where: { creeLe: { lt: avant(RETENTION_SIGNALEMENTS) } },
    select: { id: true, justificatifs: { select: { cheminStockage: true } } },
  });
  if (appliquer) {
    for (const s of anciens) {
      for (const j of s.justificatifs) await supprimerPiece(j.cheminStockage);
    }
    await prisma.signalement.deleteMany({ where: { id: { in: anciens.map((s) => s.id) } } });
  }
  rapporter("signalement(s) de plus de 5 ans", anciens.length);

  // ── 3. Empreintes techniques ─────────────────────────────────────────────
  // On ne supprime pas le signalement, seulement les traces d'appareil qui
  // n'ont plus d'utilité anti-fraude passé un an.
  const empreintes = await prisma.signalement.count({
    where: { creeLe: { lt: avant(RETENTION_EMPREINTES) }, OR: [{ ipHash: { not: null } }, { userAgent: { not: null } }] },
  });
  if (appliquer) {
    await prisma.signalement.updateMany({
      where: { creeLe: { lt: avant(RETENTION_EMPREINTES) } },
      data: { ipHash: null, userAgent: null },
    });
  }
  rapporter("empreinte(s) technique(s) de plus de 12 mois", empreintes);

  // ── 4. Jetons et sessions expirés ────────────────────────────────────────
  const jetons = await prisma.jetonAcces.findMany({
    where: { expireLe: { lt: avant(GRACE_JETONS) } },
    select: { id: true },
  });
  if (appliquer) await prisma.jetonAcces.deleteMany({ where: { id: { in: jetons.map((j) => j.id) } } });
  rapporter("jeton(s) de suivi expiré(s)", jetons.length);

  const sessions = await prisma.adminSession.count({ where: { expireLe: { lt: new Date(maintenant) } } });
  if (appliquer) await prisma.adminSession.deleteMany({ where: { expireLe: { lt: new Date(maintenant) } } });
  rapporter("session(s) d'administration expirée(s)", sessions);

  // ── 5. Journal d'audit ───────────────────────────────────────────────────
  const journal = await prisma.journalAction.count({ where: { creeLe: { lt: avant(RETENTION_JOURNAL) } } });
  if (appliquer) await prisma.journalAction.deleteMany({ where: { creeLe: { lt: avant(RETENTION_JOURNAL) } } });
  rapporter("entrée(s) de journal de plus de 5 ans", journal);

  console.log(
    total === 0
      ? "\nRien à purger.\n"
      : appliquer
        ? `\n${total} élément(s) supprimé(s).\n`
        : `\n${total} élément(s) concerné(s). Relancer avec --appliquer.\n`,
  );
  return { traites: total, detail: appliquer ? undefined : "simulation" };
}

// Une simulation n'est pas une exécution : elle ne doit pas faire croire que la
// purge a tourné, sinon la surveillance se tairait alors que rien n'est purgé.
const lancer = appliquer ? () => executerTache("purge", main) : main;

lancer()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
