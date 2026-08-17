import { prisma } from "./db";
import { sirenDepuisSlug } from "./format";
import { synchroniserEntreprise } from "./sources";

const FRAICHEUR_MS = 7 * 86_400_000;

/**
 * Charge une fiche par son slug. Si l'entreprise n'existe pas encore en base,
 * elle est constituée à la volée depuis les registres publics.
 */
export async function chargerEntreprise(slug: string) {
  let entreprise = await prisma.entreprise.findUnique({ where: { slug } });

  if (!entreprise) {
    const siren = sirenDepuisSlug(slug);
    if (!siren) return null;
    entreprise = await prisma.entreprise.findUnique({ where: { siren } });
    if (!entreprise) {
      const resultat = await synchroniserEntreprise(siren);
      if (!resultat) return null;
      entreprise = await prisma.entreprise.findUnique({ where: { id: resultat.entrepriseId } });
    }
  }

  if (!entreprise) return null;

  // Rafraîchissement opportuniste : au-delà de sept jours, la fiche est resynchronisée.
  const perimee = !entreprise.syncSirene || Date.now() - entreprise.syncSirene.getTime() > FRAICHEUR_MS;
  if (perimee) {
    try {
      await synchroniserEntreprise(entreprise.siren);
      entreprise = await prisma.entreprise.findUnique({ where: { id: entreprise.id } });
    } catch {
      // Une source indisponible ne doit jamais empêcher l'affichage de la fiche.
    }
  }

  return entreprise;
}

export async function detailEntreprise(entrepriseId: string) {
  const [entreprise, etablissements, evenements, comptes, donnees] = await Promise.all([
    prisma.entreprise.findUnique({ where: { id: entrepriseId }, include: { mediateur: true } }),
    prisma.etablissement.findMany({
      where: { entrepriseId },
      orderBy: [{ estSiege: "desc" }, { commune: "asc" }],
    }),
    prisma.evenement.findMany({ where: { entrepriseId }, orderBy: { date: "desc" }, take: 40 }),
    prisma.compteAnnuel.findMany({ where: { entrepriseId }, orderBy: { exercice: "desc" } }),
    prisma.donneeSource.findMany({ where: { entrepriseId } }),
  ]);

  const sources = new Map(donnees.map((d) => [d.champ, d]));
  return { entreprise, etablissements, evenements, comptes, sources };
}
