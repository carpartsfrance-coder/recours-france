"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bouclier, Cadenas, Chevron, Coche, Enveloppe, Fleche, Oeil } from "./icones";
import {
  DATES_APPROX,
  type Famille,
  SOLUTIONS,
  dateDepuisChip,
} from "@/lib/tunnel-refonte";
import { publierSignalement } from "@/app/signaler/actions-tunnel";

/**
 * Le tunnel de signalement — deux étapes, puis la réussite.
 *
 * Un seul composant, un seul état. Le handoff impose que toutes les réponses
 * survivent à un retour en arrière depuis l'étape 2 : avec des pages séparées
 * il faudrait les reposter à chaque aller-retour, et le moindre oubli perdrait
 * le récit que la personne vient d'écrire.
 *
 * Rien n'est écrit en base avant le dernier bouton. L'adresse électronique
 * n'est demandée qu'à l'étape 2, une fois que la personne a vu exactement ce
 * qui sera public.
 */

type Props = {
  slug: string;
  nom: string;
  lieu: string | null;
  siren: string | null;
  familles: Famille[];
  preselection: { famille: string; categorie: string } | null;
  /**
   * La fiche publique concernée — celle de la société, ou celle de la boutique.
   *
   * Le tunnel supposait jusqu'ici que le slug d'URL était celui d'une
   * entreprise. Pour une cible libre il vaut « autre », et les trois liens de
   * sortie menaient à `/entreprises/autre` : « Quitter », « Je continuerai plus
   * tard » et surtout « Voir mon signalement public », le seul que l'auteur ait
   * envie de suivre à cet instant. Tous en 404.
   *
   * Nul quand rien de public n'existe encore : une saisie libre sans domaine
   * reconnaissable n'a pas de fiche où aller voir.
   */
  fiche: string | null;
};

export function Tunnel({ slug, nom, lieu, siren, familles, preselection, fiche }: Props) {
  const [ecran, setEcran] = useState<1 | 2 | 3>(1);
  const [famille, setFamille] = useState<string | null>(preselection?.famille ?? null);
  const [categorie, setCategorie] = useState<string | null>(preselection?.categorie ?? null);
  const [modifieFamille, setModifieFamille] = useState(false);
  const [chipDate, setChipDate] = useState<string | null>("ce-mois");
  const [dateExacte, setDateExacte] = useState("");
  const [recit, setRecit] = useState("");
  const [solution, setSolution] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [accord, setAccord] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [publiee, setPubliee] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, demarrer] = useTransition();

  const familleRetenue = familles.find((f) => f.cle === famille) ?? null;
  const emailValide = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const pretAPublier = Boolean(categorie && recit.trim() && solution && emailValide && accord);
  const presentee = preselection && !modifieFamille;

  function choisirFamille(cle: string) {
    setFamille(cle);
    // Changer de famille remet la catégorie à zéro : garder l'ancienne
    // afficherait un choix qui n'existe plus dans la nouvelle liste.
    setCategorie(null);
  }

  function publier() {
    setErreur(null);
    demarrer(async () => {
      const r = await publierSignalement({
        slug,
        famille: famille ?? "autre",
        categorie: categorie ?? "",
        dateFaits: (dateExacte ? new Date(dateExacte) : dateDepuisChip(chipDate ?? "ce-mois")).toISOString(),
        recit,
        solution: solution ?? "",
        email,
      });
      if ("erreur" in r) setErreur(r.erreur);
      else {
        setReference(r.reference);
        setPubliee(r.fiche);
        setEcran(3);
      }
    });
  }

  const dateLisible = dateExacte
    ? new Date(dateExacte).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : (DATES_APPROX.find((d) => d.cle === chipDate)?.libelle ?? "Ce mois-ci");

  return (
    <div className="rfn rfn-tunnel">
      {/* ── En-tête du parcours ───────────────────────────────────────── */}
      <header className="rfn-tunnel__tete">
        <div className="rfn-conteneur rfn-conteneur--etroit">
          <div className="rfn-tunnel__marque">
            <span style={{ fontWeight: 800, color: "var(--rf-cobalt-fonce)" }}>Recours France</span>
            <Link href={fiche ?? "/"} className="rfn-tunnel__quitter">
              Quitter
            </Link>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="rfn-mention">Votre signalement concerne</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--rf-cobalt-fonce)", marginTop: 2 }}>
              {nom}
            </div>
            {lieu || siren ? (
              <div className="rfn-second" style={{ marginTop: 2 }}>
                {[lieu, siren ? `SIREN ${siren}` : null].filter(Boolean).join(" · ")}
              </div>
            ) : null}
          </div>

          {ecran < 3 ? (
            <>
              <div className="rfn-progression">
                {[
                  { n: 1, libelle: "Votre situation" },
                  { n: 2, libelle: "Vérifier et publier" },
                ].map((e) => {
                  const etat = ecran === e.n ? "actif" : ecran > e.n ? "franchi" : "inactif";
                  return (
                    <div key={e.n} className={`rfn-progression__seg rfn-progression__seg--${etat}`}>
                      <span>
                        {e.n} sur 2 — {e.libelle}
                      </span>
                      {etat === "franchi" ? <Coche taille={15} style={{ color: "var(--rf-succes)" }} /> : null}
                    </div>
                  );
                })}
              </div>
              <div className="rfn-tunnel__gage">
                <Bouclier taille={17} />
                Vous gardez le contrôle : vous verrez exactement ce qui sera public avant de valider.
              </div>
            </>
          ) : null}
        </div>
      </header>

      <div className="rfn-conteneur rfn-conteneur--etroit" style={{ paddingBlock: "clamp(22px, 2.4cqw, 34px) 90px" }}>
        {/* ══ Étape 1 ═══════════════════════════════════════════════════ */}
        {ecran === 1 ? (
          <>
            <h1 className="rfn-h1 rfn-h1--tunnel">Quel problème avez-vous rencontré avec {nom} ?</h1>
            <p className="rfn-texte" style={{ marginTop: 10 }}>
              Quelques informations suffisent pour rendre votre situation visible.
            </p>

            <div style={{ display: "grid", gap: 14, marginTop: 22 }}>
              {/* 1 — Nature du litige */}
              <section className="rfn-carte">
                <TitreNumerote n={1} titre="Nature du litige" />

                {presentee ? (
                  <div className="rfn-repris">
                    <Coche taille={18} style={{ color: "var(--rf-cobalt)", flex: "none" }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "var(--rf-cobalt-fonce)" }}>{categorie}</div>
                      <div className="rfn-mention" style={{ marginTop: 2 }}>
                        Repris de votre choix sur la fiche {nom}.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rfn-btn rfn-btn--2"
                      style={{ marginLeft: "auto", minHeight: 40, fontSize: 14.5, padding: "0 14px" }}
                      onClick={() => setModifieFamille(true)}
                    >
                      Modifier
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="rfn-familles">
                      {familles.map((f) => (
                        <button
                          key={f.cle}
                          type="button"
                          onClick={() => choisirFamille(f.cle)}
                          aria-pressed={famille === f.cle}
                          className={`rfn-famille${famille === f.cle ? " rfn-famille--active" : ""}`}
                        >
                          <span className="rfn-famille__titre">{f.libelle}</span>
                          <span className="rfn-famille__desc">{f.desc}</span>
                        </button>
                      ))}
                    </div>

                    {familleRetenue ? (
                      <div style={{ marginTop: 18 }}>
                        <div className="rfn-h3" style={{ fontSize: 15.5 }}>
                          Précisez votre situation
                        </div>
                        <div className="rfn-chips" style={{ marginTop: 10 }}>
                          {familleRetenue.categories.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setCategorie(c)}
                              aria-pressed={categorie === c}
                              className={`rfn-option${categorie === c ? " rfn-option--active" : ""}`}
                            >
                              {categorie === c ? <Coche taille={14} /> : null}
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </section>

              {/* 2 — Quand */}
              <section className="rfn-carte">
                <TitreNumerote n={2} titre="Quand le problème s’est-il produit ?" />
                <p className="rfn-second" style={{ marginTop: 4 }}>
                  Une date approximative suffit.
                </p>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 12 }}
                >
                  {DATES_APPROX.map((d) => (
                    <button
                      key={d.cle}
                      type="button"
                      onClick={() => {
                        setChipDate(d.cle);
                        setDateExacte("");
                      }}
                      aria-pressed={chipDate === d.cle && !dateExacte}
                      className={`rfn-option${chipDate === d.cle && !dateExacte ? " rfn-option--active" : ""}`}
                    >
                      {chipDate === d.cle && !dateExacte ? <Coche taille={14} /> : null}
                      {d.libelle}
                    </button>
                  ))}
                  <span className="rfn-second">ou</span>
                  <input
                    type="date"
                    aria-label="Date précise du problème"
                    value={dateExacte}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => {
                      setDateExacte(e.target.value);
                      if (e.target.value) setChipDate(null);
                    }}
                    className="rfn-input"
                    style={{ maxWidth: 190 }}
                  />
                </div>
              </section>

              {/* 3 — Que s'est-il passé */}
              <section className="rfn-carte">
                <TitreNumerote
                  n={3}
                  titre="Que s’est-il passé ?"
                  marque={<span className="rfn-chip">Non publié</span>}
                />
                <p className="rfn-second" style={{ marginTop: 4 }}>
                  Décrivez simplement les faits. Ce texte n’est pas publié : il sert à rédiger votre
                  réclamation et, si nécessaire, votre mise en demeure.
                </p>
                <textarea
                  rows={5}
                  value={recit}
                  onChange={(e) => setRecit(e.target.value)}
                  aria-label="Description des faits"
                  placeholder={familleRetenue?.exemple ?? FAMILLE_PAR_DEFAUT}
                  className="rfn-input"
                  style={{ width: "100%", marginTop: 12, resize: "vertical", lineHeight: 1.55 }}
                />
                <div
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 8 }}
                >
                  <span className="rfn-mention">Trois ou quatre phrases suffisent.</span>
                  <span className="rfn-mention">{recit.length} caractères</span>
                </div>
              </section>

              {/* 4 — Solution souhaitée */}
              <section className="rfn-carte">
                <TitreNumerote n={4} titre="Quelle solution souhaitez-vous obtenir ?" />
                <div className="rfn-chips" style={{ marginTop: 12 }}>
                  {SOLUTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSolution(s)}
                      aria-pressed={solution === s}
                      className={`rfn-option${solution === s ? " rfn-option--active" : ""}`}
                    >
                      {solution === s ? <Coche taille={14} /> : null}
                      {s}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="rfn-tunnel__pied">
              <button
                type="button"
                className="rfn-btn"
                onClick={() => setEcran(2)}
                disabled={!categorie || !recit.trim() || !solution}
              >
                Prévisualiser mon signalement
                <Fleche taille={18} />
              </button>
              <p className="rfn-mention" style={{ marginTop: 10 }}>
                Étape suivante : vous vérifiez exactement ce qui sera rendu public.
              </p>
            </div>
          </>
        ) : null}

        {/* ══ Étape 2 ═══════════════════════════════════════════════════ */}
        {ecran === 2 ? (
          <>
            <h1 className="rfn-h1 rfn-h1--tunnel">Vérifiez votre signalement avant sa publication</h1>
            <p className="rfn-texte" style={{ marginTop: 10 }}>
              Après votre validation, il sera immédiatement visible sur la fiche de {nom}.
            </p>

            <div className="rfn-eyebrow" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
              <Oeil taille={16} />
              Aperçu de la carte publique
            </div>

            <article className="rfn-carte" style={{ marginTop: 10 }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div className="rfn-chips">
                  <span className="rfn-chip rfn-chip--bleu">{categorie}</span>
                  <span className="rfn-chip">Déclaré</span>
                </div>
                <span className="rfn-mention">{dateLisible}</span>
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="rfn-def">
                  <span className="rfn-def__k">Solution demandée</span>
                  <span className="rfn-def__v">{solution}</span>
                </div>
                <div className="rfn-def">
                  <span className="rfn-def__k">Statut</span>
                  <span className="rfn-def__v">En attente de solution</span>
                </div>
              </div>
              <p className="rfn-mention" style={{ marginTop: 12 }}>
                Déclaration d’un consommateur. Votre description détaillée des faits n’apparaît pas
                sur la fiche : elle sert uniquement à rédiger vos courriers.
              </p>
              <div className="rfn-btns" style={{ marginTop: 14 }}>
                <button type="button" className="rfn-btn rfn-btn--2" onClick={() => { setModifieFamille(true); setEcran(1); }}>
                  Modifier la catégorie
                </button>
                <button type="button" className="rfn-btn rfn-btn--2" onClick={() => setEcran(1)}>
                  Modifier la date
                </button>
                <button type="button" className="rfn-btn rfn-btn--2" onClick={() => setEcran(1)}>
                  Modifier la solution
                </button>
              </div>
            </article>

            <div className="rfn-grille" style={{ marginTop: 22, gridTemplateColumns: "repeat(auto-fit, minmax(268px, 1fr))" }}>
              <div className="rfn-carte">
                <div className="rfn-eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Oeil taille={16} />
                  Sera visible publiquement
                </div>
                <ul style={{ marginTop: 12, display: "grid", gap: 7 }}>
                  {["Catégorie du problème", "Date ou période", "Solution demandée", "Statut du litige"].map((t) => (
                    <li key={t} className="rfn-second">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rfn-carte" style={{ background: "var(--rf-fond-leger)" }}>
                <div className="rfn-eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Cadenas taille={16} />
                  Restera confidentiel
                </div>
                <ul style={{ marginTop: 12, display: "grid", gap: 7 }}>
                  {[
                    "Votre description des faits, utilisée pour rédiger vos courriers",
                    "Votre adresse électronique",
                    "Votre identité réelle",
                    "Les informations et justificatifs ajoutés ultérieurement",
                  ].map((t) => (
                    <li key={t} className="rfn-second">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <section className="rfn-carte" style={{ marginTop: 14 }}>
              <div className="rfn-h3">Votre adresse électronique</div>
              <p className="rfn-second" style={{ marginTop: 6 }}>
                Votre e-mail restera confidentiel. Il vous permettra de modifier votre signalement et
                de poursuivre vos démarches.
              </p>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-label="Votre adresse électronique"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                className="rfn-input"
                style={{ width: "100%", marginTop: 12 }}
              />
              <p className="rfn-mention" style={{ marginTop: 8 }}>
                Aucun mot de passe, aucun compte à créer. Un lien sécurisé vous sera envoyé pour
                retrouver votre dossier.
              </p>
            </section>

            <label className="rfn-accord">
              <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} />
              <span>
                Je confirme que ce récit correspond à mon expérience et j’accepte les règles de
                publication.
              </span>
            </label>
            <p className="rfn-mention" style={{ marginTop: 6 }}>
              <Link href="/charte-de-moderation">Lire les règles de publication</Link>
            </p>

            {erreur ? (
              <p className="rfn-second" style={{ marginTop: 14, color: "var(--rf-erreur)" }}>
                {erreur}
              </p>
            ) : null}

            <div className="rfn-tunnel__pied">
              <div className="rfn-btns" style={{ alignItems: "center" }}>
                <button type="button" className="rfn-btn" onClick={publier} disabled={!pretAPublier || envoi}>
                  {envoi ? "Publication…" : "Publier mon signalement"}
                </button>
                <button
                  type="button"
                  onClick={() => setEcran(1)}
                  className="rfn-lien-nu"
                >
                  Revenir à l’étape 1
                </button>
              </div>
              <p className="rfn-mention" style={{ marginTop: 10 }}>
                {pretAPublier
                  ? `Publication immédiate sur la fiche de ${nom}`
                  : !emailValide
                    ? "Indiquez votre adresse électronique pour publier."
                    : "Cochez la confirmation pour publier."}
              </p>
            </div>
          </>
        ) : null}

        {/* ══ Réussite ══════════════════════════════════════════════════ */}
        {ecran === 3 && reference ? (
          <div style={{ paddingTop: 12 }}>
            <span className="rfn-pastille-succes">
              <Coche taille={26} />
            </span>
            <h1 className="rfn-h1 rfn-h1--tunnel" style={{ marginTop: 18 }}>
              Votre signalement est maintenant public
            </h1>
            <p className="rfn-texte" style={{ marginTop: 10 }}>
              Il est visible sur la fiche de {nom}. Vous pouvez le modifier, l’actualiser ou indiquer
              ultérieurement si votre problème a été résolu.
            </p>

            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(258px, 1fr))",
                marginTop: 24,
              }}
            >
              {publiee ?? fiche ? (
                <Link href={publiee ?? fiche ?? "/"} className="rfn-btn rfn-action">
                  Voir mon signalement public
                </Link>
              ) : null}
              {[
                { t: "Préparer ma réclamation", d: "Quelques informations complémentaires" },
                { t: "Découvrir mes prochaines démarches", d: "Les étapes dans l’ordre, selon votre cas" },
                { t: "Ajouter des justificatifs confidentiels", d: "Jamais publiés sur la fiche" },
              ].map((a) => (
                <Link key={a.t} href="/mon-espace" className="rfn-carte rfn-action">
                  <span style={{ fontWeight: 700, color: "var(--rf-cobalt-fonce)" }}>{a.t}</span>
                  <span className="rfn-mention" style={{ display: "block", marginTop: 3 }}>
                    {a.d}
                  </span>
                </Link>
              ))}
            </div>

            <div className="rfn-beige" style={{ marginTop: 20 }}>
              <Enveloppe taille={18} />
              <span>
                Un lien sécurisé vient de vous être envoyé à {email}. Il vous permet de retrouver
                votre dossier à tout moment, sans mot de passe. Votre référence : {reference}.
              </span>
            </div>

            <p className="rfn-mention" style={{ marginTop: 16 }}>
              <Link href={fiche ?? "/"}>Je continuerai plus tard</Link>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const FAMILLE_PAR_DEFAUT =
  "Décrivez les faits : ce que vous avez demandé à l’entreprise, ce qui s’est passé, et ce que vous avez tenté depuis.";

function TitreNumerote({ n, titre, marque }: { n: number; titre: string; marque?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--rf-cobalt)" }}>{n}</span>
      <span style={{ fontSize: 17, fontWeight: 700, color: "var(--rf-cobalt-fonce)" }}>{titre}</span>
      {marque}
    </div>
  );
}
