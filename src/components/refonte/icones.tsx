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

/* ── Ajouts du parcours de dépôt ─────────────────────────────────────────────
   Le handoff nomme une icône par emplacement, et l'écart entre deux d'entre
   elles porte du sens : le camion dit « livraison » là où le colis disait
   « produit », la cloche dit « on vous alerte » là où l'enveloppe dit « on
   vous écrit ». Les confondre reviendrait à changer la phrase. */

export const Camion = (p: Props) => (
  <Trait {...p}>
    <path d="M2.5 7.5h10.5v9H2.5z" />
    <path d="M13 10.5h4l2.5 3v3H13z" />
    <circle cx="6.5" cy="18" r="1.7" />
    <circle cx="16.5" cy="18" r="1.7" />
  </Trait>
);

export const Points = (p: Props) => (
  <Trait {...p}>
    <circle cx="5.5" cy="12" r="1.1" />
    <circle cx="12" cy="12" r="1.1" />
    <circle cx="18.5" cy="12" r="1.1" />
  </Trait>
);

export const Euro = (p: Props) => (
  <Trait {...p}>
    <path d="M17.4 7.2a6.4 6.4 0 1 0 0 9.6" />
    <path d="M4.6 10.4h8M4.6 13.6h8" />
  </Trait>
);

export const Etiquette = (p: Props) => (
  <Trait {...p}>
    <path d="M3.8 11.2V4.6a.8.8 0 0 1 .8-.8h6.6l9 9-7.4 7.4-9-9z" />
    <circle cx="7.9" cy="7.9" r="1.3" />
  </Trait>
);

export const Cloche = (p: Props) => (
  <Trait {...p}>
    <path d="M6 9.6a6 6 0 0 1 12 0c0 4 1.4 5.6 1.4 5.6H4.6S6 13.6 6 9.6z" />
    <path d="M10.2 18.6a2 2 0 0 0 3.6 0" />
  </Trait>
);

export const Avion = (p: Props) => (
  <Trait {...p}>
    <path d="M21 3.4 2.6 11.1l6.3 2.4 2.4 6.3z" />
    <path d="M21 3.4 8.9 13.5" />
  </Trait>
);

export const Chaine = (p: Props) => (
  <Trait {...p}>
    <path d="M10.2 13.8a3.6 3.6 0 0 0 5.4.4l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1l-1.5 1.5" />
    <path d="M13.8 10.2a3.6 3.6 0 0 0-5.4-.4l-2.6 2.6a3.6 3.6 0 0 0 5.1 5.1l1.5-1.5" />
  </Trait>
);

export const FlecheGauche = (p: Props) => (
  <Trait {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </Trait>
);

export const Dossier = (p: Props) => (
  <Trait {...p}>
    <path d="M3.5 6.4a1.6 1.6 0 0 1 1.6-1.6h3.6l2 2.4h7.7a1.6 1.6 0 0 1 1.6 1.6v8.8a1.6 1.6 0 0 1-1.6 1.6H5.1a1.6 1.6 0 0 1-1.6-1.6z" />
  </Trait>
);

export const Rafraichir = (p: Props) => (
  <Trait {...p}>
    <path d="M20.4 11a8.4 8.4 0 1 0-.9 5" />
    <path d="M20.6 4.8V11h-6.2" />
  </Trait>
);

export const Copier = (p: Props) => (
  <Trait {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
  </Trait>
);

export const Immeuble = (p: Props) => (
  <Trait {...p}>
    <path d="M4 20V6.2a1.6 1.6 0 0 1 1.6-1.6h7.8a1.6 1.6 0 0 1 1.6 1.6V20" />
    <path d="M15 11h3.4A1.6 1.6 0 0 1 20 12.6V20M2.6 20h18.8" />
    <path d="M7.4 8.4h1.4M7.4 12h1.4M7.4 15.6h1.4M11.4 8.4h1.4M11.4 12h1.4M11.4 15.6h1.4" />
  </Trait>
);

export const Epingle = (p: Props) => (
  <Trait {...p}>
    <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </Trait>
);

export const Groupe = (p: Props) => (
  <Trait {...p}>
    <circle cx="9" cy="8.4" r="3.2" />
    <path d="M3 19.4c0-3.1 2.7-5 6-5s6 1.9 6 5" />
    <path d="M16.4 5.6a3.2 3.2 0 0 1 0 5.6M17.6 14.8c2 .6 3.4 2.1 3.4 4.6" />
  </Trait>
);

export const Graphique = (p: Props) => (
  <Trait {...p}>
    <path d="M4 20V4M4 20h16" />
    <path d="M8 16.5v-4M12.4 16.5v-8M16.8 16.5v-5.5" />
  </Trait>
);

export const Camembert = (p: Props) => (
  <Trait {...p}>
    <path d="M12 3.2a8.8 8.8 0 1 0 8.8 8.8H12z" />
    <path d="M14.6 2.6A8.8 8.8 0 0 1 21.4 9.4h-6.8z" />
  </Trait>
);

export const Liste = (p: Props) => (
  <Trait {...p}>
    <path d="M8.6 6.4h11.8M8.6 12h11.8M8.6 17.6h11.8" />
    <circle cx="4.4" cy="6.4" r="1.1" />
    <circle cx="4.4" cy="12" r="1.1" />
    <circle cx="4.4" cy="17.6" r="1.1" />
  </Trait>
);

export const Branchement = (p: Props) => (
  <Trait {...p}>
    <path d="M4 5.5h5.4L14 12l4.6 6.5H20" />
    <path d="M4 18.5h5.4L14 12" />
    <path d="M17.4 15.8 20.6 18.5l-3.2 2.7M17.4 3.5 20.6 6.2l-3.2 2.7" />
  </Trait>
);

export const Presse = (p: Props) => (
  <Trait {...p}>
    <path d="M9 4.4H7.2A1.6 1.6 0 0 0 5.6 6v13.4a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6V6a1.6 1.6 0 0 0-1.6-1.6H15" />
    <rect x="9" y="2.6" width="6" height="3.6" rx="1.2" />
    <path d="M12 11.4l3-1.3v2.6c0 1.8-1.2 3.2-3 3.8-1.8-.6-3-2-3-3.8v-2.6z" />
  </Trait>
);

/** Mallette — l'activité déclarée, dans les chips d'identité de la fiche. */
export const Mallette = (p: Props) => (
  <Trait {...p}>
    <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
    <path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7" />
    <path d="M3 12.5h18" />
  </Trait>
);
