import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Page } from "@/components/chrome";
import { chargerEntreprise } from "@/lib/fiche";
import { SITUATIONS, situationParCle } from "@/lib/tunnel";
import { ecrireBrouillon, lireBrouillon } from "@/lib/brouillon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quel problème rencontrez-vous ?",
  robots: { index: false, follow: false },
};

/**
 * Étape 1 — la situation.
 *
 * Dix lignes cliquables plutôt que six catégories abstraites : la personne qui
 * arrive ici ne se demande pas de quelle rubrique relève son problème, elle
 * cherche la phrase qui décrit le sien. La sous-catégorie se déplie sous la
 * ligne choisie, sans écran supplémentaire — une étape de plus, c'est un
 * abandon de plus.
 */
export default async function EtapeSituation({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const base = await chargerEntreprise(slug);
  if (!base) notFound();

  const brouillon = await lireBrouillon();

  // Le motif cliqué sur la fiche ouvre l'étape sur la bonne ligne : refaire
  // choisir ce qui vient de l'être fait perdre du monde entre deux écrans.
  const prechoix =
    typeof query.s === "string" && situationParCle(query.s) ? query.s : brouillon.situation;

  async function continuer(donnees: FormData) {
    "use server";
    const situation = String(donnees.get("situation") ?? "");
    if (!situationParCle(situation)) return;
    await ecrireBrouillon({
      situation,
      sous: String(donnees.get(`sous-${situation}`) ?? "") || undefined,
    });
    redirect(`/signaler/${slug}/recit`);
  }

  return (
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", sansCta: true }}
      piedComplet={false}
    >
      <div className="rfx">
        <div className="rfx-tunnel" style={{ padding: "0 20px 56px" }}>
          <div className="rfx-progression">
            <div className="rfx-progression__texte">Étape 1 sur 3</div>
            <div className="rfx-progression__piste">
              <div className="rfx-progression__part" style={{ width: "33%" }} />
            </div>
          </div>

          <h1 className="rfx-h2" style={{ marginTop: 26 }}>
            Quel problème rencontrez-vous avec {base.denomination} ?
          </h1>
          <p className="rfx-texte" style={{ marginTop: 10 }}>
            Choisissez la situation la plus proche de la vôtre.
          </p>

          <form action={continuer}>
            <div className="rfx-situations" style={{ marginTop: 22 }}>
              {SITUATIONS.map((s) => (
                <div key={s.cle} className="rfx-situation">
                  <label className="rfx-situation__label">
                    <input
                      type="radio"
                      name="situation"
                      value={s.cle}
                      defaultChecked={prechoix === s.cle}
                      required
                    />
                    <span className="rfx-situation__corps" style={{ minWidth: 0 }}>
                      <span className="rfx-situation__titre">{s.libelle}</span>
                      <span className="rfx-situation__desc">{s.desc}</span>
                      {s.sous.length > 0 ? (
                        <span className="rfx-sous">
                          {s.sous.map((sc) => (
                            <label key={sc}>
                              <input
                                type="radio"
                                name={`sous-${s.cle}`}
                                value={sc}
                                defaultChecked={prechoix === s.cle && brouillon.sous === sc}
                              />
                              {sc}
                            </label>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 26 }}>
              <button type="submit" className="rfx-btn rfx-btn--large">
                Continuer
              </button>
              <p className="rfx-mention" style={{ marginTop: 10, textAlign: "center" }}>
                La précision est facultative : vous pourrez tout détailler à l’étape suivante.
              </p>
            </div>
          </form>

          <p className="rfx-mention" style={{ marginTop: 24 }}>
            <Link href={`/signaler/${slug}`}>← Revenir</Link>
          </p>
        </div>
      </div>
    </Page>
  );
}
