import { chargerEntreprise } from "@/lib/fiche";
import { lireBrouillon } from "@/lib/brouillon";
import { CIBLE_LIBRE } from "@/lib/tunnel";
import { prisma } from "@/lib/db";
import { nomAffiche, normaliserDomaine } from "@/lib/boutiques";

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
  /**
   * La boutique d'où part le signalement, quand il part d'une fiche boutique.
   *
   * Le schéma prévoit les deux rattachements et dit pourquoi : « il a acheté
   * sur bergamotte.com, pas chez VERY BLOOM ». Seul le cas sans société
   * établie les posait ; dès qu'un exploitant était connu, la déclaration
   * partait sur la société seule et n'apparaissait jamais sur la fiche de la
   * boutique d'où on venait de la déposer.
   */
  boutiqueId: string | null;
  /**
   * La raison sociale, lorsque le nom affiché est celui de la boutique.
   *
   * Le tunnel montrait la société à la place du site : on cliquait sur
   * « Sides.fr » et l'écran suivant annonçait « SOCIETE INDUSTRIELLE POUR LE
   * DEVELOPPEMENT DE LA SECURITE ». Le changement d'identité entre deux écrans
   * fait douter d'avoir cliqué juste. Le site passe devant, la société suit.
   */
  societe: string | null;
};

export async function resoudreCible(slug: string, via?: string | null): Promise<Cible | null> {
  if (slug === CIBLE_LIBRE) {
    const brouillon = await lireBrouillon();
    if (!brouillon.libreNom) return null;
    // Le domaine désigne peut-être une boutique déjà répertoriée : c'est le cas
    // ordinaire, puisqu'on arrive de sa fiche. On la cherche sans la créer —
    // consulter une page ne doit rien écrire en base.
    const domaine = brouillon.libreSite ? normaliserDomaine(brouillon.libreSite) : null;
    const boutique = domaine
      ? await prisma.boutique.findUnique({ where: { domaine }, select: { id: true, slug: true } })
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
      boutiqueId: boutique?.id ?? null,
      societe: null,
    };
  }

  const base = await chargerEntreprise(slug);
  if (!base) return null;

  /**
   * Le passage par une boutique, vérifié plutôt que cru sur parole.
   *
   * `via` vient de l'URL. Sans le contrôle de rattachement, n'importe qui
   * ferait afficher le nom d'un site quelconque en tête du tunnel d'une
   * société qui n'a rien à voir avec lui — et la déclaration atterrirait sur
   * la fiche de ce site.
   */
  const boutique = via
    ? await prisma.boutique.findUnique({
        where: { slug: via },
        select: { id: true, slug: true, domaine: true, entrepriseId: true },
      })
    : null;
  const depuisBoutique = boutique && boutique.entrepriseId === base.id ? boutique : null;

  return {
    slug: base.slug,
    nom: depuisBoutique ? nomAffiche(depuisBoutique.domaine) : base.denomination,
    entrepriseId: base.id,
    slugFiche: base.slug,
    site: base.siteWeb,
    secteur: base.secteur,
    commune: base.commune,
    siren: base.siren,
    naf: base.naf,
    fiche: depuisBoutique ? `/boutiques/${depuisBoutique.slug}` : `/entreprises/${base.slug}`,
    boutiqueId: depuisBoutique?.id ?? null,
    societe: depuisBoutique ? base.denomination : null,
  };
}
