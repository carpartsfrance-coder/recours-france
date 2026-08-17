"use client";

import { useActionState, type ReactNode } from "react";

export type EtatAction = { message?: string; erreur?: string; succes?: boolean };

/**
 * Enveloppe de formulaire branchée sur une action serveur : affiche l'état
 * (erreur, succès), désactive le bouton pendant l'envoi et masque le
 * formulaire une fois la demande acceptée.
 */
export function FormulaireAction({
  action,
  libelle,
  children,
  masquerApresSucces = true,
  note,
}: {
  action: (etat: EtatAction, donnees: FormData) => Promise<EtatAction>;
  libelle: string;
  children: ReactNode;
  masquerApresSucces?: boolean;
  note?: ReactNode;
}) {
  const [etat, formAction, enCours] = useActionState<EtatAction, FormData>(action, {});

  if (etat.succes && masquerApresSucces) {
    return (
      <div className="rf-encart rf-encart--succes" role="status">
        {etat.message}
      </div>
    );
  }

  return (
    <form action={formAction}>
      {etat.erreur ? (
        <div className="rf-encart rf-encart--erreur" role="alert" style={{ marginBottom: 18 }}>
          {etat.erreur}
        </div>
      ) : null}
      {etat.message && !etat.succes ? (
        <div className="rf-encart rf-encart--succes" role="status" style={{ marginBottom: 18 }}>
          {etat.message}
        </div>
      ) : null}
      {children}
      <div className="rf-mt-20">
        <button type="submit" className="rf-btn rf-btn--primaire" disabled={enCours}>
          {enCours ? "Envoi en cours…" : libelle}
        </button>
      </div>
      {note ? <div className="rf-legende rf-mt-14">{note}</div> : null}
    </form>
  );
}
