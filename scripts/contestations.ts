/**
 * Application mécanique de la règle du silence.
 * À planifier une fois par jour : `npm run contestations -- --appliquer`
 *
 * Une contestation dont l'échéance est passée sans réponse du consommateur
 * entraîne le retrait du signalement. Sans exception, sans arbitrage, sans
 * examen. C'est précisément parce que ce cas ne demande aucune décision
 * humaine que la publication reste tenable sans équipe de modération.
 *
 * Ce script ne tranche JAMAIS un dossier où le consommateur a répondu : celui-là
 * part en file d'examen, et c'est le seul qui coûte du temps.
 */
import { prisma } from "../src/lib/db";
import { silenceAcquis } from "../src/lib/contestations";
import { envoyerIssueContestation, envoyerAccuseDemande } from "../src/lib/emails";
import { executerTache } from "../src/lib/taches";
import { recalculerIndices } from "../src/lib/stats";

const appliquer = process.argv.includes("--appliquer");

async function main() {
  const enCours = await prisma.contestation.findMany({
    where: { etat: "PIECE_DEMANDEE" },
    include: {
      signalement: {
        include: { entreprise: { select: { denomination: true } } },
      },
    },
  });

  const echues = enCours.filter((c) => silenceAcquis(c));

  console.log(
    appliquer
      ? `\nContestations — application réelle (${enCours.length} en cours)\n`
      : `\nContestations — simulation (${enCours.length} en cours, ajouter --appliquer)\n`,
  );

  let retires = 0;
  for (const c of echues) {
    const entreprise = c.signalement.entreprise?.denomination ?? c.signalement.entrepriseLibreNom ?? "l’entreprise";
    console.log(`  ${c.signalement.reference}  échéance ${c.echeanceReponse?.toISOString().slice(0, 10)}  → retrait`);
    if (!appliquer) {
      retires++;
      continue;
    }

    await prisma.contestation.update({
      where: { id: c.id },
      data: { etat: "RETIREE_SANS_REPONSE", trancheeLe: new Date(), decision: "Retrait automatique : aucune réponse du consommateur dans le délai." },
    });
    await prisma.signalement.update({
      where: { id: c.signalementId },
      data: { moderation: "RETIRE", motifModeration: "Contestation non suivie de réponse dans le délai." },
    });
    await prisma.evenementSignalement.create({
      data: {
        signalementId: c.signalementId,
        titre: "Signalement retiré de la publication",
        detail: "Aucune pièce n’a été produite dans le délai ouvert par la contestation. Le dossier personnel reste accessible.",
        auteur: "RECOURS_FRANCE",
        etiquette: "CONTESTATION",
      },
    });

    await envoyerIssueContestation({
      email: c.signalement.email,
      prenom: c.signalement.prenom,
      reference: c.signalement.reference,
      entreprise,
      maintenu: false,
      motif: "aucune pièce n’a été produite dans le délai",
    }).catch(() => undefined);

    await envoyerAccuseDemande(
      c.email,
      "Contestation aboutie",
      `Le consommateur n’a pas produit de pièce dans le délai imparti. Le signalement ${c.signalement.reference} a été retiré de la publication sur la fiche de ${entreprise}.`,
    ).catch(() => undefined);

    if (c.signalement.entrepriseId) {
      await recalculerIndices(c.signalement.entrepriseId).catch(() => undefined);
    }
    retires++;
  }

  const aExaminer = await prisma.contestation.count({ where: { etat: "PIECE_FOURNIE" } });
  if (aExaminer) {
    console.log(`\n  ${aExaminer} contestation(s) avec réponse du consommateur : examen requis dans l'administration.`);
  }

  console.log(
    retires === 0
      ? "\nAucun retrait à prononcer.\n"
      : appliquer
        ? `\n${retires} signalement(s) retiré(s).\n`
        : `\n${retires} signalement(s) seraient retirés. Relancer avec --appliquer.\n`,
  );
  return { traites: retires, detail: `${aExaminer} en attente d'examen` };
}

const lancer = appliquer ? () => executerTache("contestations", main) : main;

lancer()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
