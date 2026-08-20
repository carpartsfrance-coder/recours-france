/**
 * Retrait des données de démonstration, avant mise en ligne.
 *
 * La base de développement contient des signalements inventés attribués à des
 * sociétés bien réelles : cinquante-neuf contre Cdiscount, vingt-six contre
 * EDF, quinze contre Danone. Ce sont des reproches fabriqués, nominatifs et
 * publiés — exactement ce qu'une entreprise attaquerait, et gagnerait, puisque
 * l'invention se prouve d'elle-même.
 *
 * Ce script les retire. Il ne touche pas aux entreprises : celles-là viennent
 * de registres publics et n'ont rien de fictif.
 *
 * Deux garde-fous. Il refuse de s'exécuter sans confirmation explicite, parce
 * qu'une suppression lancée par mégarde sur une base de production emporterait
 * de vrais signalements. Et il affiche ce qu'il va faire avant de le faire :
 * lancé sans « --appliquer », il ne fait que compter.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Les jeux d'essai emploient tous ce domaine, réservé à cet usage par la RFC 2606. */
const DOMAINE_DEMO = "@example.com";

/**
 * Adresses réelles ayant servi aux essais manuels.
 *
 * Elles ne portent pas le domaine de démonstration mais désignent les mêmes
 * signalements fabriqués. Sans cette liste, cinq déclarations d'essai
 * survivraient à la purge et paraîtraient en ligne.
 */
const ESSAIS = ["k@gmail.com", "ki@gmail.com", "killian@gmail.com", "killian.belabbes@gmail.com"];

async function main() {
  const appliquer = process.argv.includes("--appliquer");

  const where = {
    OR: [{ email: { endsWith: DOMAINE_DEMO } }, { email: { in: ESSAIS } }],
  };

  const [aRetirer, total, parEntreprise] = await Promise.all([
    prisma.signalement.count({ where }),
    prisma.signalement.count(),
    prisma.signalement.groupBy({
      by: ["entrepriseId"],
      _count: { _all: true },
      where,
    }),
  ]);

  const entreprises = await prisma.entreprise.findMany({
    where: { id: { in: parEntreprise.map((p) => p.entrepriseId!).filter(Boolean) } },
    select: { id: true, denomination: true },
  });
  const nom = new Map(entreprises.map((e) => [e.id, e.denomination]));

  console.log(`${aRetirer} signalement(s) de démonstration sur ${total} en base\n`);
  for (const p of parEntreprise.sort((a, b) => b._count._all - a._count._all).slice(0, 10)) {
    console.log(`  ${String(p._count._all).padStart(4)}  ${nom.get(p.entrepriseId ?? "") ?? "(sans entreprise)"}`);
  }

  const [avis, orphelins, justificatifs] = await Promise.all([
    prisma.avis.count({ where: { signalement: where } }),
    // Des avis subsistent sans signalement rattaché — le lien est en SetNull,
    // et deux d'entre eux visent Cdiscount. Détachés, ils resteraient publiés
    // sur la fiche sans que rien ne les relie à une déclaration.
    prisma.avis.count({ where: { signalementId: null } }),
    prisma.justificatif.count({ where: { signalement: where } }),
  ]);
  console.log(`\n  ${avis} avis rattachés, ${orphelins} avis sans signalement, ${justificatifs} justificatif(s)`);

  if (!appliquer) {
    console.log("\nRien n'a été supprimé. Relancez avec --appliquer pour exécuter.");
    return;
  }

  // Les avis pointent le signalement en SetNull : sans suppression explicite,
  // ils survivraient détachés, et resteraient publiés sur les fiches.
  const ids = (await prisma.signalement.findMany({ where, select: { id: true } })).map((s) => s.id);
  await prisma.avis.deleteMany({
    where: { OR: [{ signalementId: { in: ids } }, { signalementId: null }] },
  });
  const { count } = await prisma.signalement.deleteMany({ where });

  console.log(`\n${count} signalement(s) supprimé(s), avec les avis rattachés et les avis orphelins.`);
  console.log("Les fiches entreprises sont intactes : elles viennent des registres publics.");

  const reste = await prisma.signalement.count();
  console.log(`\nIl reste ${reste} signalement(s) en base.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
