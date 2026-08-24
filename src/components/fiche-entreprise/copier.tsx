"use client";

import { useState } from "react";
import { Copier as IconeCopier } from "@/components/refonte/icones";

/**
 * Bouton de copie d'une valeur du registre.
 *
 * Le SIREN et l'adresse se recopient à la main dans un courrier, une saisine
 * de médiateur ou un formulaire : les rendre copiables évite la faute de
 * frappe sur neuf chiffres, qui désigne alors une autre société.
 *
 * Le retour est annoncé à voix haute — `aria-live` — parce qu'un changement
 * d'icône ne dit rien à qui n'a pas d'écran.
 */
export function BoutonCopier({ valeur, libelle }: { valeur: string; libelle: string }) {
  const [copie, setCopie] = useState(false);

  return (
    <>
      <button
        type="button"
        className="rfe-copier"
        aria-label={`Copier ${libelle}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(valeur);
            setCopie(true);
            window.setTimeout(() => setCopie(false), 1600);
          } catch {
            // Le presse-papiers est refusé hors contexte sécurisé : la valeur
            // reste sélectionnable à la main, rien à signaler.
          }
        }}
      >
        <IconeCopier taille={15} />
      </button>
      {/* Le retour est écrit « COPIÉ » en capitales vertes, comme le veut le
          handoff, et annoncé à voix haute : un changement d'icône ne dit rien
          à qui n'a pas d'écran. */}
      <span aria-live="polite" className="rfe-copie">
        {copie ? "Copié" : ""}
      </span>
    </>
  );
}
