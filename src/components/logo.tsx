import Link from "next/link";

/**
 * Le logo de Recours France.
 *
 * Deux bulles de dialogue imbriquées. De l'avant, tracée en plein, il ne
 * manque rien ; de l'arrière, décalée vers la droite et le bas, seules deux
 * arêtes dépassent — la droite en bleu, la basse en rouge. C'est de ces trois
 * couleurs que toute la charte du site est tirée : navy #0B2C6B, bleu #1152C4,
 * rouge #E1000F.
 *
 * Un dessin, pas une image : le logo apparaît de dix-huit à quarante pixels
 * selon les emplacements, il doit rester net à toutes ces tailles et suivre le
 * fond sur lequel il est posé. Un PNG demanderait un fichier par taille et par
 * fond.
 *
 * `fonce` bascule sur fond navy : le tracé de l'avant passe au blanc et
 * l'arête bleue s'éclaircit pour rester lisible. Le rouge ne bouge pas — il
 * tient sur les deux fonds.
 */

/** Les trois tracés, séparés du composant pour que la favicone les reprenne. */
export function LogoTraces({ avant, bleu }: { avant: string; bleu: string }) {
  return (
    <>
      <path
        d="M8 4h16a5 5 0 0 1 5 5v11a5 5 0 0 1-5 5h-7l-5 6-.6-6H8a5 5 0 0 1-5-5V9a5 5 0 0 1 5-5Z"
        stroke={avant}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d="M29 13h2a5 5 0 0 1 5 5v6" stroke={bleu} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M36 24v3a5 5 0 0 1-5 5H15.5" stroke="#E1000F" strokeWidth="2.6" strokeLinecap="round" />
    </>
  );
}

export function Logo({
  taille = 38,
  fonce = false,
  lien = "/",
}: {
  taille?: number;
  fonce?: boolean;
  /** `null` rend le logo sans lien — pour la page d'accueil, où il pointerait sur elle-même. */
  lien?: string | null;
}) {
  const avant = fonce ? "#fff" : "#0B2C6B";
  const bleu = fonce ? "#7FA6E0" : "#1152C4";

  const dessin = (
    <>
      <svg width={taille} height={taille} viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
        <LogoTraces avant={avant} bleu={bleu} />
      </svg>
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          // Le logotype se règle sur la hauteur du dessin plutôt que sur une
          // valeur fixe : le logo sert de dix-huit à quarante pixels.
          fontSize: Math.round(taille * 0.45),
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1.06,
          color: fonce ? "#fff" : "#0B2C6B",
        }}
      >
        <span>Recours</span>
        <span>France</span>
      </span>
    </>
  );

  const style = {
    display: "inline-flex",
    alignItems: "center",
    gap: Math.round(taille * 0.29),
    textDecoration: "none",
    flex: "none",
  } as const;

  if (lien === null) {
    return (
      <span style={style} aria-label="Recours France">
        {dessin}
      </span>
    );
  }

  return (
    <Link href={lien} aria-label="Recours France — accueil" style={style}>
      {dessin}
    </Link>
  );
}
