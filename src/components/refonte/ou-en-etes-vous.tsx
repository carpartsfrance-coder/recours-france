"use client";

import { useState } from "react";
import Link from "next/link";
import { Fleche } from "./icones";
import { SITUATIONS_PLAN } from "@/lib/refonte";

/**
 * « Où en êtes-vous dans vos démarches ? »
 *
 * Le seul îlot interactif de la fiche, et le seul composant client : la page
 * est mise en cache une journée, et un paramètre d'URL l'aurait rendue
 * dynamique pour treize millions de fiches.
 *
 * Le reste des replis de la page passe par `<details>`, qui fonctionne sans
 * JavaScript. Ici il faut un état à trois valeurs et une réponse qui change
 * de texte : un composant client coûte moins qu'un formulaire aller-retour.
 */
export function OuEnEtesVous({ nom, href }: { nom: string; href: string }) {
  const [choix, setChoix] = useState<string | null>(null);
  const retenue = SITUATIONS_PLAN.find((s) => s.cle === choix);

  return (
    <div className="rfn-aide" style={{ marginTop: 26 }}>
      <h3 className="rfn-h3">Où en êtes-vous dans vos démarches ?</h3>
      <p className="rfn-second" style={{ marginTop: 8, color: "var(--rf-texte-2)" }}>
        Avez-vous déjà contacté {nom} par écrit ?
      </p>

      <div
        role="group"
        aria-label="Où en êtes-vous dans vos démarches ?"
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(212px, 1fr))",
          marginTop: 14,
        }}
      >
        {SITUATIONS_PLAN.map((s) => {
          const actif = choix === s.cle;
          return (
            <button
              key={s.cle}
              type="button"
              onClick={() => setChoix(actif ? null : s.cle)}
              aria-pressed={actif}
              style={{
                minHeight: 56,
                height: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                textAlign: "left",
                cursor: "pointer",
                borderRadius: "var(--rf-rayon)",
                border: `1px solid ${actif ? "var(--rf-cobalt)" : "var(--rf-bordure-champ)"}`,
                background: actif ? "var(--rf-cobalt)" : "#fff",
                color: actif ? "#fff" : "var(--rf-cobalt-fonce)",
                fontSize: 14.5,
                fontWeight: actif ? 700 : 600,
                lineHeight: 1.35,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 18,
                  flex: "none",
                  borderRadius: "50%",
                  border: `1px solid ${actif ? "#fff" : "var(--rf-bordure-champ)"}`,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {actif ? (
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
                ) : null}
              </span>
              {s.libelle}
            </button>
          );
        })}
      </div>

      {retenue ? (
        <div
          style={{
            marginTop: 14,
            background: "#fff",
            border: "1px solid var(--rf-bordure-aide)",
            borderRadius: "var(--rf-rayon-carte)",
            padding: 16,
          }}
        >
          <div className="rfn-eyebrow">Votre prochaine étape</div>
          <p className="rfn-second" style={{ marginTop: 8, color: "var(--rf-texte-2)" }}>
            {retenue.note}
          </p>
          <Link href={href} className="rfn-btn" style={{ marginTop: 14 }}>
            {retenue.action}
            <Fleche taille={18} />
          </Link>
        </div>
      ) : null}

      <p className="rfn-mention" style={{ marginTop: 14 }}>
        Nous préparons le texte adapté à votre situation. L’envoi reste effectué par vos soins.
      </p>
    </div>
  );
}
