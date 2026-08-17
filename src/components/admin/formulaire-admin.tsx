"use client";

import { useActionState, type ReactNode } from "react";
import type { EtatAdmin } from "@/app/admin/actions";

type Action = (etat: EtatAdmin, donnees: FormData) => Promise<EtatAdmin>;

/** Formulaire d'action de modération, avec retour d'état inline. */
export function FormulaireAdmin({
  action,
  champsCaches,
  children,
  boutons,
  compact = false,
}: {
  action: Action;
  champsCaches?: Record<string, string>;
  children?: ReactNode;
  boutons: { valeur: string; libelle: string; variante?: "primaire" | "neutre" | "danger" | "succes" }[];
  compact?: boolean;
}) {
  const [etat, formAction, enCours] = useActionState<EtatAdmin, FormData>(action, {});

  return (
    <form action={formAction}>
      {Object.entries(champsCaches ?? {}).map(([nom, valeur]) => (
        <input key={nom} type="hidden" name={nom} value={valeur} />
      ))}
      {children}
      <div className="rf-ligne" style={{ gap: 8, marginTop: compact ? 8 : 12 }}>
        {boutons.map((b) => (
          <button
            key={b.valeur}
            type="submit"
            name="decision"
            value={b.valeur}
            disabled={enCours}
            className={`rf-btn rf-btn--xs ${
              b.variante === "danger"
                ? "rf-btn--danger"
                : b.variante === "succes"
                  ? "rf-btn--succes"
                  : b.variante === "neutre"
                    ? "rf-btn--neutre"
                    : "rf-btn--primaire"
            }`}
          >
            {b.libelle}
          </button>
        ))}
      </div>
      {etat.erreur ? (
        <p className="rf-erreur-champ" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      {etat.message ? (
        <p className="rf-micro" role="status" style={{ color: "var(--rf-succes)", marginTop: 6, fontWeight: 600 }}>
          {etat.message}
        </p>
      ) : null}
    </form>
  );
}

/** Bouton d'action simple, sans champ de saisie. */
export function BoutonAdmin({
  action,
  champsCaches,
  libelle,
  variante = "primaire",
}: {
  action: Action;
  champsCaches?: Record<string, string>;
  libelle: string;
  variante?: "primaire" | "neutre" | "danger" | "succes";
}) {
  return (
    <FormulaireAdmin
      action={action}
      champsCaches={champsCaches}
      compact
      boutons={[{ valeur: "ok", libelle, variante }]}
    />
  );
}
