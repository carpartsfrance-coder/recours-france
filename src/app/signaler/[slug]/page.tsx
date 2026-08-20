import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { chargerEntreprise } from "@/lib/fiche";
import { libelleSecteur } from "@/lib/maillage";
import { formatNombre } from "@/lib/format";
import { APRES_SIGNALEMENT, INCLUS } from "@/lib/tunnel";
import { MOTIFS } from "@/lib/observatoire";

/**
 * Accueil du tunnel de signalement.
 *
 * Ce que la page doit faire comprendre en cinq secondes : « je peux publier
 * mon problème sur la fiche publique de cette entreprise ». Le courrier, les
 * étapes et les échéances viennent après — ils sont réels, mais les annoncer
 * en premier reviendrait à vendre un service administratif là où le
 * consommateur cherche d'abord à ne plus être seul avec sa situation.
 *
 * Rien ici ne promet une réaction de l'entreprise : la plateforme ne lui
 * transmet rien. Écrire l'inverse serait un mensonge, et un mensonge dont le
 * démenti arriverait quinze jours plus tard.
 */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const base = await chargerEntreprise(slug);
  if (!base) return {};
  return {
    title: `Signaler un problème avec ${base.denomination}`,
    description: `Rendez votre problème avec ${base.denomination} visible publiquement. Gratuit, sans compte, en une minute environ. Vous recevez également un courrier de réclamation et les démarches à suivre.`,
    alternates: { canonical: `/signaler/${base.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function AccueilTunnel({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = await chargerEntreprise(slug);
  if (!base) notFound();

  const [total, parMotifBrut] = await Promise.all([
    prisma.signalement.count({ where: { entrepriseId: base.id, moderation: "PUBLIE" } }),
    prisma.signalement.groupBy({
      by: ["categorie"],
      _count: { _all: true },
      where: { entrepriseId: base.id, moderation: "PUBLIE" },
    }),
  ]);

  const nom = base.denomination;
  const libelles = Object.fromEntries(MOTIFS.map((m) => [m.cle, m.libelle]));
  const repartition = parMotifBrut
    .map((g) => ({ libelle: libelles[g.categorie] ?? g.categorie, n: g._count._all }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);

  return (
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", navActive: "annuaire" }}
      fil={[
        { libelle: "Annuaire", href: "/annuaire" },
        { libelle: nom, href: `/entreprises/${base.slug}` },
        { libelle: "Signaler un problème" },
      ]}
    >
      <div className="rfx">
        <div className="rfx-large rfx-avec-barre" style={{ padding: "36px 24px 56px" }}>
          <div className="rfx-hero">
            {/* ── Colonne gauche : la promesse ─────────────────────────── */}
            <div>
              <div className="rfx-mention" style={{ marginBottom: 12 }}>
                {[libelleSecteur(base.secteur ?? "autre"), base.commune].filter(Boolean).join(" · ")}
                {total > 0 ? ` · ${formatNombre(total)} signalement${total > 1 ? "s" : ""} publié${total > 1 ? "s" : ""}` : ""}
              </div>

              <h1 className="rfx-h1">Un problème avec {nom} ?</h1>
              <p
                style={{
                  fontSize: 29,
                  fontWeight: 700,
                  letterSpacing: "-0.026em",
                  lineHeight: 1.2,
                  color: "var(--x-bleu)",
                  marginTop: 14,
                }}
              >
                Rendez votre problème visible publiquement
              </p>
              <p className="rfx-prose" style={{ marginTop: 14 }}>
                Votre problème ne reste pas seulement dans une boîte email : vous pouvez aussi le rendre
                visible sur la fiche publique de l’entreprise, aux côtés des situations signalées par
                d’autres consommateurs.
              </p>

              <div className="rfx-benefice" style={{ marginTop: 22 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--x-bleu)" }}>
                  Signalement publié sur la fiche {nom}
                </div>
                <p className="rfx-petit" style={{ marginTop: 6 }}>
                  Votre situation devient consultable par toute personne qui cherche des informations
                  sur cette entreprise.
                </p>
              </div>

              <ul className="rfx-texte" style={{ margin: "18px 0 0", paddingLeft: 20 }}>
                <li style={{ marginBottom: 5 }}>Votre problème est consultable publiquement</li>
                <li style={{ marginBottom: 5 }}>Un courrier de réclamation vous est préparé</li>
                <li>Les étapes et les échéances vous sont indiquées</li>
              </ul>

              <div style={{ marginTop: 26, maxWidth: 420 }}>
                <Link href={`/signaler/${base.slug}/situation`} className="rfx-btn rfx-btn--large">
                  Rendre mon problème visible
                </Link>
                <p className="rfx-mention" style={{ marginTop: 10, textAlign: "center" }}>
                  Environ 1 minute · Gratuit · Sans compte
                </p>
              </div>

              <p className="rfx-petit" style={{ marginTop: 20, maxWidth: 620 }}>
                Vous obtenez également gratuitement les étapes à suivre et un courrier adapté à votre
                situation.
              </p>

              <div className="rfx-bloc" style={{ marginTop: 16, maxWidth: 620, padding: "14px 18px" }}>
                <div className="rfx-source" style={{ textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Inclus avec votre signalement
                </div>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8, fontSize: 14 }}>
                  {INCLUS.map((i) => (
                    <span key={i}>{i}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Colonne droite : la preuve ───────────────────────────── */}
            <aside>
              <div className="rfx-bloc">
                <h2 className="rfx-h2 rfx-h2--secondaire" style={{ fontSize: 17 }}>
                  Ce qui se passe après votre signalement
                </h2>
                <ol className="rfx-jalons" style={{ marginTop: 16 }}>
                  {APRES_SIGNALEMENT.map((e, i) => (
                    <li key={e.titre} className={`rfx-jalon${i === 0 ? " rfx-jalon--fait" : ""}`}>
                      <span className="rfx-jalon__pastille" aria-hidden="true" />
                      <span>
                        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{e.titre}</span>
                        <span className="rfx-mention" style={{ display: "block", marginTop: 2 }}>
                          {e.desc}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="rfx-source" style={{ borderTop: "1px solid var(--x-filet)", paddingTop: 10 }}>
                  Cette visibilité peut inciter l’entreprise à prendre connaissance de la situation.
                  Recours France ne lui transmet pas votre réclamation et ne garantit aucune réponse.
                </p>
              </div>

              <div className="rfx-apercu" style={{ marginTop: 16 }}>
                <div className="rfx-apercu__tete">
                  <span>Aperçu de votre futur signalement public</span>
                </div>
                <div className="rfx-apercu__corps">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <span className="rfx-badge rfx-badge--categorie">Votre catégorie</span>
                    <span className="rfx-badge rfx-badge--encours">Problème en cours</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>
                    L’intitulé de votre problème apparaîtra ici
                  </div>
                  <div className="rfx-declaration" style={{ marginTop: 12 }}>
                    Votre description des faits, telle que vous l’aurez écrite.
                  </div>
                  <p className="rfx-source" style={{ marginTop: 10 }}>
                    Publié sur la fiche {nom}.
                  </p>
                </div>
              </div>

              {total > 0 ? (
                <div className="rfx-bloc" style={{ marginTop: 16 }}>
                  <h2 className="rfx-h2 rfx-h2--secondaire" style={{ fontSize: 17 }}>
                    {formatNombre(total)} problème{total > 1 ? "s" : ""} déjà signalé{total > 1 ? "s" : ""}
                  </h2>
                  <div className="rfx-lignes" style={{ marginTop: 12 }}>
                    {repartition.map((r) => (
                      <div key={r.libelle} className="rfx-ligne">
                        <span className="rfx-ligne__cle">{r.libelle}</span>
                        <span className="rfx-ligne__valeur rfx-chiffre">{formatNombre(r.n)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="rfx-source" style={{ marginTop: 10 }}>
                    Votre signalement rejoint une fiche déjà consultable publiquement.
                  </p>
                  <p style={{ marginTop: 8 }}>
                    <Link href={`/entreprises/${base.slug}#signalements`} style={{ fontSize: 13.5 }}>
                      Voir à quoi ressemble un signalement public
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="rfx-bloc" style={{ marginTop: 16 }}>
                  <h2 className="rfx-h2 rfx-h2--secondaire" style={{ fontSize: 17 }}>
                    Aucun problème signalé pour l’instant
                  </h2>
                  <p className="rfx-petit" style={{ marginTop: 8 }}>
                    Votre signalement serait le premier publié sur la fiche {nom}.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* Sur écran étroit, le bouton sort du champ dès le premier
            défilement : il reste ici sous le pouce. */}
        <div className="rfx-barre-fixe">
          <Link href={`/signaler/${base.slug}/situation`} className="rfx-btn rfx-btn--large">
            Rendre mon problème visible
          </Link>
          <p className="rfx-mention">Environ 1 minute · Gratuit · Sans compte</p>
        </div>
      </div>
    </Page>
  );
}
