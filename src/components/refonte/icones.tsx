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

/* ── Ajouts de la fiche boutique ─────────────────────────────────────────────
   Le handoff de la fiche boutique demande huit portes d'entrée dérivées de
   l'activité du site. Les six motifs de la fiche entreprise ne suffisaient
   plus, et forcer deux situations distinctes à partager un pictogramme rend la
   grille illisible : l'œil s'appuie sur la forme avant de lire. */

export const Cle = (p: Props) => (
  <Trait {...p}>
    <path d="M15.5 3a5.5 5.5 0 0 0-5.2 7.3L3 17.6V21h3.4l7.3-7.3A5.5 5.5 0 1 0 15.5 3z" />
    <circle cx="16.4" cy="7.6" r="1.2" />
  </Trait>
);

export const Retour = (p: Props) => (
  <Trait {...p}>
    <path d="M4 9h11a5 5 0 0 1 0 10H8" />
    <path d="M8 5 4 9l4 4" />
  </Trait>
);

export const Telephone = (p: Props) => (
  <Trait {...p}>
    <path d="M6.2 3.5h3l1.4 3.6-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2 3.6 1.4v3a1.7 1.7 0 0 1-1.9 1.7A15.6 15.6 0 0 1 4.5 5.4 1.7 1.7 0 0 1 6.2 3.5z" />
    <path d="M15 3.6a5.6 5.6 0 0 1 4.7 4.7" />
  </Trait>
);

export const Lien = (p: Props) => (
  <Trait {...p}>
    <path d="M14 5h5v5" />
    <path d="M19 5l-8.2 8.2" />
    <path d="M17.4 13.6V18a1.6 1.6 0 0 1-1.6 1.6H6a1.6 1.6 0 0 1-1.6-1.6V8.2A1.6 1.6 0 0 1 6 6.6h4.4" />
  </Trait>
);

export const Personne = (p: Props) => (
  <Trait {...p}>
    <circle cx="12" cy="8.2" r="3.6" />
    <path d="M4.8 20c0-3.6 3.2-5.8 7.2-5.8s7.2 2.2 7.2 5.8" />
  </Trait>
);

export const Calendrier = (p: Props) => (
  <Trait {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Trait>
);

export const CercleCoche = (p: Props) => (
  <Trait {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.2 12.3l2.6 2.6 5-5.2" />
  </Trait>
);

export const Loupe = (p: Props) => (
  <Trait {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.4 15.4L21 21" />
  </Trait>
);

export const Balance = (p: Props) => (
  <Trait {...p}>
    <path d="M12 4.5v15M7.5 19.5h9M4 8.5l8-2.2 8 2.2" />
    <path d="M4 8.5 1.8 13a2.6 2.6 0 0 0 4.4 0z" />
    <path d="M20 8.5 17.8 13a2.6 2.6 0 0 0 4.4 0z" />
  </Trait>
);
