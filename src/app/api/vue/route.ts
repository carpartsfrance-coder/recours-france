import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Comptage des consultations de fiche.
 *
 * Le compteur était incrémenté pendant le rendu de la page. Une écriture en
 * base à chaque affichage force Next à rendre la fiche à chaque visite : la
 * mise en cache devenait impossible, et treize millions de pages exploitées
 * par un robot auraient produit autant de transactions. Le décompte est
 * d'ailleurs faux dès qu'une page est mise en cache, puisqu'il ne mesure plus
 * que les rendus.
 *
 * Le navigateur signale donc la consultation ici, et les incréments sont
 * regroupés : cent visiteurs sur cent fiches font une écriture, pas cent.
 */
export const dynamic = "force-dynamic";

const ATTENTE = new Map<string, number>();
let dernierVidage = Date.now();

const DELAI_VIDAGE = 30_000;
const SEUIL_VIDAGE = 200;

async function vider() {
  if (ATTENTE.size === 0) return;
  const lot = [...ATTENTE.entries()];
  ATTENTE.clear();
  dernierVidage = Date.now();
  await Promise.all(
    lot.map(([siren, n]) =>
      prisma.entreprise
        .update({ where: { siren }, data: { vues: { increment: n } } })
        // Une fiche disparue entre-temps ne doit pas faire échouer le lot.
        .catch(() => undefined),
    ),
  );
}

export async function POST(requete: Request) {
  let siren: unknown;
  try {
    ({ siren } = await requete.json());
  } catch {
    return NextResponse.json({ erreur: "corps illisible" }, { status: 400 });
  }
  if (typeof siren !== "string" || !/^\d{9}$/.test(siren)) {
    return NextResponse.json({ erreur: "siren attendu" }, { status: 400 });
  }

  ATTENTE.set(siren, (ATTENTE.get(siren) ?? 0) + 1);

  // Pas de minuterie : elle survivrait mal à un redémarrage et compliquerait
  // les tests. Le vidage se déclenche sur la requête suivante.
  if (ATTENTE.size >= SEUIL_VIDAGE || Date.now() - dernierVidage > DELAI_VIDAGE) {
    await vider();
  }

  return new NextResponse(null, { status: 204 });
}
