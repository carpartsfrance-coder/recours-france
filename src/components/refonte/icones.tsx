import type { ReactElement, SVGProps } from "react";

/**
 * Le jeu d'icônes de la refonte.
 *
 * Traits fins uniquement : épaisseur 1.6, aucun remplissage, aucune
 * illustration, aucun emoji. Le handoff l'impose et la raison tient : cette
 * page publie des reproches contre des sociétés nommées, et la sobriété du
 * trait fait davantage pour la crédibilité qu'un pictogramme coloré.
 *
 * Les couleurs viennent de `currentColor`, jamais d'un attribut : chaque
 * icône prend le ton de son contexte.
 */

type Props = SVGProps<SVGSVGElement> & { taille?: number };

function Trait({ taille = 20, children, ...reste }: Props & { children: React.ReactNode }): ReactElement {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...reste}
    >
      {children}
    </svg>
  );
}

export const Oeil = (p: Props) => (
  <Trait {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </Trait>
);

export const Document = (p: Props) => (
  <Trait {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Trait>
);

export const Horloge = (p: Props) => (
  <Trait {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Trait>
);

export const Fleche = (p: Props) => (
  <Trait {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Trait>
);

export const Chevron = (p: Props) => (
  <Trait {...p}>
    <path d="M6 9l6 6 6-6" />
  </Trait>
);

export const Info = (p: Props) => (
  <Trait {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Trait>
);

export const Cadenas = (p: Props) => (
  <Trait {...p}>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Trait>
);

export const Bouclier = (p: Props) => (
  <Trait {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
    <path d="M9.5 12l1.8 1.8L15 10" />
  </Trait>
);

export const Enveloppe = (p: Props) => (
  <Trait {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </Trait>
);

export const Coche = (p: Props) => (
  <Trait {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Trait>
);

/* ── Les six familles de problème ──────────────────────────────────────── */

export const Remboursement = (p: Props) => (
  <Trait {...p}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 12h.01M18 12h.01" />
  </Trait>
);

export const Colis = (p: Props) => (
  <Trait {...p}>
    <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </Trait>
);

export const Bulle = (p: Props) => (
  <Trait {...p}>
    <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.4-4.2A8 8 0 1 1 21 12z" />
  </Trait>
);

export const Alerte = (p: Props) => (
  <Trait {...p}>
    <path d="M10.3 4.3 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
    <path d="M12 9.5v4M12 17h.01" />
  </Trait>
);

export const Carte = (p: Props) => (
  <Trait {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20M6 15h4" />
  </Trait>
);

export const Question = (p: Props) => (
  <Trait {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.1-2.5 3.6M12 17h.01" />
  </Trait>
);
