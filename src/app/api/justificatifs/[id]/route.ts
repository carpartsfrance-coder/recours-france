import { prisma } from "@/lib/db";
import { adminCourant, journaliser } from "@/lib/auth";
import { lirePiece } from "@/lib/upload";

export const dynamic = "force-dynamic";

/**
 * Lecture d'une pièce justificative. Accès strictement réservé à
 * l'administration : les pièces ne sont jamais publiées ni transmises à
 * l'entreprise. Chaque consultation est tracée.
 */
export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminCourant();
  if (!admin) return new Response("Accès refusé", { status: 403 });

  const { id } = await params;
  const piece = await prisma.justificatif.findUnique({
    where: { id },
    include: { signalement: { select: { reference: true } } },
  });
  if (!piece) return new Response("Pièce introuvable", { status: 404 });

  let contenu: Buffer;
  try {
    contenu = await lirePiece(piece.cheminStockage);
  } catch {
    return new Response("Fichier indisponible", { status: 410 });
  }

  await journaliser(admin.id, "justificatif.consulte", "justificatif", id, piece.signalement.reference);

  return new Response(new Uint8Array(contenu), {
    headers: {
      "Content-Type": piece.typeMime,
      "Content-Disposition": `inline; filename="${piece.signalement.reference}-${piece.nomOrigine.replace(/"/g, "")}"`,
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
