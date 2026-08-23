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

  // Aucun appel réseau pendant le rendu.
  //
  // Cette fonction resynchronisait la fiche au-delà de sept jours, en
  // interrogeant recherche-entreprises.api.gouv.fr puis le BODACC. Après
  // l'import de masse, aucune ligne ne portait de date de synchronisation :
  // douze millions neuf cent quatre-vingt-dix-sept mille quatre cent
  // vingt-cinq fiches sur douze millions neuf cent quatre-vingt-dix-sept mille
  // neuf cent quatre-vingt-treize étaient donc « périmées », et chaque
  // affichage déclenchait deux appels réseau. Mesuré : 6,48 s contre 0,03 s
  // une fois la date posée — deux cents fois plus lent.
  //
  // Trois raisons de le sortir d'ici, pas seulement la vitesse. Un robot
  // d'indexation paierait ce délai sur chacune des dizaines de milliers de
  // fiches qu'il explore. Une API publique de l'État recevrait autant d'appels,
  // ce qui n'est ni correct ni durable. Et une requête GET écrirait en base,
  // ce qu'aucune page ne devrait faire.
  //
  // La fraîcheur relève désormais de l'import et d'une tâche planifiée, où le
  // rythme se règle et où un échec se voit.
  if (process.env.SYNC_AU_RENDU === "true") {
    const perimee = !entreprise.syncSirene || Date.now() - entreprise.syncSirene.getTime() > FRAICHEUR_MS;
    if (perimee) {
      try {
        await synchroniserEntreprise(entreprise.siren);
        entreprise = await prisma.entreprise.findUnique({ where: { id: entreprise.id } });
      } catch {
        // Une source indisponible ne doit jamais empêcher l'affichage.
      }
    }
  }

  return entreprise;
}

export async function detailEntreprise(entrepriseId: string) {
  const [entreprise, etablissements, evenements, comptes, donnees, decisions] = await Promise.all([
    prisma.entreprise.findUnique({ where: { id: entrepriseId }, include: { mediateur: true } }),
    prisma.etablissement.findMany({
      where: { entrepriseId },
      orderBy: [{ estSiege: "desc" }, { commune: "asc" }],
    }),
    prisma.evenement.findMany({ where: { entrepriseId }, orderBy: { date: "desc" }, take: 40 }),
    prisma.compteAnnuel.findMany({ where: { entrepriseId }, orderBy: { exercice: "desc" } }),
    prisma.donneeSource.findMany({ where: { entrepriseId } }),
    prisma.decisionJustice.findMany({ where: { entrepriseId }, orderBy: { date: "desc" }, take: 25 }),
  ]);

  const sources = new Map(donnees.map((d) => [d.champ, d]));
  return { entreprise, etablissements, evenements, comptes, sources, decisions };
}
