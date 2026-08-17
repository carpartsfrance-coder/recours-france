"use client";

import { useId, useState, type ReactNode } from "react";

export type Rubrique = {
  cle: string;
  titre: string;
  indice: string;
  contenu: ReactNode;
};

/**
 * Rubriques de données publiques : accordéon exclusif — une seule ouverte à la
 * fois, libellé « Consulter le détail » / « Masquer », signe + / −.
 */
export function Rubriques({ rubriques }: { rubriques: Rubrique[] }) {
  const [ouverte, setOuverte] = useState<string | null>(null);
  const base = useId();

  return (
    <div style={{ marginTop: 8 }}>
      {rubriques.map((r) => {
        const estOuverte = ouverte === r.cle;
        const id = `${base}-${r.cle}`;
        return (
          <div key={r.cle} className="rfi-rubrique">
            <button
              type="button"
              className="rfi-rubrique__bouton"
              aria-expanded={estOuverte}
              aria-controls={id}
              onClick={() => setOuverte(estOuverte ? null : r.cle)}
            >
              <span style={{ minWidth: 0 }}>
                <span className="rfi-rubrique__titre">{r.titre}</span>
                <span className="rfi-rubrique__indice">{r.indice}</span>
              </span>
              <span style={{ flex: "none", display: "flex", alignItems: "center", gap: 12 }}>
                <span className="rfi-rubrique__action">{estOuverte ? "Masquer" : "Consulter le détail"}</span>
                <span className="rfi-rubrique__signe" aria-hidden="true">
                  {estOuverte ? "−" : "+"}
                </span>
              </span>
            </button>
            <div id={id} className="rfi-rubrique__contenu" hidden={!estOuverte}>
              {r.contenu}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Rubrique isolée, ouverture indépendante (méthodologie, démarches, mentions). */
export function Repli({
  titre,
  indice,
  children,
  variante = "rubrique",
  libelleFerme,
  libelleOuvert,
}: {
  titre?: string;
  indice?: string;
  children: ReactNode;
  variante?: "rubrique" | "lien";
  libelleFerme?: string;
  libelleOuvert?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();

  if (variante === "lien") {
    return (
      <>
        <button
          type="button"
          className="rfi-lien-action"
          aria-expanded={ouvert}
          aria-controls={id}
          onClick={() => setOuvert((v) => !v)}
        >
          {ouvert ? (libelleOuvert ?? "Masquer") : (libelleFerme ?? "Consulter le détail")}
        </button>
        <div id={id} hidden={!ouvert}>
          {children}
        </div>
      </>
    );
  }

  return (
    <div className="rfi-rubrique">
      <button
        type="button"
        className="rfi-rubrique__bouton"
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert((v) => !v)}
      >
        <span style={{ minWidth: 0 }}>
          <span className="rfi-rubrique__titre">{titre}</span>
          {indice ? <span className="rfi-rubrique__indice">{indice}</span> : null}
        </span>
        <span style={{ flex: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <span className="rfi-rubrique__action">{ouvert ? "Masquer" : "Consulter le détail"}</span>
          <span className="rfi-rubrique__signe" aria-hidden="true">
            {ouvert ? "−" : "+"}
          </span>
        </span>
      </button>
      <div id={id} className="rfi-rubrique__contenu" hidden={!ouvert}>
        {children}
      </div>
    </div>
  );
}
