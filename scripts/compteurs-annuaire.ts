/**
 * Recalcul des décomptes de l'annuaire.
 *
 * La page d'accueil de l'annuaire comptait treize millions de lignes par
 * secteur pour afficher seize nombres, et la page de secteur recommençait par
 * département. Ces décomptes bougent une fois par mois, au rythme de la
 * publication du répertoire : les tenir à jour chaque nuit suffit largement.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Recalcul des décomptes de l'annuaire\n");

  const [parSecteur, parDepartement] = await Promise.all([
    prisma.entreprise.groupBy({
      by: ["secteur"],
      _count: { _all: true },
      where: { etatAdministratif: "ACTIVE" },
    }),
    prisma.entreprise.groupBy({
      by: ["secteur", "departement"],
      _count: { _all: true },
      where: { etatAdministratif: "ACTIVE", departement: { not: null } },
    }),
  ]);

  const lignes = [
    ...parSecteur.map((g) => ({
      secteur: g.secteur ?? "autre",
      departement: "",
      nombre: g._count._all,
    })),
    ...parDepartement.map((g) => ({
      secteur: g.secteur ?? "autre",
      departement: g.departement!,
      nombre: g._count._all,
    })),
  ];

  // Remplacement en bloc dans une transaction : une page ne doit jamais tomber
  // sur une table vidée à mi-parcours.
  await prisma.$transaction([
    prisma.compteurAnnuaire.deleteMany({}),
    prisma.compteurAnnuaire.createMany({ data: lignes }),
  ]);

  console.log(`  ${parSecteur.length} secteur(s)`);
  console.log(`  ${parDepartement.length} couple(s) secteur × département`);
  console.log(`\n  ${lignes.length} décompte(s) enregistré(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
