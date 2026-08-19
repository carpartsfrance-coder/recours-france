"use client";

import { useState } from "react";

/**
 * Copie du courrier en un geste.
 *
 * L'action naturelle après avoir décrit son litige, c'est d'écrire au
 * professionnel. Obliger à ouvrir un autre écran pour récupérer le modèle,
 * c'est perdre la personne au moment où elle est le plus disposée à agir.
 */
export function CopierTexte({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      // Presse-papier refusé : le texte reste sélectionnable à la main.
    }
  }

  return (
    <button type="button" onClick={copier} className="rf-btn rf-btn--primaire rf-btn--bloc">
      {copie ? "Courrier copié ✓" : "Copier le courrier"}
    </button>
  );
}
