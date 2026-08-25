import Link from "next/link";
import Image from "next/image";

/**
 * Le logo de Recours France.
 *
 * Le fichier fourni : deux bulles de dialogue imbriquées, puis « Recours
 * France » sur deux lignes. Le logotype fait partie du dessin — ce composant
 * n'écrit aucun texte à côté.
 *
 * Le fichier d'origine (`design/logo-source-recours-france.png`) est un export
 * sur fond blanc, damier compris. Le fond en a été retiré par un masque
 * progressif tiré de la luminance, et non par un seuil : un seuil hache les
 * bords adoucis, très visibles à quarante pixels de haut.
 *
 * La version claire garde les couleurs d'origine. La version sombre est le
 * même dessin en blanc plein — sa silhouette, tirée du canal alpha. Elle n'est
 * pas une recolorisation : dans ce fichier, le bleu marine et le bleu vif ont
 * la même teinte et ne diffèrent que par la clarté, si bien qu'aucun
 * remplacement de couleur ne sait les distinguer une fois les bords adoucis.
 * Un logotype d'une seule couleur sur fond sombre est de toute façon l'usage.
 * Une version couleur sur fond sombre demanderait un export dédié.
 */

/** 1200 × 359 après détourage et rognage. */
const RATIO = 1200 / 359;

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
