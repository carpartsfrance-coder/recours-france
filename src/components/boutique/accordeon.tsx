"use client";

import { useId, useState } from "react";
import { Chevron } from "@/components/refonte/icones";
import { typo } from "@/lib/typographie";

/**
 * Accordéon de la fiche boutique.
 *
 * Fermé au départ, comme l'impose le handoff, et jamais retiré du document :
 * le panneau reste dans le HTML sous `hidden`. Deux raisons, et la seconde
 * est la vraie. Ctrl+F continue de trouver le texte ; surtout, les cinq
 * réponses de la foire aux questions sont balisées en FAQPage, et un balisage
 * qui décrit un contenu absent du HTML est une déclaration fausse — Google
 * l'a sanctionné assez souvent pour qu'on n'essaie pas.
 *
 * `<details>` aurait suffi et coûté zéro octet de JavaScript, mais le handoff
 * demande `aria-expanded` / `aria-controls` sur le bouton et un chevron qui
 * pivote : `<summary>` ne porte ni l'un ni l'autre proprement.
 */
export function Accordeon({
  titre,
  resume,
  corps,
  niveau = 3,
}: {
  titre: string;
  resume?: string;
  corps: string[];
  /** Le rang du titre, pour que la hiérarchie H2/H3 reste cohérente. */
  niveau?: 3 | 4;
}) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const Titre = niveau === 3 ? "h3" : "h4";

  return (
    <div className="rfb-acc">
      <Titre style={{ margin: 0, font: "inherit" }}>
        <button
          type="button"
          className="rfb-acc__bouton"
          aria-expanded={ouvert}
          aria-controls={id}
          onClick={() => setOuvert((v) => !v)}
        >
          <span style={{ minWidth: 0 }}>
            <span className="rfb-acc__t">{typo(titre)}</span>
            {resume ? <span className="rfb-acc__s">{typo(resume)}</span> : null}
          </span>
          <Chevron taille={20} className="rfb-acc__signe" />
        </button>
      </Titre>
      <div className="rfb-acc__panneau" id={id} hidden={!ouvert}>
        {corps.map((p, i) => (
          <p key={i}>{typo(p)}</p>
        ))}
      </div>
    </div>
  );
}
