import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Page } from "@/components/chrome";
import { resoudreCible } from "@/lib/cible";
import { LIMITE_RECIT, ecrireBrouillon, lireBrouillon } from "@/lib/brouillon";
import { SEUIL_RECIT, coordonneesDansLeRecit, situationParCle } from "@/lib/tunnel";
import { LIBELLES_DEMANDE, LIBELLES_ETAT_PRO } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Que s’est-il passé ?",
  robots: { index: false, follow: false },
};

/**
 * Étape 2 — le récit et ce qui en sera publié.
 *
 * Le récit est recueilli mais ne sera pas publié : le relire un à un
 * demanderait une main-d'œuvre que la plateforme n'a pas, et un texte libre
 * mis en ligne sans relecture expose au dénigrement. Il sert au courrier de
 * réclamation, au récapitulatif et au traitement d'une éventuelle contestation.
 *
 * Ce sont donc les trois choix fermés ci-dessous qui composent la phrase
 * publique. Sans eux, deux signalements d'une même catégorie produiraient
 * exactement le même texte sur la fiche, et la page n'apprendrait rien à
 * personne.
 */
export default async function EtapeRecit({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const cible = await resoudreCible(slug);
  if (!cible) notFound();

  const brouillon = await lireBrouillon();
  const situation = situationParCle(brouillon.situation);
  if (!situation) redirect(`/signaler/${slug}/situation`);

  const trop_court = query.court === "1";
  const alerte = typeof query.perso === "string" ? query.perso.split("|").filter(Boolean) : [];

  async function continuer(donnees: FormData) {
    "use server";
    const recit = String(donnees.get("recit") ?? "").trim();
    const passerOutre = donnees.get("passerOutre") === "1";

    await ecrireBrouillon({
      recit: recit.slice(0, LIMITE_RECIT),
      demande: String(donnees.get("demande") ?? "") || undefined,
      etatPro: String(donnees.get("etatPro") ?? "") || undefined,
      relances: Number(donnees.get("relances")) || undefined,
      montant: String(donnees.get("montant") ?? "") || undefined,
      dateFaits: String(donnees.get("dateFaits") ?? "") || undefined,
      montantPublic: donnees.get("montantPublic") === "on",
    });

    if (recit.length < SEUIL_RECIT) redirect(`/signaler/${slug}/recit?court=1`);

    // L'alerte prévient, elle n'interdit pas : une adresse électronique dans un
    // récit est presque toujours une maladresse, et bloquer la publication
    // ferait abandonner là où un avertissement suffit à la corriger.
    const trouve = coordonneesDansLeRecit(recit);
    if (trouve.length > 0 && !passerOutre) {
      redirect(`/signaler/${slug}/recit?perso=${encodeURIComponent(trouve.join("|"))}`);
    }

    redirect(`/signaler/${slug}/publication`);
  }

  return (
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", sansCta: true }}
      piedComplet={false}
    >
      <div className="rfx">
        <div className="rfx-tunnel" style={{ padding: "0 20px 56px" }}>
          <div className="rfx-progression">
            <div className="rfx-progression__texte">Étape 2 sur 3</div>
            <div className="rfx-progression__piste">
              <div className="rfx-progression__part" style={{ width: "66%" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 22 }}>
            <span className="rfx-badge rfx-badge--categorie">{situation.libelle}</span>
            {brouillon.sous ? <span className="rfx-badge rfx-badge--neutre">{brouillon.sous}</span> : null}
            <Link href={`/signaler/${slug}/situation`} style={{ fontSize: 13 }}>
              Modifier
            </Link>
          </div>

          <h1 className="rfx-h2" style={{ marginTop: 16 }}>
            Que s’est-il passé ?
          </h1>

          {trop_court ? (
            <div className="rfx-erreur" style={{ marginTop: 16 }} role="alert">
              Votre description est trop courte pour être exploitable. Indiquez au moins les dates, ce
              que vous avez demandé et où en est la situation.
            </div>
          ) : null}

          {alerte.length > 0 ? (
            <div className="rfx-alerte" style={{ marginTop: 16 }} role="status">
              <strong>Vérifiez votre texte</strong>
              <p style={{ marginTop: 6 }}>
                Votre description semble contenir {alerte.join(" et ")}. Ces informations ne sont pas
                nécessaires ici : votre adresse électronique nous parvient par le champ prévu, et vos
                coordonnées n’ont pas à figurer dans le récit.
              </p>
            </div>
          ) : null}

          <form action={continuer}>
            <div style={{ marginTop: 22 }}>
              <label className="rfx-champ__label" htmlFor="recit">
                Décrivez votre situation
              </label>
              <span className="rfx-champ__aide">
                Les dates importantes, ce que vous avez déjà demandé, et où en est la situation
                aujourd’hui.
              </span>
              <textarea
                id="recit"
                name="recit"
                className="rfx-textarea"
                maxLength={LIMITE_RECIT}
                defaultValue={brouillon.recit ?? ""}
                placeholder="J’ai commandé le 12 juillet. Le colis a été annoncé livré le 18 mais je ne l’ai jamais reçu. J’ai écrit au service client le 20 juillet, sans réponse à ce jour."
                required
              />
              <div className="rfx-compteur-car">{SEUIL_RECIT} caractères minimum</div>

              {/* Le sort du récit est annoncé là où il est écrit, pas dans des
                  conditions générales que personne n'ouvre. */}
              <div className="rfx-bloc rfx-bloc--alt" style={{ padding: "12px 14px", marginTop: 4 }}>
                <p className="rfx-petit" style={{ margin: 0 }}>
                  <strong>Ce texte ne sera pas publié.</strong> Il nous sert à rédiger votre courrier de
                  réclamation et à établir votre récapitulatif. Ce qui apparaîtra sur la fiche est
                  composé à partir de vos réponses ci-dessous.
                </p>
              </div>
            </div>

            {/* ── Ce qui composera la phrase publique ──────────────────── */}
            <div className="rfx-bloc" style={{ marginTop: 22 }}>
              <div className="rfx-source" style={{ textTransform: "uppercase", letterSpacing: ".06em" }}>
                Ce qui sera publié
              </div>

              <div style={{ marginTop: 14 }}>
                <span className="rfx-champ__label">Que demandez-vous ?</span>
                <div className="rfx-sous" style={{ display: "flex", paddingLeft: 0 }}>
                  {Object.entries(LIBELLES_DEMANDE).map(([cle, lib]) => (
                    <label key={cle}>
                      <input
                        type="radio"
                        name="demande"
                        value={cle}
                        defaultChecked={brouillon.demande === cle}
                      />
                      {lib}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <span className="rfx-champ__label">Où en est le professionnel ?</span>
                <div className="rfx-sous" style={{ display: "flex", paddingLeft: 0 }}>
                  {Object.entries(LIBELLES_ETAT_PRO).map(([cle, lib]) => (
                    <label key={cle}>
                      <input
                        type="radio"
                        name="etatPro"
                        value={cle}
                        defaultChecked={brouillon.etatPro === cle}
                      />
                      {lib}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <span className="rfx-champ__label">Combien de fois l’avez-vous relancé ?</span>
                <div className="rfx-sous" style={{ display: "flex", paddingLeft: 0 }}>
                  {[
                    { v: 1, l: "Une fois" },
                    { v: 2, l: "Deux fois" },
                    { v: 3, l: "Trois fois ou plus" },
                  ].map((r) => (
                    <label key={r.v}>
                      <input
                        type="radio"
                        name="relances"
                        value={r.v}
                        defaultChecked={brouillon.relances === r.v}
                      />
                      {r.l}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Montant et date ──────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 22 }}>
              <label className="rfx-champ">
                <span className="rfx-champ__label">Montant concerné</span>
                <span className="rfx-champ__aide">Facultatif</span>
                <input
                  type="text"
                  name="montant"
                  inputMode="decimal"
                  className="rfx-input"
                  defaultValue={brouillon.montant ?? ""}
                  placeholder="799"
                />
              </label>
              <label className="rfx-champ">
                <span className="rfx-champ__label">Date des faits</span>
                <span className="rfx-champ__aide">Sert au calcul de vos échéances</span>
                <input
                  type="date"
                  name="dateFaits"
                  className="rfx-input"
                  defaultValue={brouillon.dateFaits ?? ""}
                />
              </label>
            </div>

            <label className="rfx-case">
              <input type="checkbox" name="montantPublic" defaultChecked={brouillon.montantPublic ?? true} />
              <span>
                Afficher ce montant publiquement sur la fiche. Décoché, il reste compté dans les
                statistiques sans être visible.
              </span>
            </label>

            <div style={{ marginTop: 22 }}>
              {alerte.length > 0 ? (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button type="submit" name="passerOutre" value="1" className="rfx-btn rfx-btn--secondaire">
                    Continuer quand même
                  </button>
                  <span className="rfx-mention" style={{ alignSelf: "center" }}>
                    ou corrigez votre texte ci-dessus, puis continuez
                  </span>
                </div>
              ) : null}
              <button type="submit" className="rfx-btn rfx-btn--large" style={{ marginTop: alerte.length ? 12 : 0 }}>
                Continuer
              </button>
              <p className="rfx-mention" style={{ marginTop: 10, textAlign: "center" }}>
                Votre saisie est conservée sur cet appareil.
              </p>
            </div>
          </form>

          <p className="rfx-mention" style={{ marginTop: 24 }}>
            <Link href={`/signaler/${slug}/situation`}>← Revenir</Link>
          </p>
        </div>
      </div>
    </Page>
  );
}
