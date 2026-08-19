"use client";

import { useState } from "react";
import Link from "next/link";

export type Experience = {
  reference: string;
  titre: string;
  montant: string;
  verifie: boolean;
  meta: string;
  reponse: string;
  statut: string;
  statutCouleur: string;
  statutNote: string;
  resume: string;
  champs: { cle: string; valeur: string }[];
  afficherTeaser: boolean;
};

/**
 * Expériences documentées : une seule carte ouverte à la fois.
 * Le détail est strictement structuré — aucun texte libre du consommateur
 * n'est publié en l'état, seul un résumé factuel rédigé par la plateforme.
 */
export function ListeExperiences({ experiences }: { experiences: Experience[] }) {
  const [ouverte, setOuverte] = useState<string | null>(null);

  return (
    <div className="rf-pile rf-pile--serree rf-mt-22">
      {experiences.map((e) => {
        const estOuverte = ouverte === e.reference;
        return (
          <article
            key={e.reference}
            className="rf-carte"
            style={{ borderLeft: `4px solid ${e.verifie ? "var(--rf-cobalt)" : "var(--rf-texte-desactive)"}` }}
          >
            <div style={{ padding: "20px 22px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 18,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <div className="rf-min0">
                  <div className="rf-ligne" style={{ gap: 12, alignItems: "baseline" }}>
                    <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>{e.titre}</span>
                    <span className="rf-nombres" style={{ fontSize: 17, fontWeight: 700 }}>
                      {e.montant}
                    </span>
                  </div>
                  <div className="rf-ligne rf-mt-10" style={{ gap: 10 }}>
                    <span
                      className={`rf-badge rf-badge--sm ${e.verifie ? "rf-badge--verifie-doux" : "rf-badge--non-verifie"}`}
                    >
                      {e.verifie ? "✓ Justificatif déposé" : "Signalement sans justificatif"}
                    </span>
                    <span className="rf-legende">{e.meta}</span>
                  </div>
                  <p className="rf-mt-8" style={{ fontSize: 13.5 }}>
                    Réponse du professionnel : <strong>{e.reponse}</strong>
                  </p>
                </div>
                <div className="rf-droite rf-flexnone">
                  <div className="rf-etiquette" style={{ letterSpacing: ".06em", fontWeight: 600 }}>
                    Statut
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 5, color: e.statutCouleur }}>
                    {e.statut}
                  </div>
                  <div className="rf-micro rf-mt-4">{e.statutNote}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOuverte(estOuverte ? null : e.reference)}
              aria-expanded={estOuverte}
              aria-controls={`detail-${e.reference}`}
              style={{
                width: "100%",
                border: 0,
                borderTop: "1px solid var(--rf-ligne-carte)",
                background: "var(--rf-fond-leger)",
                color: "var(--rf-cobalt)",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 600,
                padding: "12px 22px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{estOuverte ? "Masquer le détail du litige" : "Voir le détail structuré"}</span>
              <span style={{ fontSize: 15 }} aria-hidden="true">
                {estOuverte ? "−" : "+"}
              </span>
            </button>

            <div
              id={`detail-${e.reference}`}
              hidden={!estOuverte}
              style={{ borderTop: "1px solid var(--rf-ligne-carte)", padding: "20px 22px" }}
            >
              <div className="rf-tuiles">
                {e.champs.map((c) => (
                  <div key={c.cle} className="rf-tuile rf-tuile--moyenne">
                    <div className="rf-etiquette" style={{ fontWeight: 600 }}>
                      {c.cle}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 5 }}>{c.valeur}</div>
                  </div>
                ))}
              </div>
              <p className="rf-mt-16" style={{ fontSize: 14, lineHeight: 1.65 }}>
                {e.resume}
              </p>
              <p className="rf-chip-mono rf-mt-14">
                Signalement {e.reference}
                {e.verifie ? " — justificatif déposé, horodaté et scellé" : " — aucun justificatif"}
              </p>

              {e.afficherTeaser ? (
                <div
                  className="rf-carte rf-carte--legere rf-mt-18"
                  style={{
                    padding: "18px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 20,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div className="rf-flex1">
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Votre litige n’est pas résolu&nbsp;?</div>
                    <p className="rf-texte rf-mt-6" style={{ fontSize: 13.5 }}>
                      Recours France prépare un service de prise en charge permettant de structurer,
                      transmettre et suivre les réclamations auprès des professionnels. Ce service n’est pas
                      encore disponible.
                    </p>
                  </div>
                  <Link href="/contact?sujet=lancement" className="rf-btn rf-btn--secondaire rf-btn--sm rf-flexnone">
                    Être informé du lancement
                  </Link>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
