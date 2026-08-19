"use client";

import Link from "next/link";
import { useRef } from "react";

export type Onglet = { cle: string; libelle: string; href: string };

/**
 * Sommaire de la fiche entreprise.
 *
 * Ce furent des onglets, chacun portant sa propre URL (`?onglet=`). Le
 * découpage paraissait bon pour le référencement — chaque onglet partageable
 * et indexable — mais produisait l'inverse : cinq adresses par entreprise,
 * toutes rabattues par la balise canonique sur une page qui n'affichait qu'un
 * cinquième du contenu. Le robot payait cinq explorations pour n'en créditer
 * qu'une, et maigre.
 *
 * Les sections sont maintenant toutes rendues ensemble ; ceci n'est plus qu'un
 * sommaire d'ancres. Les flèches du clavier restent gérées.
 */
export function BarreOnglets({ onglets, actif }: { onglets: Onglet[]; actif?: string }) {
  const conteneur = useRef<HTMLDivElement>(null);

  function auClavier(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    const liens = Array.from(conteneur.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
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
      <nav
        ref={conteneur}
        className="rfi-onglets"
        aria-label="Sections de la fiche entreprise"
        onKeyDown={auClavier}
      >
        {onglets.map((o) => (
          <Link key={o.cle} href={o.href} className="rfi-onglet" aria-current={o.cle === actif ? "true" : undefined}>
            {o.libelle}
          </Link>
        ))}
      </nav>
    </div>
  );
}
