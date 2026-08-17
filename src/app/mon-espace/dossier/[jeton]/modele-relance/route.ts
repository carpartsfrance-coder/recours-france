import { prisma } from "@/lib/db";
import { resoudreJetonSuivi } from "@/lib/auth";
import { modeleRelance, type Categorie } from "@/lib/demarches";
import { adressePostale, formatMontant } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Modèle de lettre de relance prérempli, au format texte.
 * Le consommateur l'envoie lui-même : Recours France n'écrit pas au professionnel.
 */
export async function GET(_requete: Request, { params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const acces = await resoudreJetonSuivi(jeton);
  if (!acces?.signalement) return new Response("Lien invalide ou expiré", { status: 404 });

  const signalement = await prisma.signalement.findUnique({
    where: { id: acces.signalement.id },
    include: { entreprise: true },
  });
  if (!signalement) return new Response("Signalement introuvable", { status: 404 });

  const entreprise = signalement.entreprise;
  const texte = modeleRelance({
    reference: signalement.reference,
    entreprise: entreprise?.denomination ?? signalement.entrepriseLibreNom ?? "L’entreprise concernée",
    adresseEntreprise: entreprise ? adressePostale(entreprise) : null,
    categorie: signalement.categorie as Categorie,
    montant: signalement.montant ? formatMontant(Number(signalement.montant)) : null,
    dateFaits: signalement.dateFaits,
    prenom: signalement.prenom,
    nom: signalement.nom,
  });

  return new Response(texte, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="relance-${signalement.reference}.txt"`,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
