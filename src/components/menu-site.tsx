"use client";

import Link from "next/link";
import { useState } from "react";
import { Loupe } from "@/components/refonte/icones";
import { typo } from "@/lib/typographie";
import { NAV_SITE } from "@/lib/navigation";

/**
 * Le menu des écrans étroits, sur toutes les pages.
 *
 * Le handoff remplace, sous neuf cents pixels, la recherche, la navigation et
 * l'appel à l'action de l'en-tête par un seul bouton de quarante-quatre
 * pixels. Il ne dit pas ce qu'il ouvre : un bouton qui n'ouvre rien serait
 * pire que pas de bouton, donc il rend ce que la barre large affichait — le
 * champ de recherche et les trois liens — dans un panneau déroulant.
 *
 * L'appel à l'action n'y figure pas : sur la fiche, la barre collante du bas
 * le porte en permanence, et le handoff refuse explicitement de le dupliquer.
 */
export function MenuSite() {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <button
        type="button"
        className="rfh-menu"
        aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={ouvert}
        aria-controls="rfh-menu-panneau"
        onClick={() => setOuvert((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          {ouvert ? (
            <>
              <path d="M5 5l10 10" />
              <path d="M15 5L5 15" />
            </>
          ) : (
            <>
              <path d="M3 6h14" />
              <path d="M3 10h14" />
              <path d="M3 14h14" />
            </>
          )}
        </svg>
      </button>

      <div id="rfh-menu-panneau" className="rfh-menu__panneau" hidden={!ouvert}>
        <form action="/entreprises" className="rfh-recherche rfh-recherche--menu" role="search">
          <Loupe taille={17} />
          <input
            type="search"
            name="q"
            placeholder="Rechercher une entreprise ou un SIREN"
            aria-label="Rechercher une entreprise ou un SIREN"
          />
        </form>
        {NAV_SITE.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setOuvert(false)}>
            {typo(l.libelle)}
          </Link>
        ))}
      </div>
    </>
  );
}
