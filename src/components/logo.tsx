import Link from "next/link";
import Image from "next/image";

/**
 * Le logo de Recours France.
 *
 * Le fichier fourni, pas une reconstitution : « Recours France » sur deux
 * lignes en bleu marine, suivi des deux barres inclinées bleue et rouge. Le
 * logotype fait partie du dessin — ce composant n'écrit aucun texte à côté.
 *
 * Deux versions, une par fond : la sombre passe le texte en blanc et laisse
 * les barres telles quelles, elles tiennent sur les deux fonds.
 *
 * `public/` porte les deux formats. Le PNG est servi ici, en trois fois la
 * taille d'affichage, ce qui laisse `next/image` produire les densités et les
 * formats modernes ; le SVG l'accompagne comme source vectorielle pour tout ce
 * qui sort du site — courriels, réseaux, impression.
 */

/** 356 × 130 dans le fichier d'origine. */
const RATIO = 356 / 130;

export function Logo({
  taille = 40,
  fonce = false,
  lien = "/",
  priorite = false,
}: {
  /** Hauteur en pixels. La largeur suit. */
  taille?: number;
  fonce?: boolean;
  /** `null` rend le logo sans lien — pour les pages où il pointerait sur elle-même. */
  lien?: string | null;
  priorite?: boolean;
}) {
  const largeur = Math.round(taille * RATIO);

  const image = (
    <Image
      src={fonce ? "/logo-recours-france-blanc.png" : "/logo-recours-france.png"}
      alt="Recours France"
      width={largeur}
      height={taille}
      priority={priorite}
      // La source fait trois fois la hauteur demandée : à densité double ou
      // triple, l'image reste nette sans qu'on serve trois fichiers.
      quality={90}
      style={{ height: taille, width: "auto", display: "block" }}
    />
  );

  if (lien === null) return image;

  return (
    <Link href={lien} aria-label="Recours France — accueil" style={{ display: "inline-flex", flex: "none" }}>
      {image}
    </Link>
  );
}
