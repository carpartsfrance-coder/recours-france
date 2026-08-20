/**
 * Rappels d'échéance au consommateur.
 * À planifier une fois par jour : `npm run relances -- --appliquer`
 *
 * Sans --appliquer, énumère ce qui partirait sans rien envoyer.
 *
 * Périmètre : ces messages vont au consommateur et à lui seul. Recours France
 * n'écrit rien au professionnel et ne transmet aucun signalement.
 */
import { prisma } from "../src/lib/db";
import { rappelDuJour } from "../src/lib/relances";
import { alerteVeille } from "../src/lib/veille";
import { creerJetonSuivi } from "../src/lib/auth";
import { envoyerRappel, envoyerAlerteVeille } from "../src/lib/emails";
import { mediateurPublie } from "../src/lib/mediation";
import { executerTache } from "../src/lib/taches";

const appliquer = process.argv.includes("--appliquer");

async function main() {
  // Bornage large : rappelDuJour() tranche ensuite dossier par dossier.
  // La veille juridique ignore volontairement `relancesActives` : couper les
  // rappels de cadence ne peut pas revenir à renoncer à être prévenu qu'une
  // créance va s'éteindre.
  const candidats = await prisma.signalement.findMany({
    where: { statut: "EN_COURS", moderation: "PUBLIE", closLe: null, resolutionConfirmee: false },
    include: {
      entreprise: {
        select: {
          denomination: true,
          mediateur: true,
          // Sans ce champ, mediateurPublie() conclurait toujours « non
          // publiable », et le rappel de médiation partirait sans médiateur.
          mediateurAdhesionDepuis: true,
          etatAdministratif: true,
          dateCessation: true,
          evenements: {
            where: { procedureCollective: true },
            select: { id: true, titre: true, date: true, procedureCollective: true },
            orderBy: { date: "desc" },
            take: 5,
          },
        },
      },
    },
  });

  console.log(
    appliquer
      ? `\nRappels — envoi réel (${candidats.length} dossier(s) ouverts)\n`
      : `\nRappels — simulation (${candidats.length} dossier(s) ouverts, ajouter --appliquer)\n`,
  );

  let envoyes = 0;
  let echecs = 0;
  let veilles = 0;

  for (const s of candidats) {
    // ── Veille juridique, prioritaire sur tout le reste ────────────────────
    const alerte = alerteVeille(s, s.entreprise);
    if (alerte) {
      console.log(`  ${s.reference}  ${alerte.type.padEnd(12)} ${s.entreprise?.denomination ?? ""}`);
      if (appliquer) {
        try {
          const jeton = await creerJetonSuivi(s.id, s.email);
          await envoyerAlerteVeille({
            email: s.email,
            prenom: s.prenom ?? "",
            reference: s.reference,
            jeton,
            titre: alerte.titre,
            objet: alerte.objet,
            constat: alerte.constat,
            action: alerte.action,
            echeance: alerte.echeance,
            rappelsCoupes: !s.relancesActives,
          });
          await prisma.signalement.update({
            where: { id: s.id },
            data: { relancesEnvoyees: { push: alerte.cle } },
          });
          await prisma.evenementSignalement.create({
            data: {
              signalementId: s.id,
              titre: "Alerte de veille juridique",
              detail: alerte.constat,
              auteur: "RECOURS_FRANCE",
              etiquette: "VEILLE",
            },
          });
          veilles++;
        } catch (e) {
          console.log(`     échec : ${String(e).slice(0, 120)}`);
          echecs++;
        }
      } else {
        veilles++;
      }
      // Une seule sollicitation par jour et par dossier : une alerte de veille
      // ne doit pas arriver le même jour qu'un rappel de cadence.
      continue;
    }

    if (!s.relancesActives) continue;
    const rappel = rappelDuJour(s);
    if (!rappel) continue;

    const entreprise = s.entreprise?.denomination ?? s.entrepriseLibreNom ?? "le professionnel";
    console.log(`  ${s.reference}  ${rappel.cle.padEnd(12)} ${entreprise}`);
    if (!appliquer) {
      envoyes++;
      continue;
    }

    try {
      // Jeton neuf : celui du dépôt peut avoir expiré entre-temps.
      const jeton = await creerJetonSuivi(s.id, s.email);
      await envoyerRappel({
        email: s.email,
        prenom: s.prenom ?? "",
        reference: s.reference,
        entreprise,
        jeton,
        titre: rappel.titre,
        objet: rappel.objet,
        action: rappel.action,
        mediateur: s.entreprise ? mediateurPublie(s.entreprise) : null,
        avecMediateur: rappel.cle === "mediation",
      });
      // Marqué APRÈS l'envoi : en cas d'échec le rappel sera retenté demain,
      // tant qu'on reste dans la fenêtre.
      await prisma.signalement.update({
        where: { id: s.id },
        data: { relancesEnvoyees: { push: rappel.cle } },
      });
      await prisma.evenementSignalement.create({
        data: {
          signalementId: s.id,
          titre: "Rappel envoyé",
          detail: rappel.titre,
          auteur: "RECOURS_FRANCE",
          etiquette: "RECOURS FRANCE",
        },
      });
      envoyes++;
    } catch (e) {
      console.log(`     échec : ${String(e).slice(0, 120)}`);
      echecs++;
    }
  }

  if (veilles) console.log(`\n  ${veilles} alerte(s) de veille juridique.`);

  console.log(
    envoyes === 0
      ? "\nAucun rappel à envoyer aujourd'hui.\n"
      : appliquer
        ? `\n${envoyes} rappel(s) envoyé(s), ${echecs} échec(s).\n`
        : `\n${envoyes} rappel(s) partiraient. Relancer avec --appliquer.\n`,
  );
  return { traites: envoyes + veilles, echecs, detail: `${veilles} alerte(s) de veille` };
}

// Une simulation n'est pas une exécution : elle ne doit pas faire croire à la
// surveillance que les rappels sont partis.
const lancer = appliquer ? () => executerTache("relances", main) : main;

lancer()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
