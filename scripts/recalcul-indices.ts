/**
 * Recalcul quotidien des indices, sans appel aux sources externes.
 * `npm run scores`
 *
 * Applique les règles publiées : l'indice de transparence ne dépend que des
 * registres publics, le score d'expérience n'est publié qu'au-delà du seuil de
 * signalements vérifiés. L'historique est conservé cinq ans.
 */
import { PrismaClient } from "@prisma/client";
import { recalculerIndices } from "../src/lib/stats";
import { executerTache } from "../src/lib/taches";

const prisma = new PrismaClient();

async function main() {
  const entreprises = await prisma.entreprise.findMany({ select: { id: true, denomination: true } });
  console.log(`Recalcul des indices sur ${entreprises.length} fiche(s)\n`);

  let publies = 0;
  for (const e of entreprises) {
    const calcul = await recalculerIndices(e.id);
    if (!calcul) continue;
    if (calcul.experience.publie) publies++;
    console.log(
      `• ${e.denomination}: transparence ${calcul.transparence.score}/100 · expérience ${
        calcul.experience.publie ? `${calcul.experience.score}/100` : `non publiée (${calcul.stats.verifies} vérifiés)`
      }`,
    );
  }

  // Purge de l'historique au-delà de cinq ans (règle métier n° 8).
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - 5);
  const purges = await prisma.scoreSnapshot.deleteMany({ where: { calculeLe: { lt: limite } } });

  console.log(`\n${publies} score(s) d’expérience publié(s). ${purges.count} instantané(s) purgé(s).`);
  return { traites: publies, detail: `${purges.count} instantané(s) purgé(s)` };
}

executerTache("scores", main)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
