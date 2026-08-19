"use client";

import { useState } from "react";

export type Dossier = {
  reference: string;
  motif: string;
  montant: string;
  verifie: boolean;
  resolu: boolean;
  date: string;
  duree: string;
  /** Vrai au-delà de 60 jours d'ouverture : la durée passe en rouge. */
  dureeAlerte: boolean;
  statut: string;
  statutClasse: string;
  detail: { cle: string; valeur: string }[];
  resume: string;
};

const FILTRES = [
  { cle: "tous", libelle: "Toutes" },
  { cle: "verifies", libelle: "Avec pièce" },
  { cle: "ouverts", libelle: "Sans résolution confirmée" },
] as const;

type Filtre = (typeof FILTRES)[number]["cle"];

/**
 * Dossiers récents : filtre réel et détail structuré déplié, une seule ligne
 * ouverte à la fois. Aucun texte libre de consommateur n'est publié : le résumé
 * affiché est produit par la plateforme à partir des données structurées.
 */
export function Dossiers({
  slug,
  dossiers,
  total,
  lienTous,
  titre = "Déclarations récentes",
}: {
  /** Slug de l'entreprise, pour ouvrir la contestation sur un dossier précis. */
  slug?: string;
  dossiers: Dossier[];
  total: number;
  /** Absent sur la page de liste complète : il n'y a plus de « voir tout ». */
  lienTous?: string;
  titre?: string;
}) {
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [ouvert, setOuvert] = useState<string | null>(null);

  const visibles = dossiers.filter(
    (d) => filtre === "tous" || (filtre === "verifies" && d.verifie) || (filtre === "ouverts" && !d.resolu),
  );

  return (
    <div className="rfi-min0">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 18,
          flexWrap: "wrap",
          alignItems: "baseline",
          borderBottom: "1px solid var(--rfi-marine)",
          paddingBottom: 11,
        }}
      >
        <h3 className="rfi-h3">{titre}</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }} role="group" aria-label="Filtrer les dossiers">
          {FILTRES.map((f) => (
            <button
              key={f.cle}
              type="button"
              className="rfi-filtre"
              aria-pressed={filtre === f.cle}
              onClick={() => setFiltre(f.cle)}
            >
              {f.libelle}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="rfi-legende" style={{ padding: "20px 0" }}>
          Aucun dossier ne correspond à ce filtre.
        </p>
      ) : null}

      {visibles.map((d) => {
        const estOuvert = ouvert === d.reference;
        return (
          <article key={d.reference} className="rfi-dossier">
            <div className="rfi-dossier__tete">
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{d.motif}</span>
                  <span className="rf-nombres" style={{ fontSize: 16, fontWeight: 600, color: "var(--rf-texte-2)" }}>
                    {d.montant}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 8,
                    fontSize: 12.5,
                    color: "var(--rf-texte-3)",
                  }}
                >
                  <span className={`rfi-badge ${d.verifie ? "rfi-badge--verifie" : "rfi-badge--neutre"}`}>
                    {d.verifie ? "Pièce fournie" : "Sans pièce"}
                  </span>
                  <span>Déclaré le {d.date}</span>
                  <span className="rfi-sep" aria-hidden="true">
                    |
                  </span>
                  <span
                    style={{
                      color: d.dureeAlerte ? "var(--rfi-rouge)" : "var(--rf-texte-3)",
                      fontWeight: d.dureeAlerte ? 600 : 400,
                    }}
                  >
                    {d.duree}
                  </span>
                </div>
              </div>
              <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 16 }}>
                <span className={`rfi-statut ${d.statutClasse}`}>{d.statut}</span>
                <button
                  type="button"
                  className="rfi-lien-action"
                  style={{ fontSize: 13, minHeight: 0, whiteSpace: "nowrap" }}
                  aria-expanded={estOuvert}
                  aria-controls={`dossier-${d.reference}`}
                  onClick={() => setOuvert(estOuvert ? null : d.reference)}
                >
                  {estOuvert ? "Fermer" : "Voir le détail"}
                </button>
              </div>
            </div>

            <div id={`dossier-${d.reference}`} className="rfi-dossier__detail" hidden={!estOuvert}>
              <div className="rfi-grille--160" style={{ display: "grid" }}>
                {d.detail.map((c) => (
                  <div key={c.cle}>
                    <div className="rfi-etiquette">{c.cle}</div>
                    <div style={{ fontSize: 13.5, marginTop: 5, lineHeight: 1.45 }}>{c.valeur}</div>
                  </div>
                ))}
              </div>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  marginTop: 16,
                  borderTop: "1px solid var(--rfi-filet)",
                  paddingTop: 14,
                }}
              >
                {d.resume}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginTop: 12,
                  fontSize: 12,
                  color: "var(--rf-texte-3)",
                }}
              >
                <span className="rf-mono" style={{ fontSize: 11.5, color: "var(--rf-texte-2)" }}>
                  Déclaration {d.reference}
                  {d.verifie ? " — justificatif déposé, horodaté et scellé" : " — aucun justificatif"}
                </span>
                <span>
                  Statut déclaré par le consommateur ·{" "}
                  {slug ? (
                    <a href={`/entreprises/${slug}/contester?reference=${d.reference}`}>
                      Contester ce dossier
                    </a>
                  ) : null}
                </span>
              </div>
            </div>
          </article>
        );
      })}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          paddingTop: 14,
        }}
      >
        {lienTous ? (
          <a href={lienTous} style={{ fontSize: 13.5 }}>
            Consulter les {total.toLocaleString("fr-FR")} dossier{total > 1 ? "s" : ""} enregistré
            {total > 1 ? "s" : ""}
          </a>
        ) : (
          <span className="rfi-source">
            {visibles.length.toLocaleString("fr-FR")} dossier{visibles.length > 1 ? "s" : ""} affiché
            {visibles.length > 1 ? "s" : ""} sur {total.toLocaleString("fr-FR")}
          </span>
        )}
        <span className="rfi-source">Aucun texte libre de consommateur n’est publié tel quel.</span>
      </div>
    </div>
  );
}
