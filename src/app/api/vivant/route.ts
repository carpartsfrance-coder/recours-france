import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Sonde de vie, pour l'hébergeur.
 *
 * À ne pas confondre avec /api/sante, qui surveille les chaînes planifiées et
 * répond 503 dès qu'une tâche prend du retard. C'est le bon comportement pour
 * une alerte — mais si l'hébergeur s'en sert comme sonde, il conclut que le
 * service est mort et le redémarre en boucle, alors qu'il répond parfaitement.
 *
 * Celle-ci ne décide que d'une chose : faut-il redémarrer le processus. La
 * réponse est non tant qu'il tourne et que la base répond, et un schéma
 * manquant ne se soigne pas par un redémarrage — d'où le 200 dans ce cas.
 *
 * Elle le *dit* néanmoins. Elle se contentait d'un `SELECT 1`, qui réussit sur
 * une base sans la moindre table : l'hébergeur annonçait « service live 🎉 »
 * pendant que chaque page lisant une table renvoyait 500. Un diagnostic d'une
 * ligne, ici, valait plusieurs allers-retours de déploiement.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json({ etat: "base injoignable" }, { status: 503 });
  }

  // Le nombre de tables du schéma public : zéro signifie que `prisma db push`
  // n'a jamais tourné sur cette base.
  const [{ tables }] = await prisma.$queryRaw<{ tables: bigint }[]>`
    SELECT count(*) AS tables FROM information_schema.tables WHERE table_schema = 'public'
  `;

  if (Number(tables) === 0) {
    return NextResponse.json({
      etat: "vivant",
      schema: "absent",
      remede: "npx prisma db push — la base répond mais ne contient aucune table",
    });
  }

  return NextResponse.json({ etat: "vivant", schema: "présent", tables: Number(tables) });
}
