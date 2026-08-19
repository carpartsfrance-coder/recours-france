/**
 * Boutiques en ligne : le sujet de fiche que le consommateur reconnaît.
 *
 * Une recherche par nom commercial dans les registres renvoie fréquemment une
 * personne morale sans rapport — « Bergamotte » désigne une société de
 * Montélimar créée en 1978, quand bergamotte.com est exploité par VERY BLOOM.
 * Publier une déclaration contre la première serait mettre en cause quelqu'un
 * qui n'a jamais rien vendu au plaignant.
 *
 * On rattache donc la déclaration au domaine, que le consommateur connaît avec
 * certitude puisqu'il y a acheté. La personne morale devient un enrichissement
 * sourcé, jamais une condition d'existence de la fiche.
 */
import { prisma } from "./db";

/**
 * Réduit une saisie à un domaine comparable.
 *
 * Sans cette normalisation, « Bergamotte.com », « www.bergamotte.com/panier »
 * et « https://bergamotte.com » produiraient trois fiches distinctes pour une
 * seule boutique.
 */
export function normaliserDomaine(saisie: string): string | null {
  const propre = saisie.trim().toLowerCase().replace(/\s/g, "");
  if (!propre || propre.length > 253) return null;
  const avecSchema = /^https?:\/\//.test(propre) ? propre : `https://${propre}`;
  try {
    const url = new URL(avecSchema);
    const hote = url.hostname.replace(/^www\./, "");
    // Un domaine comporte au moins un point et une extension alphabétique.
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(hote)) return null;
    return hote;
  } catch {
    return null;
  }
}

/** Nom d'affichage par défaut : le domaine sans son extension, capitalisé. */
export function nomDepuisDomaine(domaine: string): string {
  const base = domaine.split(".")[0].replace(/[-_]+/g, " ").trim();
  return base
    .split(" ")
    // Le premier mot prend toujours la majuscule : « le Slip Francais » ne se
    // lit pas. Les articles courts en milieu de nom restent en minuscules.
    .map((mot, i) => (i === 0 || mot.length > 2 ? mot.charAt(0).toUpperCase() + mot.slice(1) : mot))
    .join(" ");
}

function slugDepuisDomaine(domaine: string): string {
  return domaine.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Trouve ou crée la boutique correspondant à une saisie, et tente de lui
 * rattacher sa personne morale à partir des tables importées.
 */
export async function boutiquePour(saisie: string): Promise<{ id: string; domaine: string } | null> {
  const domaine = normaliserDomaine(saisie);
  if (!domaine) return null;

  const existante = await prisma.boutique.findUnique({ where: { domaine }, select: { id: true, domaine: true } });
  if (existante) return existante;

  const boutique = await prisma.boutique.create({
    data: { domaine, nom: nomDepuisDomaine(domaine), slug: slugDepuisDomaine(domaine) },
    select: { id: true, domaine: true },
  });
  await rattacherEntreprise(boutique.id, domaine).catch(() => undefined);
  return boutique;
}

/**
 * Rattache une boutique à sa personne morale, si l'une des tables importées
 * connaît ce domaine.
 *
 * Wikidata et OpenStreetMap sont contributives : le rattachement est enregistré
 * avec sa provenance et n'est jamais présenté comme une vérification.
 */
export async function rattacherEntreprise(boutiqueId: string, domaine: string): Promise<boolean> {
  // La table stocke les sites sous forme https://hôte : on compare sur l'hôte,
  // avec et sans « www », puisque les deux écritures y coexistent.
  const connus = await prisma.siteConnu.findMany({
    where: { OR: [{ site: `https://${domaine}` }, { site: `https://www.${domaine}` }] },
    take: 2,
  });
  // Deux SIREN pour un même domaine : on ne tranche pas, on laisse non rattaché.
  if (connus.length !== 1) return false;

  const entreprise = await prisma.entreprise.findUnique({ where: { siren: connus[0].siren }, select: { id: true } });
  if (!entreprise) return false;

  await prisma.boutique.update({
    where: { id: boutiqueId },
    data: {
      entrepriseId: entreprise.id,
      rattachementSource: connus[0].origine,
      rattachementLe: new Date(),
    },
  });
  return true;
}
