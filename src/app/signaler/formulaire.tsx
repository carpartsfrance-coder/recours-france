"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { deposerSignalement, type EtatFormulaire } from "./actions";
import { ChampErreur, ItemCoche } from "@/components/ui";
import { formatTaille, NOMBRE_MAX, TAILLE_MAX, TYPES_ACCEPTES } from "@/lib/upload-constantes";
import { formatSiren } from "@/lib/format";

export type EntrepriseChoisie = {
  siren: string;
  denomination: string;
  adresse: string;
  activite: string;
  slug: string;
  connue: boolean;
};

const CATEGORIES = [
  { cle: "REMBOURSEMENT", libelle: "Remboursement", desc: "Somme non remboursée après annulation, rétractation ou retour." },
  { cle: "LIVRAISON", libelle: "Livraison", desc: "Commande non reçue, incomplète, endommagée ou très en retard." },
  { cle: "GARANTIE", libelle: "Garantie", desc: "Panne ou défaut pendant la garantie légale, prise en charge refusée." },
  { cle: "SAV", libelle: "Service après-vente", desc: "Réparation, échange ou assistance non assurés." },
  { cle: "RESILIATION", libelle: "Résiliation et abonnement", desc: "Résiliation refusée, prélèvements poursuivis, frais contestés." },
  { cle: "AUTRE", libelle: "Autre motif", desc: "Information trompeuse, pratique contestée, autre situation." },
];

const CONTACTS = [
  { cle: "ECRIT", libelle: "Oui, par écrit" },
  { cle: "TELEPHONE", libelle: "Par téléphone" },
  { cle: "AUCUN", libelle: "Pas encore" },
];

export function FormulaireSignalement({
  entrepriseInitiale,
  modeInitial,
}: {
  entrepriseInitiale: EntrepriseChoisie | null;
  modeInitial: "annuaire" | "libre";
}) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(deposerSignalement, {});
  const [mode, setMode] = useState<"annuaire" | "libre">(modeInitial);
  const [choisie, setChoisie] = useState<EntrepriseChoisie | null>(entrepriseInitiale);
  const [requete, setRequete] = useState(entrepriseInitiale?.denomination ?? "");
  const [suggestions, setSuggestions] = useState<EntrepriseChoisie[]>([]);
  const [recherche, setRecherche] = useState<"repos" | "chargement" | "vide" | "erreur">("repos");
  const [categorie, setCategorie] = useState("");
  const [contact, setContact] = useState("");
  const [resume, setResume] = useState("");
  const [pieces, setPieces] = useState<File[]>([]);
  const [erreurPiece, setErreurPiece] = useState<string | null>(null);
  const champFichier = useRef<HTMLInputElement>(null);
  const erreurs = etat.erreurs ?? {};

  // Ramène l'utilisateur sur le premier champ en erreur.
  useEffect(() => {
    if (!etat.erreurs) return;
    const premier = document.querySelector<HTMLElement>("[data-en-erreur='true']");
    premier?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [etat]);

  async function chercher() {
    const q = requete.trim();
    if (q.length < 2) return;
    setRecherche("chargement");
    try {
      const reponse = await fetch(`/api/recherche?q=${encodeURIComponent(q)}`);
      const data = (await reponse.json()) as { resultats: EntrepriseChoisie[] };
      setSuggestions(data.resultats);
      setRecherche(data.resultats.length ? "repos" : "vide");
    } catch {
      setRecherche("erreur");
    }
  }

  function ajouterPieces(liste: FileList | null) {
    if (!liste) return;
    setErreurPiece(null);
    const suivantes = [...pieces];
    for (const f of Array.from(liste)) {
      if (suivantes.length >= NOMBRE_MAX) {
        setErreurPiece(`Cinq pièces au maximum par signalement.`);
        break;
      }
      if (!TYPES_ACCEPTES.includes(f.type)) {
        setErreurPiece(`« ${f.name} » : format non accepté. PDF, JPG ou PNG uniquement.`);
        continue;
      }
      if (f.size > TAILLE_MAX) {
        setErreurPiece(`« ${f.name} » dépasse 10 Mo.`);
        continue;
      }
      suivantes.push(f);
    }
    setPieces(suivantes);
  }

  // Le champ file natif est réalimenté pour que la soumission emporte les pièces.
  useEffect(() => {
    if (!champFichier.current) return;
    const transfert = new DataTransfer();
    for (const f of pieces) transfert.items.add(f);
    champFichier.current.files = transfert.files;
  }, [pieces]);

  return (
    <form action={action} className="rf-conteneur" style={{ padding: "20px 32px 56px" }} noValidate>
      <input type="hidden" name="mode" value={mode} />
      {choisie ? <input type="hidden" name="siren" value={choisie.siren} /> : null}

      {etat.message ? (
        <div className="rf-encart rf-encart--erreur" role="alert" style={{ marginBottom: 20 }}>
          {etat.message}
        </div>
      ) : null}

      <div className="rf-deux-colonnes--etroite">
        <div className="rf-pile">
          {/* ── 1. L'entreprise concernée ───────────────────────────────── */}
          <section className="rf-carte" data-en-erreur={erreurs.siren || erreurs.entrepriseNom ? "true" : undefined}>
            <div className="rf-carte__tete">
              <div className="rf-ligne" style={{ gap: 14, flexWrap: "nowrap" }}>
                <span className="rf-pastille">1</span>
                <div>
                  <h2 className="rf-carte__titre">L’entreprise concernée</h2>
                  <div className="rf-carte__sous-titre">Cherchez-la dans l’annuaire ou saisissez-la vous-même</div>
                </div>
              </div>
            </div>
            <div className="rf-carte__corps">
              <div className="rf-ligne" style={{ gap: 8 }}>
                {(["annuaire", "libre"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={`rf-btn ${mode === m ? "rf-btn--secondaire" : "rf-btn--neutre"}`}
                    style={
                      mode === m
                        ? { border: "2px solid var(--rf-cobalt)", background: "var(--rf-fond-selection)" }
                        : undefined
                    }
                  >
                    {m === "annuaire" ? "Chercher dans l’annuaire" : "Saisir l’entreprise moi-même"}
                  </button>
                ))}
              </div>

              {mode === "annuaire" ? (
                <div>
                  <div className="rf-recherche rf-mt-16">
                    <label className="rf-vh" htmlFor="q-entreprise">
                      Nom, raison sociale ou SIREN de l’entreprise
                    </label>
                    <input
                      id="q-entreprise"
                      className="rf-input"
                      value={requete}
                      onChange={(e) => setRequete(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void chercher();
                        }
                      }}
                      placeholder="Nom commercial, raison sociale ou SIREN"
                    />
                    <button type="button" className="rf-btn rf-btn--primaire" onClick={() => void chercher()}>
                      Rechercher
                    </button>
                  </div>

                  {recherche === "chargement" ? (
                    <p className="rf-legende rf-mt-12">Recherche dans les registres publics…</p>
                  ) : null}
                  {recherche === "vide" ? (
                    <p className="rf-legende rf-mt-12">
                      Aucune entreprise trouvée. Essayez la raison sociale exacte, le SIREN, ou saisissez
                      l’entreprise vous-même.
                    </p>
                  ) : null}
                  {recherche === "erreur" ? (
                    <p className="rf-erreur-champ rf-mt-12">
                      Le registre public n’a pas répondu. Réessayez, ou saisissez l’entreprise vous-même.
                    </p>
                  ) : null}

                  {suggestions.length && !choisie ? (
                    <ul className="rf-carte rf-mt-14">
                      {suggestions.map((s) => (
                        <li key={s.siren} style={{ borderBottom: "1px solid var(--rf-ligne-carte)" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setChoisie(s);
                              setSuggestions([]);
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              border: 0,
                              background: "#fff",
                              padding: "14px 16px",
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{s.denomination}</span>
                            <span className="rf-legende" style={{ display: "block", marginTop: 3 }}>
                              SIREN {formatSiren(s.siren)}
                              {s.adresse ? ` · ${s.adresse}` : ""}
                              {s.activite ? ` · ${s.activite}` : ""}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {choisie ? (
                    <div
                      className="rf-carte rf-carte--selection rf-mt-14"
                      style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}
                    >
                      <div className="rf-min0">
                        <div className="rf-ligne" style={{ gap: 10 }}>
                          <span style={{ fontSize: 17, fontWeight: 700 }}>{choisie.denomination}</span>
                          <span className="rf-badge rf-badge--sm rf-badge--verifie-doux">✓ Identité vérifiée</span>
                        </div>
                        <p className="rf-mt-6" style={{ fontSize: 13, color: "var(--rf-texte-2)", lineHeight: 1.55 }}>
                          SIREN {formatSiren(choisie.siren)}
                          {choisie.adresse ? ` · ${choisie.adresse}` : ""}
                          {choisie.activite ? ` · ${choisie.activite}` : ""}
                        </p>
                        <div className="rf-ligne rf-mt-8" style={{ gap: 14 }}>
                          <Link href={`/entreprises/${choisie.slug}`} style={{ fontSize: 12.5, fontWeight: 600 }}>
                            Voir la fiche de l’entreprise
                          </Link>
                          <button
                            type="button"
                            onClick={() => setChoisie(null)}
                            style={{ border: 0, background: "none", color: "var(--rf-cobalt)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}
                          >
                            Changer d’entreprise
                          </button>
                        </div>
                      </div>
                      <span className="rf-badge rf-badge--succes rf-flexnone">Sélectionnée</span>
                    </div>
                  ) : null}

                  <ChampErreur message={erreurs.siren} />
                </div>
              ) : (
                <div className="rf-grille rf-mt-16" style={{ gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
                  <div>
                    <label className="rf-champ__label" htmlFor="entrepriseNom">
                      Nom commercial de l’entreprise
                    </label>
                    <input id="entrepriseNom" name="entrepriseNom" className="rf-input" placeholder="ex. Mobivolt" />
                    <ChampErreur message={erreurs.entrepriseNom} />
                  </div>
                  <div>
                    <label className="rf-champ__label" htmlFor="entrepriseSite">
                      Site internet ou lieu de l’achat
                    </label>
                    <input id="entrepriseSite" name="entrepriseSite" className="rf-input" placeholder="ex. mobivolt.fr ou magasin de Lille" />
                  </div>
                  <p className="rf-legende" style={{ gridColumn: "1/-1" }}>
                    Nous rapprochons l’entreprise des registres publics sous 48 heures ouvrées. Si
                    l’identification échoue, votre signalement reste utilisable pour vos démarches, sans fiche
                    publique.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ── 2. Le litige ────────────────────────────────────────────── */}
          <section className="rf-carte" data-en-erreur={erreurs.categorie || erreurs.dateFaits || erreurs.contactPrealable ? "true" : undefined}>
            <div className="rf-carte__tete">
              <div className="rf-ligne" style={{ gap: 14, flexWrap: "nowrap" }}>
                <span className="rf-pastille">2</span>
                <div>
                  <h2 className="rf-carte__titre">Le litige</h2>
                  <div className="rf-carte__sous-titre">La catégorie détermine les démarches et les délais proposés</div>
                </div>
              </div>
            </div>
            <div className="rf-carte__corps">
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="rf-vh">Catégorie du litige</legend>
                <div className="rf-grille rf-grille--280" style={{ gap: 10 }}>
                  {CATEGORIES.map((c) => (
                    <label key={c.cle} className="rf-radio-carte">
                      <input
                        type="radio"
                        name="categorie"
                        value={c.cle}
                        checked={categorie === c.cle}
                        onChange={() => setCategorie(c.cle)}
                      />
                      <span className="rf-min0">
                        <span className="rf-radio-carte__titre">{c.libelle}</span>
                        <span className="rf-radio-carte__desc">{c.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <ChampErreur message={erreurs.categorie} />
              </fieldset>

              <div className="rf-grille rf-mt-22" style={{ gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                <div>
                  <label className="rf-champ__label" htmlFor="montant">
                    Montant en jeu <span className="rf-champ__label-facultatif">(facultatif)</span>
                  </label>
                  <div className="rf-groupe-champ">
                    <input id="montant" name="montant" className="rf-input" inputMode="decimal" placeholder="486" />
                    <span className="rf-suffixe">€</span>
                  </div>
                </div>
                <div>
                  <label className="rf-champ__label" htmlFor="dateFaits">
                    Date des faits
                  </label>
                  <input id="dateFaits" name="dateFaits" type="date" className="rf-input" max={new Date().toISOString().slice(0, 10)} />
                  <ChampErreur message={erreurs.dateFaits} />
                </div>
                <div>
                  <span className="rf-champ__label">Avez-vous déjà contacté l’entreprise&nbsp;?</span>
                  <div className="rf-segments">
                    {CONTACTS.map((c) => (
                      <label key={c.cle} className={`rf-segment ${contact === c.cle ? "rf-segment--actif" : ""}`}>
                        <input
                          type="radio"
                          name="contactPrealable"
                          value={c.cle}
                          checked={contact === c.cle}
                          onChange={() => setContact(c.cle)}
                        />
                        {c.libelle}
                      </label>
                    ))}
                  </div>
                  <ChampErreur message={erreurs.contactPrealable} />
                </div>
              </div>
              <p className="rf-legende rf-mt-12">
                Le montant est déclaratif et n’est publié qu’en donnée agrégée. Une réclamation écrite
                préalable conditionne la saisine d’un médiateur.
              </p>
            </div>
          </section>

          {/* ── 3. Que s'est-il passé ? ─────────────────────────────────── */}
          <section className="rf-carte" data-en-erreur={erreurs.resume ? "true" : undefined}>
            <div className="rf-carte__tete">
              <div className="rf-ligne" style={{ gap: 14, flexWrap: "nowrap" }}>
                <span className="rf-pastille">3</span>
                <div>
                  <h2 className="rf-carte__titre">Que s’est-il passé&nbsp;?</h2>
                  <div className="rf-carte__sous-titre">Cinq lignes suffisent : faits, dates, ce que vous demandez</div>
                </div>
              </div>
            </div>
            <div className="rf-carte__corps">
              <label className="rf-vh" htmlFor="resume">
                Résumé des faits
              </label>
              <textarea
                id="resume"
                name="resume"
                rows={5}
                className={`rf-textarea ${erreurs.resume ? "rf-textarea--erreur" : ""}`}
                maxLength={600}
                value={resume}
                onChange={(e) => setResume(e.target.value.slice(0, 600))}
                aria-describedby="compteur-resume"
                placeholder="ex. Commande annulée le 4 août dans le délai de rétractation. Retour envoyé le 6 août, réception confirmée. Aucun remboursement à ce jour malgré deux relances par courriel."
              />
              <div className="rf-ligne--entre rf-mt-8" style={{ display: "flex", flexWrap: "wrap" }}>
                <p className="rf-legende" style={{ maxWidth: 520 }}>
                  Ce résumé n’est pas publié tel quel : seules la catégorie, le montant, la date et le statut
                  apparaissent publiquement. Restez factuel, sans propos injurieux ni données personnelles de
                  tiers.
                </p>
                <span
                  id="compteur-resume"
                  className="rf-nombres"
                  style={{ fontSize: 12.5, whiteSpace: "nowrap", color: resume.length > 540 ? "var(--rf-alerte)" : "var(--rf-texte-3)" }}
                >
                  {resume.length} / 600 caractères
                </span>
              </div>
              <ChampErreur message={erreurs.resume} />
            </div>
          </section>

          {/* ── 4. Justificatifs ────────────────────────────────────────── */}
          <section className="rf-carte">
            <div className="rf-carte__tete">
              <div className="rf-ligne" style={{ gap: 14, flexWrap: "nowrap" }}>
                <span className="rf-pastille">4</span>
                <div>
                  <h2 className="rf-carte__titre">
                    Justificatifs <span className="rf-champ__label-facultatif">(facultatif)</span>
                  </h2>
                  <div className="rf-carte__sous-titre">
                    Une pièce contrôlée fait passer le signalement en ✓ signalement vérifié
                  </div>
                </div>
              </div>
              <span className="rf-badge rf-badge--sm rf-badge--verifie-doux">Pièces jamais publiées</span>
            </div>
            <div className="rf-carte__corps rf-grille" style={{ gap: 20, gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
              <div>
                <label className="rf-depot" htmlFor="justificatifs">
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>Déposer un fichier</span>
                  <span className="rf-legende" style={{ display: "block", marginTop: 6 }}>
                    PDF, JPG ou PNG — 10 Mo maximum par pièce, 5 pièces au plus
                  </span>
                  <span
                    className="rf-btn rf-btn--secondaire rf-btn--sm"
                    style={{ marginTop: 14, display: "inline-flex" }}
                    aria-hidden="true"
                  >
                    Parcourir mes fichiers
                  </span>
                </label>
                <input
                  ref={champFichier}
                  id="justificatifs"
                  name="justificatifs"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="rf-vh"
                  onChange={(e) => ajouterPieces(e.target.files)}
                />
                {erreurPiece ? <span className="rf-erreur-champ">{erreurPiece}</span> : null}
                <ChampErreur message={erreurs.justificatifs} />

                {pieces.length ? (
                  <ul className="rf-carte rf-mt-12">
                    {pieces.map((p, i) => (
                      <li
                        key={`${p.name}-${i}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                          padding: "10px 14px",
                          borderBottom: "1px solid var(--rf-ligne-carte)",
                        }}
                      >
                        <span className="rf-min0" style={{ fontSize: 13 }}>
                          {p.name}
                          <span className="rf-legende"> · {formatTaille(p.size)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setPieces(pieces.filter((_, j) => j !== i))}
                          style={{ border: 0, background: "none", color: "var(--rf-erreur)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                        >
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div>
                <div className="rf-etiquette">Pièces les plus utiles</div>
                <ul className="rf-pile rf-pile--serree rf-mt-12" style={{ gap: 8 }}>
                  {[
                    "Facture, bon de commande ou confirmation de paiement",
                    "Échanges écrits avec le service client",
                    "Photographies du produit ou du défaut",
                    "Preuve d’envoi d’un retour ou d’une réclamation",
                  ].map((p) => (
                    <ItemCoche key={p} variante="doux">
                      <span style={{ fontSize: 13.5 }}>{p}</span>
                    </ItemCoche>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── 5. Vos coordonnées ──────────────────────────────────────── */}
          <section
            className="rf-carte"
            data-en-erreur={erreurs.prenom || erreurs.nom || erreurs.email || erreurs.certifie || erreurs.consentement ? "true" : undefined}
          >
            <div className="rf-carte__tete">
              <div className="rf-ligne" style={{ gap: 14, flexWrap: "nowrap" }}>
                <span className="rf-pastille">5</span>
                <div>
                  <h2 className="rf-carte__titre">Vos coordonnées</h2>
                  <div className="rf-carte__sous-titre">Aucun compte à créer : tout arrive par email</div>
                </div>
              </div>
            </div>
            <div className="rf-carte__corps">
              <div className="rf-grille" style={{ gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                <div>
                  <label className="rf-champ__label" htmlFor="prenom">
                    Prénom
                  </label>
                  <input id="prenom" name="prenom" className="rf-input" autoComplete="given-name" placeholder="Julien" />
                  <ChampErreur message={erreurs.prenom} />
                </div>
                <div>
                  <label className="rf-champ__label" htmlFor="nom">
                    Nom
                  </label>
                  <input id="nom" name="nom" className="rf-input" autoComplete="family-name" placeholder="Moreau" />
                  <ChampErreur message={erreurs.nom} />
                </div>
                <div>
                  <label className="rf-champ__label" htmlFor="email">
                    Email de contact
                  </label>
                  <input id="email" name="email" type="email" className="rf-input" autoComplete="email" placeholder="vous@courriel.fr" />
                  <ChampErreur message={erreurs.email} />
                </div>
              </div>
              <p className="rf-legende rf-mt-12">
                Votre nom n’est jamais publié. Il sert à la vérification du signalement et, si vous le décidez,
                aux courriers que vous adressez vous-même au professionnel. Votre email reçoit le récapitulatif
                et le lien de suivi.
              </p>

              <div className="rf-mt-18 rf-separateur-haut rf-pile rf-pile--serree" style={{ gap: 12, paddingTop: 18 }}>
                <label className="rf-case">
                  <input type="checkbox" name="certifie" />
                  <span>Je certifie que les faits déclarés sont exacts et que je suis le consommateur concerné.</span>
                </label>
                <ChampErreur message={erreurs.certifie} />
                <label className="rf-case">
                  <input type="checkbox" name="consentement" />
                  <span>
                    J’accepte que les données structurées de mon litige (catégorie, montant, date, statut)
                    soient publiées de façon anonyme sur la fiche de l’entreprise.{" "}
                    <Link href="/donnees-personnelles">Traitement des données</Link>
                  </span>
                </label>
                <ChampErreur message={erreurs.consentement} />
              </div>
            </div>
          </section>

          {/* ── Envoi ───────────────────────────────────────────────────── */}
          <div
            style={{
              border: "2px solid var(--rf-cobalt-fonce)",
              background: "var(--rf-fond-selection)",
              padding: 22,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 24,
              alignItems: "center",
            }}
          >
            <div className="rf-min0">
              <div style={{ fontSize: 17, fontWeight: 700 }}>Prêt à envoyer votre signalement</div>
              <p className="rf-texte rf-mt-6" style={{ fontSize: 13.5 }}>
                Vous recevez immédiatement par email votre signalement avec sa référence, la checklist des
                preuves et les démarches dans le bon ordre. Aucun engagement, aucune démarche envoyée sans
                votre validation : Recours France ne contacte pas le professionnel.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 330, width: "100%", justifySelf: "end" }}>
              <button type="submit" className="rf-btn rf-btn--primaire rf-btn--bloc" style={{ fontSize: 17, fontWeight: 700, padding: "18px 20px" }} disabled={enCours}>
                {enCours ? "Envoi en cours…" : "Envoyer mon signalement"}
              </button>
              <span className="rf-legende rf-centre">Gratuit · sans compte · vous gardez la main à chaque étape</span>
            </div>
          </div>
        </div>

        {/* ── Rail droit ─────────────────────────────────────────────────── */}
        <aside className="rf-rail">
          <div className="rf-carte" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Ce que vous obtenez gratuitement</div>
            <ul className="rf-pile rf-pile--serree rf-mt-14" style={{ gap: 10 }}>
              {[
                "Un signalement Recours France avec numéro de référence",
                "Une checklist des justificatifs et preuves à conserver",
                "Les coordonnées utiles du professionnel",
                "Les démarches à effectuer dans le bon ordre",
                "Le médiateur compétent lorsqu’il est identifié",
                "Les démarches officielles disponibles, notamment SignalConso lorsqu’elles sont pertinentes",
              ].map((b) => (
                <ItemCoche key={b} variante="doux">
                  <span style={{ fontSize: 13.5 }}>{b}</span>
                </ItemCoche>
              ))}
            </ul>
            <p className="rf-legende rf-mt-14 rf-separateur-haut">
              Recours France structure votre signalement et vous guide dans les démarches disponibles. La
              plateforme ne vous représente pas et ne délivre pas de conseil juridique personnalisé.
            </p>
          </div>

          <div className="rf-carte" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Vos données</div>
            <div className="rf-pile rf-pile--serree rf-mt-12" style={{ gap: 12 }}>
              {[
                { titre: "Vos pièces restent privées", desc: "Elles servent uniquement à vérifier la réalité du signalement et ne sont jamais publiées." },
                { titre: "Publication limitée et structurée", desc: "Seuls la catégorie, le montant, la date, le statut et le niveau de vérification apparaissent publiquement." },
                { titre: "Suppression sur demande", desc: "Vous pouvez demander la suppression de votre signalement à tout moment, par simple email." },
              ].map((p) => (
                <div key={p.titre}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.titre}</div>
                  <div className="rf-legende" style={{ lineHeight: 1.55, marginTop: 3 }}>
                    {p.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rf-carte rf-carte--teintee" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Litige urgent ou dangereux&nbsp;?</div>
            <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
              Pour un produit dangereux, une fraude ou une pratique commerciale trompeuse, utilisez aussi les
              démarches officielles disponibles, notamment SignalConso.
            </p>
            <p className="rf-mt-10">
              <Link href="/demarches-officielles" style={{ fontSize: 13, fontWeight: 600 }}>
                Voir les démarches officielles
              </Link>
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
