import { chargerEntreprise } from "@/lib/fiche";
import { lireBrouillon } from "@/lib/brouillon";
import { CIBLE_LIBRE } from "@/lib/tunnel";
import { prisma } from "@/lib/db";
import { normaliserDomaine } from "@/lib/boutiques";

/**
 * Ce que vise un signalement : une entreprise répertoriée, ou une saisie libre.
 *
 * Les treize millions de fiches ne couvrent pas tout. Une boutique en ligne
 * dont aucune personne morale n'est établie, une société étrangère, une
 * enseigne qu'aucun registre français ne connaît : ces cas existent, et ce sont
 * souvent les plus problématiques. Refuser le signalement renverrait chez elle
 * la personne dont la difficulté est précisément de ne pas savoir à qui elle a
 * affaire.
 *
 * Le tunnel est donc unique, et c'est cette fonction qui absorbe la différence.
 */
export type Cible = {
  /** Fragment d'URL du tunnel : slug de la fiche, ou le fragment réservé. */
  slug: string;
  nom: string;
  /** Identifiant de la fiche, absent pour une saisie libre. */
  entrepriseId: string | null;
  /** Slug de la fiche publique, pour y renvoyer après publication. */
  slugFiche: string | null;
  site: string | null;
  secteur: string | null;
  commune: string | null;
  /** Le SIREN et le code d'activité : l'en-tête du tunnel affiche le premier,
   *  et le second décide de l'ordre des familles de litige. */
  siren: string | null;
  naf: string | null;
  /**
   * La fiche publique de la cible, quand elle en a une.
   *
   * Le tunnel s'en sert pour ses liens de sortie. Il déduisait jusqu'ici
   * l'adresse du slug d'URL, ce qui ne vaut que pour une entreprise : une cible
   * libre porte le slug « autre », et « Voir mon signalement public » menait
   * donc à `/entreprises/autre`. Une boutique en a une, elle aussi — c'est même
   * la page d'où le visiteur arrive.
   */
  fiche: string | null;
};

export async function resoudreCible(slug: string): Promise<Cible | null> {
  if (slug === CIBLE_LIBRE) {
    const brouillon = await lireBrouillon();
    if (!brouillon.libreNom) return null;
    // Le domaine désigne peut-être une boutique déjà répertoriée : c'est le cas
    // ordinaire, puisqu'on arrive de sa fiche. On la cherche sans la créer —
    // consulter une page ne doit rien écrire en base.
    const domaine = brouillon.libreSite ? normaliserDomaine(brouillon.libreSite) : null;
    const boutique = domaine
      ? await prisma.boutique.findUnique({ where: { domaine }, select: { slug: true } })
      : null;
    return {
      slug: CIBLE_LIBRE,
      nom: brouillon.libreNom,
      entrepriseId: null,
      slugFiche: null,
      site: brouillon.libreSite ?? null,
      secteur: null,
      commune: null,
      siren: null,
      naf: null,
      fiche: boutique ? `/boutiques/${boutique.slug}` : null,
    };
  }

  const base = await chargerEntreprise(slug);
  if (!base) return null;
  return {
    slug: base.slug,
    nom: base.denomination,
    entrepriseId: base.id,
    slugFiche: base.slug,
    site: base.siteWeb,
    secteur: base.secteur,
    commune: base.commune,
    siren: base.siren,
    naf: base.naf,
    fiche: `/entreprises/${base.slug}`,
  };
}
