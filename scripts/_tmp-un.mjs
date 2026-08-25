import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const socle = `e."etatAdministratif"='ACTIVE'
  AND (e."categorieJuridique" IS NULL OR e."categorieJuridique" NOT IN ('6540','6588'))
  AND (e."categorieJuridique" IS NULL OR e."categorieJuridique" NOT LIKE '7%')`;
for (const essai of [1,2]) {
  const t = Date.now();
  const r = await p.$queryRawUnsafe(`
    SELECT count(*)::int AS n FROM (
      SELECT e.id FROM "Entreprise" e WHERE ${socle} AND e."siteWeb" IS NOT NULL
      UNION
      SELECT e.id FROM "Entreprise" e WHERE ${socle} AND EXISTS (SELECT 1 FROM "Boutique" b WHERE b."entrepriseId"=e.id)
      UNION
      SELECT e.id FROM "Entreprise" e WHERE ${socle} AND EXISTS (SELECT 1 FROM "Signalement" s WHERE s."entrepriseId"=e.id)
      UNION
      SELECT e.id FROM "Entreprise" e WHERE ${socle} AND EXISTS (SELECT 1 FROM "DecisionJustice" d WHERE d."entrepriseId"=e.id)
    ) t`);
  console.log(`essai ${essai} : ${Date.now()-t} ms — ${r[0].n} fiches`);
}
const t2 = Date.now();
const c = await Promise.all([
  p.entreprise.count({ where: { etatAdministratif: "ACTIVE", siteWeb: { not: null } } }),
  p.entreprise.count({ where: { etatAdministratif: "ACTIVE", boutiques: { some: {} } } }),
]);
console.log(`deux count simples : ${Date.now()-t2} ms — ${c.join(" + ")}`);
await p.$disconnect();
