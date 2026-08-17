"use client";

import { useId, useState, type ReactNode } from "react";

type Props = {
  titre: string;
  sousTitre?: string;
  /** Libellés alternatifs affichés à la place du titre, selon l'état. */
  libelleFerme?: string;
  libelleOuvert?: string;
  ouvertParDefaut?: boolean;
  variante?: "carte" | "pied" | "compact";
  children: ReactNode;
  /** Contenu affiché en permanence, entre le bouton et le volet dépliable. */
  entete?: ReactNode;
};

/**
 * Accordéon : ouverture indépendante, libellé et signe « + / − » mis à jour.
 * Le contenu reste dans le DOM (hidden) pour rester trouvable via Ctrl+F.
 */
export function Accordeon({
  titre,
  sousTitre,
  libelleFerme,
  libelleOuvert,
  ouvertParDefaut = false,
  variante = "carte",
  entete,
  children,
}: Props) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const id = useId();
  const libelle = ouvert ? (libelleOuvert ?? titre) : (libelleFerme ?? titre);

  const classe =
    variante === "pied"
      ? "rf-accordeon rf-accordeon--pied"
      : variante === "compact"
        ? "rf-accordeon rf-accordeon--compact"
        : "rf-accordeon";

  return (
    <div className={variante === "pied" ? "" : classe}>
      {entete}
      <button
        type="button"
        className={variante === "pied" ? "rf-accordeon--pied rf-accordeon__bouton" : "rf-accordeon__bouton"}
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert((v) => !v)}
      >
        <span>
          <span className="rf-accordeon__titre">{libelle}</span>
          {sousTitre ? <span className="rf-accordeon__sous-titre">{sousTitre}</span> : null}
        </span>
        <span className="rf-accordeon__signe" aria-hidden="true">
          {ouvert ? "−" : "+"}
        </span>
      </button>
      <div id={id} className="rf-accordeon__contenu" hidden={!ouvert}>
        {children}
      </div>
    </div>
  );
}
