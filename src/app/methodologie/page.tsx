import Link from "next/link";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import {
  CE_QUE_LA_PLATEFORME_NE_FAIT_PAS,
  DATE_METHODOLOGIE,
  DROITS_ET_RECTIFICATION,
  POIDS_EXPERIENCE,
  POIDS_TRANSPARENCE,
  REGLES_STATISTIQUES,
  SOURCES_PUBLIQUES,
  STATUTS_EXPLIQUES,
  VERSION_METHODOLOGIE,
} from "@/lib/contenus";
import { SEUIL_PUBLICATION_EXPERIENCE } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Méthodologie",
  description:
    "D’où viennent les chiffres publiés sur une fiche Recours France, ce qu’est un signalement accompagné d’un justificatif, comment une résolution est confirmée et à partir de quel volume un score est publié.",
};

const SOMMAIRE = [
  { libelle: "1. Données issues des sources publiques", href: "#m1" },
  { libelle: "2. Données issues des utilisateurs", href: "#m2" },
  { libelle: "3. Statuts d’un signalement", href: "#m3" },
  { libelle: "4. Calcul des indices", href: "#m4" },
  { libelle: "5. Calcul des statistiques publiées", href: "#m5" },
  { libelle: "6. Rectification et contestation", href: "#m6" },
  { libelle: "7. Ce que la plateforme ne fait pas", href: "#m7" },
];

export default function Methodologie() {
  return (
    <Page fil={[{ libelle: "Méthodologie" }]}>
      <div className="rf-conteneur" style={{ padding: "36px 32px 32px" }}>
        <div style={{ maxWidth: 820 }}>
          <h1 className="rf-h1" style={{ fontSize: 40, letterSpacing: "-0.035em" }}>
            Méthodologie
          </h1>
          <p className="rf-chapo rf-mt-16" style={{ fontSize: 17, lineHeight: 1.65 }}>
            D’où viennent les chiffres publiés sur une fiche, ce qu’est un signalement accompagné d’un justificatif, comment une
            résolution est confirmée et à partir de quel volume un score d’expérience est publié. Cette page est
            opposable : toute donnée affichée sur la plateforme suit les règles décrites ici.
          </p>
          <p className="rf-legende rf-mt-14">
            Version {VERSION_METHODOLOGIE} — en vigueur depuis le {DATE_METHODOLOGIE}
          </p>
        </div>
      </div>

      <div className="rf-conteneur rf-deux-colonnes--etroite" style={{ padding: "0 32px 48px" }}>
        <div className="rf-pile" style={{ gap: 22 }}>
          {/* 1 */}
          <section className="rf-carte">
            <div className="rf-carte__tete" style={{ display: "block" }}>
              <h2 id="m1" className="rf-h2 rf-h2--secondaire">
                1. Données issues des sources publiques
              </h2>
              <p className="rf-texte rf-mt-6" style={{ fontSize: 14 }}>
                Reprises telles que publiées par les registres, sans retraitement éditorial, avec la date de
                synchronisation.
              </p>
            </div>
            {SOURCES_PUBLIQUES.map((s) => (
              <div
                key={s.name}
                style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid var(--rf-ligne-carte)",
                  display: "flex",
                  gap: 20,
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div className="rf-flex1">
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</div>
                  <p className="rf-texte rf-mt-4" style={{ fontSize: 13.5 }}>
                    {s.desc}
                  </p>
                </div>
                <div className="rf-flexnone rf-droite">
                  <span className="rf-badge rf-badge--sm rf-badge--verifie-doux">{s.tag}</span>
                  <div className="rf-micro rf-mt-6">{s.freq}</div>
                </div>
              </div>
            ))}
            <p className="rf-carte__pied" style={{ borderTop: 0 }}>
              Une donnée publique erronée est corrigée à la source par l’entreprise auprès du registre concerné ;
              la fiche se met à jour à la synchronisation suivante. Chaque donnée affichée porte sa source et sa
              date de vérification.
            </p>
          </section>

          {/* 2 */}
          <section className="rf-carte">
            <div className="rf-carte__tete" style={{ display: "block" }}>
              <h2 id="m2" className="rf-h2 rf-h2--secondaire">
                2. Données issues des utilisateurs
              </h2>
              <p className="rf-texte rf-mt-6" style={{ fontSize: 14 }}>
                Deux niveaux, jamais mélangés, ni visuellement ni statistiquement.
              </p>
            </div>
            <div className="rf-carte__corps rf-grille" style={{ gap: 16 }}>
              <div className="rf-carte rf-carte--douce" style={{ padding: "18px 20px" }}>
                <span className="rf-badge rf-badge--sm rf-badge--non-verifie">Signalement déclaré</span>
                <p className="rf-mt-12" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Signalement transmis par un utilisateur, sans vérification documentaire.
                </p>
                <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                  Publié en volume agrégé. Aucun poids dans le score d’expérience des consommateurs, aucune
                  transmission nominative à l’entreprise.
                </p>
              </div>
              <div className="rf-carte rf-carte--selection" style={{ padding: "17px 19px" }}>
                <span className="rf-badge rf-badge--verifie">✓ Justificatif déposé</span>
                <p className="rf-mt-12" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Le consommateur a déposé un élément censé établir la relation commerciale ou la réalité du
                  signalement : facture, commande, contrat, échange professionnel, preuve de paiement.
                </p>
                <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                  Seule base de calcul des statistiques de comportement. La vérification porte sur la réalité du
                  signalement, pas sur le bien-fondé de la réclamation.
                </p>
              </div>
            </div>
            <div style={{ padding: "0 24px 22px" }}>
              <p className="rf-encart rf-encart--doux">
                Les pièces déposées ne sont jamais publiées. Seuls la catégorie, le montant déclaré, la date, le
                statut et le niveau de vérification apparaissent publiquement. Aucun champ libre du consommateur
                n’est publié en l’état : les résumés visibles sur les fiches sont rédigés par la plateforme à
                partir des seules données structurées.
              </p>
            </div>
          </section>

          {/* 3 */}
          <section className="rf-carte">
            <div className="rf-carte__tete" style={{ display: "block" }}>
              <h2 id="m3" className="rf-h2 rf-h2--secondaire">
                3. Statuts d’un signalement
              </h2>
              <p className="rf-texte rf-mt-6" style={{ fontSize: 14 }}>
                Une résolution n’est comptabilisée comme telle qu’après confirmation du consommateur.
              </p>
            </div>
            <div className="rf-carte__corps rf-grille rf-grille--260" style={{ gap: "14px 32px" }}>
              {STATUTS_EXPLIQUES.map((s) => (
                <div key={s.libelle} className="rf-item" style={{ gap: 11 }}>
                  <span style={{ width: 8, height: 8, background: s.ton, display: "block", marginTop: 7, flex: "none" }} />
                  <div className="rf-min0">
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.libelle}</div>
                    <div className="rf-legende" style={{ marginTop: 2 }}>
                      {s.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4 */}
          <section className="rf-carte">
            <div className="rf-carte__tete" style={{ display: "block" }}>
              <h2 id="m4" className="rf-h2 rf-h2--secondaire">
                4. Calcul des indices
              </h2>
              <p className="rf-texte rf-mt-6" style={{ fontSize: 14 }}>
                Deux dimensions séparées, jamais fusionnées.
              </p>
            </div>
            <div className="rf-carte__corps rf-grille" style={{ gap: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Indice de transparence</div>
                <p className="rf-texte rf-mt-6" style={{ fontSize: 13.5 }}>
                  Calculé uniquement sur les registres publics. Publié pour toutes les entreprises, dès la
                  création de la fiche.
                </p>
                <div className="rf-mt-14" style={{ borderTop: "1px solid var(--rf-ligne-carte)" }}>
                  {POIDS_TRANSPARENCE.map((t) => (
                    <div key={t.label} className="rf-carte__rangee" style={{ padding: "9px 0" }}>
                      <span style={{ fontSize: 13.5, color: "var(--rf-texte-2)" }}>{t.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{t.weight}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Expérience des consommateurs</div>
                <p className="rf-texte rf-mt-6" style={{ fontSize: 13.5 }}>
                  Calculé sur les seuls signalements accompagnés d’un justificatif, sur douze mois. Publié à partir de{" "}
                  {SEUIL_PUBLICATION_EXPERIENCE} dossiers accompagnés d’un justificatif ; en dessous, affiché comme « données
                  insuffisantes ».
                </p>
                <div className="rf-mt-14" style={{ borderTop: "1px solid var(--rf-ligne-carte)" }}>
                  {POIDS_EXPERIENCE.map((c) => (
                    <div key={c.label} className="rf-carte__rangee" style={{ padding: "9px 0" }}>
                      <span style={{ fontSize: 13.5, color: "var(--rf-texte-2)" }}>{c.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{c.weight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: "0 24px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
              <p className="rf-encart rf-encart--doux">
                Les signalements sans justificatif ne modifient jamais un indice. Aucune note n’est ajustée
                manuellement, dans un sens ou dans l’autre, et aucune ne peut être achetée.
              </p>
              <p className="rf-encart rf-encart--doux rf-encart--gris">
                Recalcul quotidien. L’historique des indices est conservé cinq ans et communicable sur demande à
                l’entreprise concernée.
              </p>
            </div>
          </section>

          {/* 5 */}
          <section className="rf-carte">
            <div className="rf-carte__tete" style={{ display: "block" }}>
              <h2 id="m5" className="rf-h2 rf-h2--secondaire">
                5. Calcul des statistiques publiées
              </h2>
            </div>
            {REGLES_STATISTIQUES.map((s) => (
              <div key={s.metric} style={{ padding: "16px 24px", borderBottom: "1px solid var(--rf-ligne-carte)" }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.metric}</div>
                <p className="rf-texte rf-mt-4" style={{ fontSize: 13.5 }}>
                  {s.rule}
                </p>
              </div>
            ))}
            <p className="rf-carte__pied" style={{ borderTop: 0 }}>
              Les délais sont des médianes, jamais des moyennes, afin d’éviter l’effet des cas extrêmes. Les
              bases de calcul sont affichées sous chaque indicateur, et la fenêtre est glissante sur douze mois.
            </p>
          </section>

          {/* 6 */}
          <section className="rf-carte">
            <div className="rf-carte__tete" style={{ display: "block" }}>
              <h2 id="m6" className="rf-h2 rf-h2--secondaire">
                6. Rectification et contestation
              </h2>
            </div>
            {DROITS_ET_RECTIFICATION.map((r) => (
              <div key={r.title} style={{ padding: "16px 24px", borderBottom: "1px solid var(--rf-ligne-carte)" }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.title}</div>
                <p className="rf-texte rf-mt-4" style={{ fontSize: 13.5 }}>
                  {r.desc}
                </p>
              </div>
            ))}
            <div style={{ padding: "16px 24px", display: "flex", gap: 18, flexWrap: "wrap" }}>
              <Link href="/entreprises" style={{ fontSize: 13.5, fontWeight: 600 }}>
                Trouver une fiche à corriger
              </Link>
              <Link href="/contact" style={{ fontSize: 13.5, fontWeight: 600 }}>
                Écrire à l’équipe données
              </Link>
            </div>
          </section>

          {/* 7 */}
          <section className="rf-carte rf-carte--teintee" style={{ padding: "22px 24px" }}>
            <h2 id="m7" className="rf-h2 rf-h2--secondaire" style={{ fontSize: 20 }}>
              7. Ce que la plateforme ne fait pas
            </h2>
            <ul className="rf-pile rf-pile--serree rf-mt-14" style={{ gap: 10 }}>
              {CE_QUE_LA_PLATEFORME_NE_FAIT_PAS.map((n) => (
                <li key={n} className="rf-item">
                  <span className="rf-puce rf-puce--vide" aria-hidden="true">
                    —
                  </span>
                  <span style={{ fontSize: 14, lineHeight: 1.55 }}>{n}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="rf-rail" style={{ position: "sticky", top: 24 }}>
          <nav className="rf-carte" aria-label="Sommaire">
            <div className="rf-carte__tete rf-carte__tete--simple">
              <span className="rf-etiquette">Sur cette page</span>
            </div>
            <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 9 }}>
              {SOMMAIRE.map((t) => (
                <a key={t.href} href={t.href} style={{ fontSize: 13.5, color: "var(--rf-encre)", textDecoration: "none" }}>
                  {t.libelle}
                </a>
              ))}
            </div>
          </nav>
          <div className="rf-carte rf-carte--legere" style={{ padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Une question sur un chiffre&nbsp;?</div>
            <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
              Consommateur ou entreprise, vous pouvez demander le détail du calcul appliqué à une fiche précise.
            </p>
            <p className="rf-mt-10">
              <Link href="/contact" style={{ fontSize: 13, fontWeight: 600 }}>
                Écrire à l’équipe données
              </Link>
            </p>
          </div>
          <div className="rf-carte" style={{ padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Voir la méthode appliquée</div>
            <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
              Chaque indicateur d’une fiche affiche sa base de calcul et sa source.
            </p>
            <p className="rf-mt-10">
              <Link href="/entreprises" style={{ fontSize: 13, fontWeight: 600 }}>
                Ouvrir une fiche entreprise
              </Link>
            </p>
          </div>
        </aside>
      </div>
    </Page>
  );
}
