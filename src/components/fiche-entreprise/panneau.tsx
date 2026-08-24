"use client";

import { useId, useState, type ReactNode } from "react";
import { Chevron } from "@/components/refonte/icones";
import { typo } from "@/lib/typographie";

/**
 * Panneau dépliable des documents officiels.
 *
 * Ouvert au départ, comme le veut le handoff : la liste des dépôts est le
 * contenu de la section, pas un détail qu'on révèle. Le repli sert à ranger,
 * pas à cacher.
 *
 * Le contenu reste dans le document sous `hidden` plutôt que d'être retiré :
 * ce que la page annonce à Google doit s'y trouver, ouvert ou fermé.
 */
export function Panneau({
  titre,
  compte,
  children,
  ouvertParDefaut = true,
}: {
  titre: string;
  compte: string;
  children: ReactNode;
  ouvertParDefaut?: boolean;
}) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const id = useId();

  return (
    <div className="rfe-panneau">
      <button
        type="button"
        className="rfe-panneau__tete"
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert((v) => !v)}
      >
        <span>
          {/* Le compte passe au-dessus du titre, en capitales : c'est le
              registre de la page, où la structure s'annonce avant le libellé. */}
          <span className="rfe-caps" style={{ display: "block" }}>
            {typo(compte)}
          </span>
          <span className="rfe-panneau__titre" style={{ display: "block", marginTop: 4 }}>
            {typo(titre)}
          </span>
        </span>
        <Chevron taille={18} className="rfe-panneau__chev" />
      </button>
      <div id={id} hidden={!ouvert}>
        {children}
      </div>
    </div>
  );
}
