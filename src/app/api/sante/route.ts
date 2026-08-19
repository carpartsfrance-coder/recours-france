import { NextResponse } from "next/server";
import { etatDesTaches } from "@/lib/taches";

export const dynamic = "force-dynamic";

/**
 * État des tâches planifiées, pour surveillance externe.
 *
 * La surveillance croisée intégrée aux tâches couvre la mort de l'une d'elles ;
 * elle ne peut rien contre l'arrêt de l'ordonnanceur tout entier — plus rien ne
 * tournerait pour donner l'alerte. Cet endpoint comble ce dernier angle mort :
 * n'importe quel service de supervision gratuit peut l'interroger et se déclenche
 * sur le 503.
 *
 * Ne renvoie que des données d'exploitation : aucun compte, aucun contenu.
 */
export async function GET() {
  const taches = await etatDesTaches();
  const enRetard = taches.filter((t) => t.enRetard);

  return NextResponse.json(
    {
      etat: enRetard.length ? "degrade" : "ok",
      taches: taches.map((t) => ({
        nom: t.nom,
        libelle: t.libelle,
        derniereReussite: t.derniereReussite,
        heuresDepuis: t.heuresDepuis,
        enRetard: t.enRetard,
      })),
    },
    {
      status: enRetard.length ? 503 : 200,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    },
  );
}
