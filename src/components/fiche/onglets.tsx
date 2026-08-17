"use client";

import Link from "next/link";
import { useRef } from "react";

export type Onglet = { cle: string; libelle: string; href: string };

/**
 * Barre d'onglets de la fiche entreprise.
 *
 * Ce sont de vrais liens : l'onglet actif est porté par l'URL (`?onglet=`),
 * chaque onglet reste donc partageable et indexable, et la page fonctionne
 * sans JavaScript. Le clavier est enrichi par les flèches gauche/droite,
 * conformément au motif « tablist ».
 */
export function BarreOnglets({ onglets, actif }: { onglets: Onglet[]; actif: string }) {
  const conteneur = useRef<HTMLDivElement>(null);

  function auClavier(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    const liens = Array.from(conteneur.current?.querySelectorAll<HTMLAnchorElement>("[role='tab']") ?? []);
    const index = liens.findIndex((l) => l === document.activeElement);
    if (index === -1) return;
    e.preventDefault();
    const cible =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? liens.length - 1
          : e.key === "ArrowRight"
            ? (index + 1) % liens.length
            : (index - 1 + liens.length) % liens.length;
    liens[cible]?.focus();
  }

  return (
    <div className="rfi-conteneur" style={{ padding: "26px 32px 0" }}>
      <div
        ref={conteneur}
        className="rfi-onglets"
        role="tablist"
        aria-label="Sections de la fiche entreprise"
        onKeyDown={auClavier}
      >
        {onglets.map((o) => {
          const selectionne = o.cle === actif;
          return (
            <Link
              key={o.cle}
              href={o.href}
              scroll={false}
              className="rfi-onglet"
              role="tab"
              aria-selected={selectionne}
              tabIndex={selectionne ? 0 : -1}
            >
              {o.libelle}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
