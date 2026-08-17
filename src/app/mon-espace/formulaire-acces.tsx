"use client";

import { useActionState } from "react";
import { demanderLiens, type EtatAcces } from "./actions";

export function FormulaireAcces() {
  const [etat, action, enCours] = useActionState<EtatAcces, FormData>(demanderLiens, {});

  return (
    <form action={action} className="rf-carte rf-mt-24" style={{ padding: 24, maxWidth: 620 }}>
      <label className="rf-champ__label" htmlFor="email">
        Adresse email utilisée lors du signalement
      </label>
      <div className="rf-recherche">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rf-input"
          placeholder="vous@courriel.fr"
        />
        <button type="submit" className="rf-btn rf-btn--primaire" disabled={enCours}>
          {enCours ? "Envoi…" : "Recevoir mon lien"}
        </button>
      </div>
      {etat.erreur ? (
        <span className="rf-erreur-champ" role="alert">
          {etat.erreur}
        </span>
      ) : null}
      {etat.envoye ? (
        <div className="rf-encart rf-encart--succes rf-mt-16" role="status">
          {etat.message}
        </div>
      ) : null}
      <p className="rf-legende rf-mt-14">
        Le lien reste valable 90 jours et se prolonge à chaque consultation. Pour des raisons de
        confidentialité, nous ne confirmons jamais l’existence d’un signalement rattaché à une adresse.
      </p>
    </form>
  );
}
