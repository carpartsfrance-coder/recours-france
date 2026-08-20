import { chargerEntreprise } from "@/lib/fiche";
import { lireBrouillon } from "@/lib/brouillon";
import { CIBLE_LIBRE } from "@/lib/tunnel";

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
};

export async function resoudreCible(slug: string): Promise<Cible | null> {
  if (slug === CIBLE_LIBRE) {
    const brouillon = await lireBrouillon();
    if (!brouillon.libreNom) return null;
    return {
      slug: CIBLE_LIBRE,
      nom: brouillon.libreNom,
      entrepriseId: null,
      slugFiche: null,
      site: brouillon.libreSite ?? null,
      secteur: null,
      commune: null,
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
  };
}
