/**
 * Tâches planifiées : exécution tracée et surveillance mutuelle.
 *
 * Le problème que ce module résout n'est pas de faire tourner les tâches — un
 * cron suffit — mais de rendre visible le jour où elles s'arrêtent. La promesse
 * centrale de la plateforme est « chaque donnée porte sa source et sa date de
 * vérification » : si la synchronisation meurt sans bruit, les dates se figent
 * et la promesse devient fausse alors que le site continue de l'afficher.
 *
 * D'où la surveillance croisée : chaque tâche qui s'exécute vérifie l'état des
 * autres et alerte pour elles. Tant qu'une seule survit, les autres ne peuvent
 * pas mourir en silence. La mort simultanée de toutes reste détectable de
 * l'extérieur par /api/sante.
 */
import { prisma } from "./db";
import { envoyer, gabarit, versTexte } from "./mailer";

export const TACHES = {
  sync: { libelle: "Synchronisation des sources publiques", toleranceHeures: 36 },
  scores: { libelle: "Recalcul des indices", toleranceHeures: 36 },
  compteurs: { libelle: "Recalcul des décomptes de l'annuaire", toleranceHeures: 36 },
  purge: { libelle: "Purge des données arrivées à terme", toleranceHeures: 36 },
  relances: { libelle: "Rappels d'échéance aux consommateurs", toleranceHeures: 36 },
  contestations: { libelle: "Traitement des contestations échues", toleranceHeures: 36 },
} as const;

export type NomTache = keyof typeof TACHES;

const HEURE = 60 * 60 * 1000;
/** Une alerte par tâche et par jour au maximum : un cron cassé ne doit pas inonder la boîte. */
const SILENCE_ENTRE_ALERTES = 24 * HEURE;

export type EtatTache = {
  nom: NomTache;
  libelle: string;
  derniereReussite: Date | null;
  heuresDepuis: number | null;
  enRetard: boolean;
  jamaisExecutee: boolean;
};

export type Bilan = { traites?: number; echecs?: number; detail?: string };

/** Enveloppe une tâche : trace le début, la fin, le résultat, puis surveille les autres. */
export async function executerTache(
  nom: NomTache,
  travail: () => Promise<Bilan | void>,
): Promise<void> {
  const execution = await prisma.executionTache.create({ data: { nom } });
  try {
    const bilan: Bilan = (await travail()) ?? {};
    await prisma.executionTache.update({
      where: { id: execution.id },
      data: {
        finLe: new Date(),
        statut: "SUCCES",
        traites: bilan.traites ?? 0,
        echecs: bilan.echecs ?? 0,
        detail: bilan.detail ?? null,
      },
    });
  } catch (erreur) {
    await prisma.executionTache.update({
      where: { id: execution.id },
      data: { finLe: new Date(), statut: "ECHEC", detail: String(erreur).slice(0, 500) },
    });
    throw erreur;
  } finally {
    // Se produit même si la tâche a échoué : c'est justement là qu'il faut
    // savoir si les autres tournent encore.
    await surveillerLesAutres(nom).catch(() => undefined);
  }
}

export async function etatDesTaches(): Promise<EtatTache[]> {
  const noms = Object.keys(TACHES) as NomTache[];
  const dernieres = await Promise.all(
    noms.map((nom) =>
      prisma.executionTache.findFirst({
        where: { nom, statut: "SUCCES" },
        orderBy: { finLe: "desc" },
        select: { finLe: true },
      }),
    ),
  );

  return noms.map((nom, i) => {
    const reussite = dernieres[i]?.finLe ?? null;
    const heures = reussite ? (Date.now() - reussite.getTime()) / HEURE : null;
    return {
      nom,
      libelle: TACHES[nom].libelle,
      derniereReussite: reussite,
      heuresDepuis: heures === null ? null : Math.floor(heures),
      enRetard: heures === null || heures > TACHES[nom].toleranceHeures,
      jamaisExecutee: reussite === null,
    };
  });
}

/** Alerte sur les tâches en retard, sauf celle qui vient de s'exécuter. */
async function surveillerLesAutres(declencheur: NomTache): Promise<void> {
  const destinataire = process.env.ALERTE_EMAIL ?? process.env.MAIL_REPLY_TO;
  if (!destinataire) return;

  const retards = (await etatDesTaches()).filter((t) => t.enRetard && t.nom !== declencheur);
  if (!retards.length) return;

  for (const tache of retards) {
    const alerteRecente = await prisma.executionTache.findFirst({
      where: { nom: `alerte:${tache.nom}`, debutLe: { gt: new Date(Date.now() - SILENCE_ENTRE_ALERTES) } },
    });
    if (alerteRecente) continue;

    const constat = tache.jamaisExecutee
      ? "Cette tâche n'a jamais abouti."
      : `Dernière exécution réussie il y a ${tache.heuresDepuis} heures (tolérance : ${TACHES[tache.nom].toleranceHeures} h).`;
    const corps = `<p><strong>${tache.libelle}</strong> ne tourne plus.</p><p>${constat}</p>
      <p>Tant qu'elle est arrêtée, les dates de dernière vérification affichées sur le site se figent
      sans que rien ne l'indique aux visiteurs.</p>
      <p>Signalé par la tâche « ${TACHES[declencheur].libelle} », qui s'est exécutée normalement.</p>`;
    const html = gabarit("Tâche planifiée arrêtée", corps);

    await envoyer({
      destinataire,
      sujet: `[Recours France] ${tache.libelle} ne tourne plus`,
      html,
      texte: versTexte(html),
    });
    await prisma.executionTache.create({
      data: { nom: `alerte:${tache.nom}`, finLe: new Date(), statut: "SUCCES", detail: constat },
    });
  }
}
