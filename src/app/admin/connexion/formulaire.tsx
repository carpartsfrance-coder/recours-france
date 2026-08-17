"use client";

import { useActionState } from "react";
import { connexionAdmin, type EtatAdmin } from "../actions";

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState<EtatAdmin, FormData>(connexionAdmin, {});

  return (
    <form action={action} className="rf-carte" style={{ padding: 28, maxWidth: 420, width: "100%" }}>
      <h1 className="rf-h2 rf-h2--secondaire" style={{ fontSize: 21 }}>
        Administration Recours France
      </h1>
      <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5 }}>
        Accès réservé à l’équipe de modération. Toutes les actions sont tracées dans le journal d’audit.
      </p>

      {etat.erreur ? (
        <div className="rf-encart rf-encart--erreur rf-mt-18" role="alert">
          {etat.erreur}
        </div>
      ) : null}

      <div className="rf-mt-20">
        <label className="rf-champ__label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="username" className="rf-input" />
      </div>
      <div className="rf-mt-16">
        <label className="rf-champ__label" htmlFor="motDePasse">
          Mot de passe
        </label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          required
          autoComplete="current-password"
          className="rf-input"
        />
      </div>
      <button type="submit" className="rf-btn rf-btn--primaire rf-btn--bloc rf-mt-20" disabled={enCours}>
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
