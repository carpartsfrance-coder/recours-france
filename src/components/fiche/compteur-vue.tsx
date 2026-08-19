"use client";

import { useEffect } from "react";

/**
 * Signale une consultation de fiche.
 *
 * Le comptage se faisait pendant le rendu, ce qui interdisait toute mise en
 * cache de la page. Il part maintenant du navigateur, après affichage : la
 * fiche redevient une page statique, et les robots — qui n'exécutent pas
 * toujours le script — cessent de gonfler le compteur.
 */
export function CompteurVue({ siren }: { siren: string }) {
  useEffect(() => {
    const corps = JSON.stringify({ siren });
    // sendBeacon survit à la fermeture de l'onglet ; fetch prend le relais là
    // où il n'existe pas.
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/vue", new Blob([corps], { type: "application/json" }));
    } else {
      void fetch("/api/vue", { method: "POST", body: corps, keepalive: true }).catch(() => {});
    }
  }, [siren]);

  return null;
}
