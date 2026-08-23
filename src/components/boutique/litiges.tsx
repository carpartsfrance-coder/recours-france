"use client";

import { useState } from "react";
import { typo } from "@/lib/typographie";

export type StatutLitige = "Publié" | "Démarche en cours" | "Résolu";

export type LitigePublic = {
  id: string;
  categorie: string;
  statut: StatutLitige;
  titre: string;
  resume: string;
  date: string;
  /** Affiché seulement si l'auteur a accepté de le publier. */
  montant: string | null;
  frise: { libelle: string; date: string }[];
};

const FILTRES: (StatutLitige | "Tous")[] = ["Tous", "Publié", "Démarche en cours", "Résolu"];

const CLASSE: Record<StatutLitige, string> = {
  "Publié": "rfb-chip rfb-chip--publie",
  "Démarche en cours": "rfb-chip rfb-chip--cours",
  "Résolu": "rfb-chip rfb-chip--resolu",
};

/**
 * Le seuil d'affichage des filtres, laissé ouvert par le handoff.
 *
 * Cinq, comme il le propose. En dessous, quatre boutons pour trois cartes
 * encombrent plus qu'ils ne trient, et deux des quatre ne renverraient rien —
 * un filtre qui vide la liste se lit comme une panne.
 */
const SEUIL_FILTRES = 5;

export function Litiges({ litiges }: { litiges: LitigePublic[] }) {
  const [filtre, setFiltre] = useState<StatutLitige | "Tous">("Tous");
  const visibles = filtre === "Tous" ? litiges : litiges.filter((l) => l.statut === filtre);
  const n = visibles.length;

  return (
    <div style={{ marginTop: 18 }}>
      {litiges.length >= SEUIL_FILTRES ? (
        <div className="rfb-filtres">
          <span className="rfb-filtres__t" id="rfb-filtre-t">
            Filtrer
          </span>
          <div role="group" aria-labelledby="rfb-filtre-t" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {FILTRES.map((f) => (
              <button
                key={f}
                type="button"
                className="rfb-filtre"
                aria-pressed={filtre === f}
                onClick={() => setFiltre(f)}
              >
                {typo(f)}
              </button>
            ))}
          </div>
          <span className="rfb-filtres__n" aria-live="polite">
            {n} litige{n > 1 ? "s" : ""} affiché{n > 1 ? "s" : ""}
          </span>
        </div>
      ) : null}

      <ul className="rfb-litiges">
        {visibles.map((l) => (
          <li key={l.id} className="rfb-litige">
            <div className="rfb-litige__tete">
              <span className="rfb-chip">{typo(l.categorie)}</span>
              <span className={CLASSE[l.statut]}>{typo(l.statut)}</span>
              <span className="rfb-litige__date">Publié le {l.date}</span>
            </div>
            <h3 className="rfb-h3" style={{ marginTop: 14 }}>
              {typo(l.titre)}
            </h3>
            <p className="rfb-texte" style={{ marginTop: 8, maxWidth: "80ch" }}>
              {typo(l.resume)}
            </p>
            {l.montant ? (
              <p style={{ marginTop: 10, fontSize: 14.5, color: "var(--b-texte)" }}>
                <span style={{ color: "var(--b-gris)" }}>Montant concerné : </span>
                <span style={{ fontWeight: 700, color: "var(--b-marine)" }}>{l.montant}</span>
              </p>
            ) : null}
            <ol className="rfb-frise">
              {l.frise.map((e, i) => (
                <li key={e.libelle}>
                  <span
                    className={`rfb-frise__pt${i === l.frise.length - 1 ? " rfb-frise__pt--vif" : ""}`}
                    aria-hidden="true"
                  />
                  <span className="rfb-frise__k">{typo(e.libelle)}</span>
                  <span>{e.date}</span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>

      <p className="rfb-petit" style={{ marginTop: 14, maxWidth: "86ch" }}>
        {typo(
          "Chaque litige reprend la déclaration de son auteur et l’avancement qu’il renseigne lui-même. Recours France ne vérifie pas le récit des faits et n’intervient pas dans le règlement du litige.",
        )}
      </p>
    </div>
  );
}
