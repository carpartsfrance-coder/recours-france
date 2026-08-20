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
 * Celle-ci ne dit qu'une chose : le processus tourne et la base répond. Rien
 * d'autre ne doit pouvoir la faire échouer.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ etat: "vivant" });
  } catch {
    return NextResponse.json({ etat: "base injoignable" }, { status: 503 });
  }
}
