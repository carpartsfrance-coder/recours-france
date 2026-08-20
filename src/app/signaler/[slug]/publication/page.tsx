import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Page } from "@/components/chrome";
import { resoudreCible } from "@/lib/cible";
import { effacerBrouillon, lireBrouillon } from "@/lib/brouillon";
import { CE_QUI_EST_PUBLIC, CE_QUI_RESTE_PRIVE, situationParCle } from "@/lib/tunnel";
import { declarationPublique, titreSignalement } from "@/lib/observatoire";
import { LIBELLES_DEMANDE, LIBELLES_ETAT_PRO, formatDateLongue, formatMontant } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Voici ce qui sera publié",
  robots: { index: false, follow: false },
};

/**
 * Étape 3 — l'aperçu public.
 *
 * L'écran montre exactement ce qui paraîtra sur la fiche, et exactement ce qui
 * n'en sortira pas. C'est la seule façon honnête de recueillir un
 * consentement : une personne qui découvre après coup que son récit est en
 * ligne demande son retrait, et elle a raison de le demander.
 *
 * Le récit figure ici du côté privé. Il a été recueilli parce qu'il sert au
 * courrier de réclamation et au récapitulatif, mais il n'est pas publié : le
 * relire un à un demanderait une main-d'œuvre que la plateforme n'a pas.
 */
export default async function EtapePublication({
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
  // Le récit est facultatif depuis qu'il n'est plus publié : ce qui conditionne
  // le passage, c'est d'avoir quelque chose à publier. Exiger le récit ici
  // renvoyait au début quiconque l'avait sauté.
  if (!situation || (!brouillon.demande && !brouillon.etatPro)) {
    redirect(`/signaler/${slug}`);
  }

  const nom = cible.nom;
  const erreur = typeof query.erreur === "string" ? query.erreur : null;

  const dateFaits = brouillon.dateFaits ? new Date(brouillon.dateFaits) : new Date();
  const titre = titreSignalement(nom, {
    categorie: situation.categorie,
    demande: brouillon.demande ?? null,
    etatProfessionnel: brouillon.etatPro ?? null,
    resolutionConfirmee: false,
    dateFaits,
  });
  const phrase = declarationPublique(
    {
      categorie: situation.categorie,
      demande: brouillon.demande ?? null,
      etatProfessionnel: brouillon.etatPro ?? null,
      relances: brouillon.relances ?? null,
      montant: brouillon.montant,
      dateFaits,
    },
    (c) => LIBELLES_DEMANDE[c] ?? c,
    (c) => LIBELLES_ETAT_PRO[c] ?? c,
  );
  const montant = brouillon.montant ? Number(brouillon.montant.replace(",", ".")) : null;
  const montantVisible = brouillon.montantPublic !== false && montant !== null && !Number.isNaN(montant);

  async function publier(donnees: FormData) {
    "use server";
    const email = String(donnees.get("email") ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
      redirect(`/signaler/${slug}/publication?erreur=email`);
    }
    if (donnees.get("regles") !== "on") {
      redirect(`/signaler/${slug}/publication?erreur=regles`);
    }

    const { deposerDepuisBrouillon } = await import("../../actions-tunnel");
    const reference = await deposerDepuisBrouillon(slug, email);
    if (!reference) redirect(`/signaler/${slug}/publication?erreur=envoi`);

    await effacerBrouillon();
    redirect(`/signaler/${slug}/publie/${reference}`);
  }

  return (
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", sansCta: true }}
      piedComplet={false}
    >
      <div className="rfx rfx--doux">
        <div className="rfx-large" style={{ padding: "0 24px 56px" }}>
          <div className="rfx-progression">
            <div className="rfx-progression__texte">Étape 3 sur 3</div>
            <div className="rfx-progression__piste">
              <div className="rfx-progression__part" style={{ width: "100%" }} />
            </div>
          </div>

          <h1 className="rfx-h2" style={{ marginTop: 26 }}>
            Voici ce qui sera publié
          </h1>
          <p className="rfx-texte" style={{ marginTop: 10 }}>
            Et voici ce qui restera privé. Rien d’autre ne paraîtra sur la fiche de {nom}.
          </p>

          {erreur === "email" ? (
            <div className="rfx-erreur" style={{ marginTop: 16 }} role="alert">
              Cette adresse électronique ne semble pas valide. C’est par elle que vous retrouverez votre
              signalement : vérifiez-la avant de continuer.
            </div>
          ) : null}
          {erreur === "regles" ? (
            <div className="rfx-erreur" style={{ marginTop: 16 }} role="alert">
              Vous devez accepter les conditions de publication pour publier votre signalement.
            </div>
          ) : null}
          {erreur === "envoi" ? (
            <div className="rfx-erreur" style={{ marginTop: 16 }} role="alert">
              L’enregistrement n’a pas abouti. Votre saisie est conservée : réessayez dans un instant.
            </div>
          ) : null}

          {/* ── L'aperçu, tel quel ───────────────────────────────────────── */}
          {/* L'aperçu passe en appui, comme le récapitulatif d'une commande :
              on le garde sous les yeux pendant qu'on renseigne l'adresse, plutôt
              que de le faire disparaître au défilement. */}
          <div className="rfx-etape">
            <div>
          {/* ── Public / Privé, en toutes lettres ───────────────────────── */}
          <div className="rfx-deux" style={{ gap: "16px 20px", marginTop: 22 }}>
            <div className="rfx-bloc" style={{ padding: "14px 16px" }}>
              <div className="rfx-h4" style={{ color: "var(--x-bleu)" }}>Public</div>
              <ul className="rfx-petit" style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                {CE_QUI_EST_PUBLIC.map((l) => (
                  <li key={l} style={{ marginBottom: 4 }}>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rfx-bloc rfx-bloc--alt" style={{ padding: "14px 16px" }}>
              <div className="rfx-h4">Privé</div>
              <ul className="rfx-petit" style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                <li style={{ marginBottom: 4 }}>
                  <strong>Votre description des faits</strong>
                </li>
                {CE_QUI_RESTE_PRIVE.map((l) => (
                  <li key={l} style={{ marginBottom: 4 }}>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="rfx-source" style={{ marginTop: 12 }}>
            Votre description nous sert à rédiger votre courrier de réclamation et votre récapitulatif.
            Elle n’est pas publiée : Recours France ne met en ligne que des éléments qu’elle peut
            présenter comme des faits déclarés, sans relecture au cas par cas.
          </p>

          {/* ── Adresse et consentement ─────────────────────────────────── */}
          <form action={publier} style={{ marginTop: 26 }}>
            <label className="rfx-champ">
              <span className="rfx-champ__label">Votre adresse électronique</span>
              <span className="rfx-champ__aide">
                Elle reste privée. Elle sert à retrouver votre signalement et à le mettre à jour, sans
                création de compte.
              </span>
              <input
                type="email"
                name="email"
                className="rfx-input"
                autoComplete="email"
                placeholder="vous@exemple.fr"
                required
              />
            </label>

            <label className="rfx-case">
              <input type="checkbox" name="regles" required />
              <span>
                J’accepte les <Link href="/conditions-generales">conditions de publication</Link> et la{" "}
                <Link href="/charte-de-moderation">politique de modération</Link>. Je déclare des faits
                que j’ai personnellement vécus.
              </span>
            </label>

            {/* Ce que publier produit, dit juste avant le bouton — il ne
                disait rien, et « publier mon signalement » ne motive personne.

                La formulation reste celle que le handoff autorise : la
                visibilité « peut inciter l'entreprise à prendre connaissance de
                la situation ». Ni « l'entreprise sera alertée » — nous ne lui
                transmettons rien —, ni « cela augmente fortement vos chances »
                — nous n'avons aucune donnée qui l'établisse, et l'affirmer
                serait la promesse que le handoff proscrit. */}
            {/* Le bouton ne nommait que la publication, soit un tiers de ce
                qu'on obtient — la lettre et le rappel des droits comptent
                autant, et pour beaucoup de gens davantage. Les trois sont
                listés, la publication en dernier : c'est celle qui engage, et
                on la lit mieux quand les deux autres l'ont précédée.

                La formulation de la visibilité reste celle que le handoff
                autorise : elle « peut inciter » l'entreprise à prendre
                connaissance. Ni notification promise, ni chance chiffrée. */}
            <div className="rfx-bloc rfx-bloc--accent" style={{ marginTop: 22, padding: "20px 22px" }}>
              <div className="rfx-obtenu__entete">En validant, vous obtenez</div>
              <ul className="rfx-obtenu">
                {[
                  {
                    titre: "Votre lettre de réclamation",
                    detail: `Citant le texte applicable, et fixant à ${nom} un délai pour répondre.`,
                  },
                  {
                    titre: "Vos droits et vos recours",
                    detail: "Ce que vous pouvez exiger, et ce qui s’ouvre si l’entreprise ne répond pas.",
                  },
                  {
                    titre: "Votre problème publié",
                    detail: `Sur la fiche ${nom}, consultable par toute personne qui se renseigne sur elle — y compris par elle.`,
                  },
                ].map((b) => (
                  <li key={b.titre}>
                    <svg
                      className="rfx-obtenu__coche"
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <circle cx="11" cy="11" r="10" fill="currentColor" />
                      <path
                        d="M6.5 11.2l3 3 6-6.4"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span style={{ minWidth: 0 }}>
                      <span className="rfx-obtenu__titre">{b.titre}</span>
                      <span className="rfx-obtenu__detail">{b.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button type="submit" className="rfx-btn rfx-btn--large" style={{ marginTop: 16 }}>
              Publier et obtenir ma lettre
            </button>
            <p className="rfx-mention" style={{ marginTop: 10, textAlign: "center" }}>
              Gratuit · sans compte · modifiable et supprimable à tout moment
            </p>
          </form>

            </div>

            <aside>
            <div className="rfx-apercu" style={{ marginTop: 22 }}>
              <div className="rfx-apercu__tete">
                <span>Aperçu public sur la fiche {nom}</span>
                <Link href={`/signaler/${slug}/recit`}>Modifier</Link>
              </div>
              <div className="rfx-apercu__corps">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <span className="rfx-badge rfx-badge--categorie">{situation.libelle}</span>
                  <span className="rfx-badge rfx-badge--encours">Problème en cours</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>{titre}</div>
                <div className="rfx-mention" style={{ marginTop: 8 }}>
                  {[
                    montantVisible ? formatMontant(montant!) : null,
                    `Faits : ${formatDateLongue(dateFaits)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div className="rfx-declaration" style={{ marginTop: 12 }}>
                  {phrase}
                </div>
                <p className="rfx-source" style={{ marginTop: 8 }}>
                  Déclaration du consommateur. Non vérifiée par Recours France.
                </p>
              </div>
            </div>
            </aside>
          </div>

          <p className="rfx-mention" style={{ marginTop: 24 }}>
            <Link href={`/signaler/${slug}/recit`}>← Revenir</Link>
          </p>
        </div>
      </div>
    </Page>
  );
}
