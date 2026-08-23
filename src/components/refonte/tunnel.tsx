"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Avion, Bouclier, Cadenas, Calendrier, Camion, CercleCoche, Chaine, Chevron,
  Cle, Cloche, Coche, Document, Dossier, Enveloppe, Etiquette, Euro, Fleche,
  FlecheGauche, Horloge, Info, Oeil, Points, Rafraichir,
} from "./icones";
import {
  DATES_APPROX,
  type Famille,
  SOLUTIONS,
  dateDepuisChip,
  resumePublic,
} from "@/lib/tunnel-refonte";
import { typo } from "@/lib/typographie";
import { publierSignalement } from "@/app/signaler/actions-tunnel";

/**
 * Le parcours de dépôt — situation, vérification, réussite.
 *
 * Un seul composant, un seul état. Le handoff impose que toutes les réponses
 * survivent à un retour en arrière : avec des pages séparées il faudrait les
 * reposter à chaque aller-retour, et le moindre oubli perdrait le récit que la
 * personne vient d'écrire.
 *
 * Rien n'est écrit en base avant le dernier bouton. L'adresse électronique
 * n'est demandée qu'à l'écran de vérification, une fois que la personne a vu
 * exactement ce qui sera public.
 *
 * L'écran « Quelle entreprise ? » du handoff n'est pas ici : il ne s'affiche
 * que lorsque la cible n'est pas connue, et il vit donc sur sa propre page.
 * Depuis une fiche, on entre directement sur la situation — c'est le chemin
 * ordinaire, et lui redemander l'entreprise dont il lit la fiche serait lui
 * faire refaire ce qu'il vient de faire.
 */

type Props = {
  slug: string;
  nom: string;
  lieu: string | null;
  siren: string | null;
  familles: Famille[];
  preselection: { famille: string; categorie: string } | null;
  /** La fiche publique concernée — celle de la société, ou celle de la boutique. */
  fiche: string | null;
  /** La raison sociale, quand `nom` porte celui du site. */
  societe: string | null;
  /** Le slug de la boutique d'origine, à rendre à l'action pour le rattachement. */
  via: string | null;
};

/** L'icône de chaque famille, écrite ici et non calculée : elle est éditable. */
const ICONE_FAMILLE: Record<string, typeof Cle> = {
  prestation: Cle,
  achat: Camion,
  contrat: Document,
  autre: Points,
};

const ICONE_SOLUTION = [Cle, Euro, Etiquette, Etiquette, Points];

const RGX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function Tunnel({ slug, nom, lieu, siren, familles, preselection, fiche, societe, via }: Props) {
  const premiere = familles[0];
  const familleInitiale = preselection?.famille ?? premiere.cle;
  const defaut = familles.find((f) => f.cle === familleInitiale) ?? premiere;

  const [ecran, setEcran] = useState<2 | 3 | 4>(2);
  const [famille, setFamille] = useState(defaut.cle);
  const [categorie, setCategorie] = useState(preselection?.categorie ?? defaut.categories[0]);
  const [chipDate, setChipDate] = useState<string | null>("ce-mois");
  const [dateExacte, setDateExacte] = useState("");
  const [recit, setRecit] = useState(defaut.exemple);
  const [solution, setSolution] = useState<string>(SOLUTIONS[0]);
  const [email, setEmail] = useState("");
  const [accord, setAccord] = useState(false);
  const [tente, setTente] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [publiee, setPubliee] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, demarrer] = useTransition();

  const familleRetenue = familles.find((f) => f.cle === famille) ?? premiere;
  const emailOk = RGX_EMAIL.test(email);
  const pret = emailOk && accord;
  const blocage = !emailOk
    ? "Indiquez votre adresse électronique pour publier."
    : "Cochez la confirmation pour publier.";

  const dateLisible = dateExacte
    ? new Date(dateExacte).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : (DATES_APPROX.find((d) => d.cle === chipDate)?.libelle ?? "Ce mois-ci");

  /** Changer de famille reprend sa première catégorie et son exemple de récit. */
  function choisirFamille(f: Famille) {
    setFamille(f.cle);
    setCategorie(f.categories[0]);
    setRecit(f.exemple);
  }

  function publier() {
    if (!pret) {
      setTente(true);
      return;
    }
    setErreur(null);
    demarrer(async () => {
      const r = await publierSignalement({
        slug,
        via,
        famille,
        categorie,
        dateFaits: (dateExacte ? new Date(dateExacte) : dateDepuisChip(chipDate ?? "ce-mois")).toISOString(),
        recit,
        solution,
        email,
      });
      if ("erreur" in r) setErreur(r.erreur);
      else {
        setReference(r.reference);
        setPubliee(r.fiche);
        setEcran(4);
      }
    });
  }

  const lienPublic = publiee ?? fiche;

  async function copierLien() {
    if (!lienPublic) return;
    try {
      await navigator.clipboard.writeText(new URL(lienPublic, window.location.origin).toString());
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2500);
    } catch {
      // Le presse-papiers est refusé hors contexte sécurisé, et sur certains
      // navigateurs mobiles. Le lien reste atteignable par le bouton voisin :
      // rien à signaler, rien à réparer.
    }
  }

  return (
    <div className="rfp">
      <div className="rfp-bandeau">{typo("Plateforme privée et indépendante, sans lien avec l’État.")}</div>

      <header className="rfp-entete">
        <div className="rfp-conteneur rfp-conteneur--1000 rfp-entete__piste">
          <Link href="/" className="rfp-logo" aria-label="Recours France — accueil">
            <span className="rfp-logo__mot">
              Recours
              <em>France</em>
            </span>
            <span className="rfp-logo__barres" aria-hidden="true">
              <i style={{ width: 32, background: "var(--p-bleu)" }} />
              <i style={{ width: 24, background: "#E1000F" }} />
            </span>
          </Link>
          <Link href={fiche ?? "/"} className="rfp-quitter">
            Quitter
          </Link>
        </div>
      </header>

      <main id="contenu">
        {/* ══ Écran 2 — Votre situation ═════════════════════════════════ */}
        {ecran === 2 ? (
          <div className="rfp-conteneur rfp-conteneur--820" style={{ paddingTop: 28, paddingBottom: 8 }}>
            <div className="rfp-prog">
              <span className="rfp-prog__seg rfp-prog__seg--on" aria-current="step">
                <span className="rfp-prog__rond">1</span>
                <span className="rfp-prog__nom">{typo("1 sur 2 — Votre situation")}</span>
              </span>
              <span className="rfp-prog__seg">
                <span className="rfp-prog__rond">2</span>
                <span className="rfp-prog__nom">{typo("2 sur 2 — Vérifier et publier")}</span>
              </span>
            </div>
            <div className="rfp-prog__barres" aria-hidden="true">
              <i className="on" />
              <i />
            </div>

            <div className="rfp-encart" style={{ marginTop: 26 }}>
              <Bouclier taille={26} style={{ flex: "none", color: "var(--p-bleu)" }} />
              <div style={{ minWidth: 0 }}>
                <div className="rfp-second">Votre signalement concerne</div>
                <div style={{ fontSize: 21, fontWeight: 800, color: "var(--p-navy)", lineHeight: 1.25, marginTop: 2 }}>
                  {nom}
                </div>
                {societe || lieu || siren ? (
                  <div className="rfp-aide" style={{ marginTop: 3 }}>
                    {[societe ? `Exploité par ${societe}` : null, lieu, siren ? `SIREN ${siren}` : null]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                ) : null}
              </div>
            </div>

            <p className="rfp-second" style={{ display: "flex", gap: 9, alignItems: "center", marginTop: 14 }}>
              <Cadenas taille={17} style={{ flex: "none", color: "var(--p-bleu)" }} />
              {typo("Vous verrez exactement ce qui sera public avant de valider.")}
            </p>

            <h1 className="rfp-h1 rfp-h1--question" style={{ marginTop: 24 }}>
              {typo(`Quel problème avez-vous rencontré avec ${nom} ?`)}
            </h1>
            <p className="rfp-second" style={{ marginTop: 8 }}>
              {typo("Quelques informations suffisent pour rendre votre situation visible.")}
            </p>

            {/* ── 1 · Nature du litige ─────────────────────────────────── */}
            <section style={{ marginTop: "clamp(24px, 2.6cqw, 34px)" }}>
              <h2 className="rfp-h2--section">
                <span style={{ color: "var(--p-bleu)" }}>1</span> · Nature du litige
              </h2>

              <div className="rfp-natures" style={{ marginTop: 14 }} role="radiogroup" aria-label="Nature du litige">
                {familles.map((f) => {
                  const Icone = ICONE_FAMILLE[f.cle] ?? Points;
                  const actif = f.cle === famille;
                  return (
                    <button
                      key={f.cle}
                      type="button"
                      role="radio"
                      aria-checked={actif}
                      className="rfp-nature rfp-choix"
                      onClick={() => choisirFamille(f)}
                    >
                      {actif ? (
                        <span className="rfp-coche" aria-hidden="true">
                          <Coche taille={13} />
                        </span>
                      ) : null}
                      <span className="rfp-nature__med">
                        <Icone taille={24} />
                      </span>
                      <span className="rfp-nature__t">{typo(f.libelle)}</span>
                      {f.desc ? <span className="rfp-nature__d">{typo(f.desc)}</span> : null}
                    </button>
                  );
                })}
              </div>

              <p className="rfp-champ__label" style={{ marginTop: 22, fontSize: 16 }}>
                {typo("Précisez votre situation")}{" "}
                <span style={{ color: "var(--p-tertiaire)", fontWeight: 500 }}>— obligatoire</span>
              </p>
              <div className="rfp-chips" style={{ marginTop: 12 }} role="radiogroup" aria-label="Précisez votre situation">
                {familleRetenue.categories.map((c) => {
                  const actif = c === categorie;
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={actif}
                      className="rfp-chip rfp-choix"
                      onClick={() => setCategorie(c)}
                    >
                      {typo(c)}
                      {actif ? (
                        <span className="rfp-chip__coche" aria-hidden="true">
                          <Coche taille={12} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── 2 · Quand ────────────────────────────────────────────── */}
            <section style={{ marginTop: "clamp(24px, 2.6cqw, 34px)" }}>
              <h2 className="rfp-h2--section">
                <span style={{ color: "var(--p-bleu)" }}>2</span> ·{" "}
                {typo("Quand le problème s’est-il produit ?")}
              </h2>

              <div className="rfp-chips" style={{ marginTop: 14 }} role="radiogroup" aria-label="Période">
                {DATES_APPROX.map((d) => {
                  const actif = !dateExacte && chipDate === d.cle;
                  return (
                    <button
                      key={d.cle}
                      type="button"
                      role="radio"
                      aria-checked={actif}
                      className="rfp-chip rfp-choix"
                      onClick={() => {
                        setChipDate(d.cle);
                        setDateExacte("");
                      }}
                    >
                      {typo(d.libelle)}
                      {actif ? (
                        <span className="rfp-chip__coche" aria-hidden="true">
                          <Coche taille={12} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="rfp-champ rfp-date rfp-champ__enveloppe" style={{ marginTop: 14 }}>
                <Calendrier taille={19} />
                <input
                  type="date"
                  className="rfp-input rfp-input--icone"
                  style={{ marginTop: 0 }}
                  aria-label="Date précise du problème"
                  value={dateExacte}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => {
                    setDateExacte(e.target.value);
                    if (e.target.value) setChipDate(null);
                  }}
                />
                {/* `type=date` ignore `placeholder` : le calque le remplace, et
                    disparaît dès qu'une valeur existe. */}
                {!dateExacte ? <span className="rfp-date__vide">{typo("Sélectionnez une date")}</span> : null}
              </div>
            </section>

            {/* ── 3 · Que s'est-il passé ? ─────────────────────────────── */}
            <section style={{ marginTop: "clamp(24px, 2.6cqw, 34px)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                <h2 className="rfp-h2--section">
                  <span style={{ color: "var(--p-bleu)" }}>3</span> · {typo("Que s’est-il passé ?")}
                </h2>
                <span className="rfp-badge-conf">
                  <Cadenas taille={12} />
                  Confidentiel
                </span>
              </div>
              <p className="rfp-aide" style={{ marginTop: 6 }}>
                {typo("Décrivez les faits librement. Votre récit complet ne sera pas publié.")}
              </p>
              <textarea
                rows={5}
                className="rfp-zone"
                aria-label="Description des faits"
                value={recit}
                onChange={(e) => setRecit(e.target.value)}
              />
              <div className="rfp-encart" style={{ marginTop: 14 }}>
                <Info taille={22} style={{ flex: "none", color: "var(--p-bleu)" }} />
                <div>
                  <p>{typo("À l’étape suivante, Recours France générera un résumé public factuel.")}</p>
                  <p style={{ marginTop: 4 }}>{typo("Vous pourrez le modifier avant publication.")}</p>
                </div>
              </div>
            </section>

            {/* ── 4 · Quelle solution ? ────────────────────────────────── */}
            <section style={{ marginTop: "clamp(24px, 2.6cqw, 34px)" }}>
              <h2 className="rfp-h2--section">
                <span style={{ color: "var(--p-bleu)" }}>4</span> ·{" "}
                {typo("Quelle solution souhaitez-vous ?")}
              </h2>
              <div className="rfp-solutions" style={{ marginTop: 14 }} role="radiogroup" aria-label="Solution souhaitée">
                {SOLUTIONS.map((s, i) => {
                  const Icone = ICONE_SOLUTION[i] ?? Points;
                  const actif = s === solution;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={actif}
                      className="rfp-solution rfp-choix"
                      onClick={() => setSolution(s)}
                    >
                      <span className="rfp-radio" aria-hidden="true">
                        <i />
                      </span>
                      <span className="rfp-solution__med" aria-hidden="true">
                        <Icone taille={18} />
                      </span>
                      <span className="rfp-solution__t">{typo(s)}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div style={{ marginTop: 28 }}>
              <button type="button" className="rfp-btn" onClick={() => setEcran(3)}>
                {typo("Prévisualiser mon litige")}
                <Fleche taille={19} />
              </button>
              <p className="rfp-aide" style={{ marginTop: 12, textAlign: "center" }}>
                {typo("Étape suivante : vérifiez exactement ce qui sera rendu public.")}
              </p>
            </div>
          </div>
        ) : null}

        {/* ══ Écran 3 — Vérifier et publier ═════════════════════════════ */}
        {ecran === 3 ? (
          <div className="rfp-conteneur rfp-conteneur--820" style={{ paddingTop: 28 }}>
            <div className="rfp-verif">
              <span className="rfp-verif__seg">
                <span className="rfp-verif__rond">
                  <Coche taille={15} />
                </span>
                <span className="rfp-verif__nom">{typo("1 sur 2 — Votre situation")}</span>
              </span>
              <span className="rfp-verif__trait" aria-hidden="true" />
              <span className="rfp-verif__seg rfp-verif__seg--on" aria-current="step">
                <span className="rfp-verif__rond">2</span>
                <span className="rfp-verif__nom">{typo("2 sur 2 — Vérifier et publier")}</span>
              </span>
            </div>

            <h1 className="rfp-h1 rfp-h1--verif" style={{ marginTop: 26 }}>
              {typo("Vérifiez ce qui sera publié")}
            </h1>
            <p className="rfp-sous" style={{ marginTop: 10 }}>
              {typo(`Après votre validation, le litige sera immédiatement visible sur la fiche de ${nom}.`)}
            </p>

            {/* ── Aperçu du litige public ──────────────────────────────── */}
            <div className="rfp-eyebrow" style={{ marginTop: 28 }}>
              {typo("Aperçu du litige public")}
            </div>
            <div className="rfp-carte" style={{ marginTop: 10 }}>
              <div className="rfp-apercu__tete">
                <span className="rfp-pilule">{typo(categorie)}</span>
                <span className="rfp-second" style={{ marginLeft: "auto" }}>
                  {dateLisible}
                </span>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                <p className="rfp-apercu__ligne">
                  <Cle taille={18} />
                  <span>
                    <strong>{typo("Solution demandée :")}</strong> {typo(solution)}
                  </span>
                </p>
                <p className="rfp-apercu__ligne">
                  <Horloge taille={18} style={{ color: "var(--p-ambre)" }} />
                  <span>
                    <strong>{typo("Statut :")}</strong>{" "}
                    <span style={{ color: "var(--p-ambre)", fontWeight: 600 }}>
                      {typo("En attente de solution")}
                    </span>
                  </span>
                </p>
              </div>

              <hr style={{ border: 0, borderTop: "1px solid var(--p-filet)", margin: "18px 0" }} />

              <div className="rfp-h3">{typo("Résumé public")}</div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {resumePublic(famille, categorie, solution).map((phrase) => (
                  <p key={phrase} className="rfp-texte">
                    {typo(phrase)}
                  </p>
                ))}
              </div>

              <button
                type="button"
                className="rfp-btn rfp-btn--contour rfp-btn--auto"
                style={{ marginTop: 18 }}
                onClick={() => setEcran(2)}
              >
                {typo("Modifier le résumé public")}
              </button>
            </div>

            {/* ── Public / confidentiel ────────────────────────────────── */}
            <div className="rfp-colonnes" style={{ marginTop: 20 }}>
              <div className="rfp-colonne rfp-colonne--public">
                <div className="rfp-colonne__t">
                  <Oeil taille={17} style={{ color: "var(--p-vert)" }} />
                  {typo("Sera visible publiquement")}
                </div>
                <ul>
                  {["Catégorie", "Période", "Résumé factuel", "Solution demandée", "Statut et mises à jour"].map((t) => (
                    <li key={t}>
                      <CercleCoche taille={17} style={{ color: "var(--p-vert)" }} />
                      {typo(t)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rfp-colonne rfp-colonne--prive">
                <div className="rfp-colonne__t">
                  <Cadenas taille={17} style={{ color: "var(--p-bleu)" }} />
                  {typo("Restera confidentiel")}
                </div>
                <ul>
                  {["Récit détaillé", "Adresse électronique", "Identité réelle", "Références et justificatifs"].map(
                    (t) => (
                      <li key={t}>
                        <Cadenas taille={16} style={{ color: "var(--p-bleu)" }} />
                        {typo(t)}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>

            {/* ── L'entreprise pourra être informée ────────────────────── */}
            <div className="rfp-encart" style={{ marginTop: 20, alignItems: "flex-start" }}>
              <span className="rfp-medaillon rfp-medaillon--plein" style={{ width: 44, height: 44 }}>
                <Cloche taille={21} />
              </span>
              <div>
                <div className="rfp-encart__titre" style={{ color: "var(--p-bleu)" }}>
                  {typo("L’entreprise pourra être informée")}
                </div>
                <p style={{ marginTop: 6 }}>
                  {typo(
                    "Après publication, Recours France transmettra le lien du litige si une adresse professionnelle vérifiée est disponible.",
                  )}
                </p>
                <p style={{ marginTop: 4 }}>{typo("Vos coordonnées personnelles ne seront pas communiquées.")}</p>
                <p style={{ marginTop: 4 }}>{typo("Une réponse ou une résolution ne peut pas être garantie.")}</p>
              </div>
            </div>

            {/* ── Adresse électronique ─────────────────────────────────── */}
            <div className="rfp-champ" style={{ marginTop: 26 }}>
              <label className="rfp-champ__label" htmlFor="rfp-email">
                {typo("Votre adresse électronique")}
              </label>
              <div className="rfp-champ__enveloppe">
                <Enveloppe taille={19} />
                <input
                  id="rfp-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="rfp-input rfp-input--icone"
                  placeholder="vous@exemple.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <span className="rfp-champ__aide" style={{ marginTop: 8 }}>
                {typo("Aucun compte ni mot de passe. Vous recevrez un lien sécurisé pour suivre votre dossier.")}
              </span>
            </div>

            {/* ── Confirmation ─────────────────────────────────────────── */}
            <label className="rfp-confirme" style={{ marginTop: 18 }}>
              <input
                type="checkbox"
                checked={accord}
                onChange={(e) => setAccord(e.target.checked)}
                aria-describedby={tente && !pret ? "rfp-blocage" : undefined}
              />
              <span className="rfp-confirme__case" aria-hidden="true">
                <Coche taille={14} />
              </span>
              <span>
                {typo("Je confirme que les informations correspondent à mon expérience et j’accepte les ")}
                <Link href="/charte-de-moderation" target="_blank">
                  {typo("règles de publication")}
                </Link>
                .
              </span>
            </label>

            <div className="rfp-carte" style={{ marginTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  className="rfp-medaillon"
                  style={{ width: 34, height: 34, background: "#fff", border: "2px solid var(--p-vert)", color: "var(--p-vert)" }}
                >
                  <Coche taille={16} />
                </span>
                <div className="rfp-h3">{typo("Après publication")}</div>
              </div>
              <ul style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {[
                  "Votre litige devient visible immédiatement",
                  "L’entreprise peut être alertée par Recours France",
                  "Vous pouvez préparer votre courrier et poursuivre vos démarches",
                ].map((t) => (
                  <li key={t} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 15.5, color: "var(--p-texte)" }}>
                    <CercleCoche taille={18} style={{ flex: "none", color: "var(--p-vert)" }} />
                    {typo(t)}
                  </li>
                ))}
              </ul>
            </div>

            {erreur ? (
              <div className="rfp-blocage" role="alert" style={{ marginTop: 16 }}>
                <Info taille={17} />
                {typo(erreur)}
              </div>
            ) : null}

            <div style={{ marginTop: 22 }}>
              {/* Le bouton reste bleu en permanence : un bouton grisé ne dit
                  jamais ce qui manque, et le visiteur relit tout le formulaire
                  pour le deviner. Le message le lui dit. */}
              <button type="button" className="rfp-btn rfp-btn--60" onClick={publier} disabled={envoi}>
                <Avion taille={20} />
                {envoi ? typo("Publication…") : typo("Publier mon litige")}
              </button>
              {tente && !pret ? (
                <div className="rfp-blocage" id="rfp-blocage" role="alert">
                  <Info taille={17} />
                  {typo(blocage)}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="rfp-btn rfp-btn--contour"
              style={{ marginTop: 12 }}
              onClick={() => setEcran(2)}
            >
              <FlecheGauche taille={18} />
              {typo("Revenir à l’étape précédente")}
            </button>
          </div>
        ) : null}

        {/* ══ Écran 4 — Votre litige est en ligne ═══════════════════════ */}
        {ecran === 4 ? (
          <div className="rfp-conteneur rfp-conteneur--900" style={{ paddingTop: 34 }}>
            <div className="rfp-succes__rond">
              <Coche taille={32} />
            </div>
            <h1 className="rfp-h1 rfp-h1--fin" style={{ marginTop: 20 }}>
              {typo("Votre litige est en ligne")}
            </h1>
            <p className="rfp-sous" style={{ marginTop: 10 }}>
              {typo(`Il est maintenant visible sur la fiche de ${nom}.`)}
            </p>

            <div
              style={{
                display: "flex", flexWrap: "wrap", gap: 12,
                justifyContent: "center", marginTop: 24,
              }}
            >
              {lienPublic ? (
                <Link href={lienPublic} className="rfp-btn rfp-btn--auto" style={{ minWidth: 240 }}>
                  {typo("Voir mon litige public")}
                </Link>
              ) : null}
              {lienPublic ? (
                <button type="button" className="rfp-btn rfp-btn--contour rfp-btn--auto" onClick={copierLien}>
                  <Chaine taille={18} />
                  {copie ? typo("Lien copié") : typo("Copier le lien")}
                </button>
              ) : null}
            </div>

            <ol className="rfp-suivi" style={{ marginTop: 32, maxWidth: 420, marginInline: "auto" }}>
              <li className="rfp-suivi__etape rfp-suivi__etape--fait">
                <span className="rfp-suivi__rond">
                  <Coche taille={16} />
                </span>
                <span className="rfp-suivi__nom">{typo("Publié")}</span>
              </li>
              <li className="rfp-suivi__trait rfp-suivi__trait--fait" aria-hidden="true" />
              <li className="rfp-suivi__etape rfp-suivi__etape--actif" aria-current="step">
                <span className="rfp-suivi__rond">2</span>
                <span className="rfp-suivi__nom">{typo("Alerte entreprise")}</span>
              </li>
              <li className="rfp-suivi__trait" aria-hidden="true" />
              <li className="rfp-suivi__etape">
                <span className="rfp-suivi__rond">3</span>
                <span className="rfp-suivi__nom">{typo("Démarches")}</span>
              </li>
            </ol>

            <div className="rfp-colonnes" style={{ marginTop: 26 }}>
              <div className="rfp-carte" style={{ padding: 22 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  <span className="rfp-medaillon" style={{ width: 34, height: 34 }}>
                    <Cloche taille={17} />
                  </span>
                  <div className="rfp-h3">{typo("Alerte de l’entreprise")}</div>
                  <span className="rfp-chip-cours">En cours</span>
                </div>
                <p className="rfp-second" style={{ marginTop: 12 }}>
                  {typo(
                    "Nous recherchons une adresse professionnelle vérifiée pour transmettre le lien de votre litige.",
                  )}
                </p>
                <hr style={{ border: 0, borderTop: "1px solid var(--p-filet)", margin: "14px 0" }} />
                <p className="rfp-aide" style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <Cadenas taille={16} style={{ flex: "none", color: "var(--p-bleu)" }} />
                  {typo("Vos coordonnées personnelles ne seront pas communiquées.")}
                </p>
              </div>

              <div className="rfp-carte" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="rfp-medaillon" style={{ width: 34, height: 34 }}>
                    <Bouclier taille={17} />
                  </span>
                  <div className="rfp-h3">{typo("Votre accès sécurisé")}</div>
                </div>
                <p className="rfp-second" style={{ marginTop: 12 }}>
                  {typo("Un lien vient de vous être envoyé par e-mail pour retrouver et modifier votre dossier.")}
                </p>
                {reference ? (
                  <p className="rfp-aide" style={{ marginTop: 10 }}>
                    {typo(`Référence : ${reference}`)}
                  </p>
                ) : null}
              </div>
            </div>

            {/* ── Prochaine étape ──────────────────────────────────────── */}
            <div className="rfp-prochaine" style={{ marginTop: 24 }}>
              <div className="rfp-prochaine__texte">
                <div className="rfp-eyebrow" style={{ color: "var(--p-bleu)" }}>
                  {typo("Prochaine étape")}
                </div>
                <h2 className="rfp-h2" style={{ marginTop: 8 }}>
                  {typo("Préparez votre réclamation écrite")}
                </h2>
                <p className="rfp-texte" style={{ marginTop: 10 }}>
                  {typo(
                    "À partir des faits déjà renseignés, obtenez un courrier adapté et les prochaines démarches à suivre.",
                  )}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginTop: 18 }}>
                  <Link href="/mon-espace" className="rfp-btn rfp-btn--auto">
                    {typo("Préparer mon courrier")}
                  </Link>
                  <Link href={lienPublic ?? "/"} style={{ fontSize: 15, fontWeight: 600, textDecoration: "underline" }}>
                    {typo("Je le ferai plus tard")}
                  </Link>
                </div>
              </div>
              <div className="rfp-prochaine__image" aria-hidden="true">
                <Illustration />
              </div>
            </div>

            <div className="rfp-colonnes" style={{ marginTop: 20 }}>
              {[
                { t: "Ajouter mes justificatifs", i: Dossier },
                { t: "Suivre mes échéances", i: Calendrier },
                { t: "Mettre à jour le statut", i: Rafraichir },
              ].map((a) => {
                const Icone = a.i;
                return (
                  <Link key={a.t} href="/mon-espace" className="rfp-action">
                    <span className="rfp-action__med">
                      <Icone taille={19} />
                    </span>
                    {typo(a.t)}
                    <Chevron taille={18} className="rfp-action__chev" style={{ transform: "rotate(-90deg)" }} />
                  </Link>
                );
              })}
            </div>

            <div className="rfp-bandeau-vert" style={{ marginTop: 20 }}>
              <CercleCoche taille={19} />
              {typo("Vous gardez le contrôle sur votre signalement et pouvez le mettre à jour à tout moment.")}
            </div>
          </div>
        ) : null}
      </main>

      <footer className="rfp-pied">
        <div className="rfp-conteneur rfp-conteneur--1000 rfp-pied__piste">
          <span>{typo("Recours France • Plateforme privée et indépendante")}</span>
          <nav className="rfp-pied__liens">
            <Link href="/a-propos">{typo("À propos")}</Link>
            <Link href="/methodologie">Fonctionnement</Link>
            <Link href="/charte-de-moderation">{typo("Règles de publication")}</Link>
            <Link href="/donnees-personnelles">{typo("Confidentialité")}</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** La seule illustration du parcours : une page, une enveloppe, un cercle. */
function Illustration() {
  return (
    <svg width="220" height="200" viewBox="0 0 220 200" fill="none" aria-hidden="true" focusable="false">
      <circle cx="110" cy="100" r="75" fill="var(--p-pale-cercle)" />
      <rect x="56" y="34" width="108" height="132" rx="7" fill="#fff" stroke="var(--p-bord)" strokeWidth="2" />
      <rect x="74" y="56" width="52" height="7" rx="3.5" fill="var(--p-bleu)" />
      <rect x="74" y="70" width="34" height="7" rx="3.5" fill="var(--p-bleu)" />
      {[92, 104, 116, 128, 140].map((y) => (
        <rect key={y} x="74" y={y} width={y === 140 ? 44 : 72} height="4" rx="2" fill="var(--p-pale-trait)" />
      ))}
      <rect x="112" y="112" width="90" height="62" rx="6" fill="var(--p-bleu)" />
      <path d="M112 118l45 30 45-30" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
