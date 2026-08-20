import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Page } from "@/components/chrome";
import { resoudreCible } from "@/lib/cible";
import { SITUATIONS, situationParCle } from "@/lib/tunnel";
import { ecrireBrouillon, lireBrouillon } from "@/lib/brouillon";
import { delaiCourtPourMotif } from "@/lib/droits";
import { PARCOURS } from "@/components/tunnel/vignettes";

/**
 * Écran d'entrée du tunnel : la question, tout de suite.
 *
 * Il y avait ici une page d'argumentaire — promesse, bénéfices, aperçu — avant
 * que l'étape 1 ne pose enfin la question. Or le visiteur arrive d'une fiche
 * qui compte déjà deux mille huit cents mots d'argumentaire : on lui en
 * servait un second avant de l'écouter.
 *
 * SignalConso, dont le taux de passage est connu pour être bon, fait
 * l'inverse : sept cent vingt-huit mots sur l'accueil, aucune promesse, et
 * dix-neuf situations concrètes posées d'emblée. L'argumentaire vit sur les
 * pages de catégorie — chez nous, sur la fiche entreprise.
 *
 * Les deux écrans sont donc fusionnés. Il reste un bandeau de réassurance
 * compact, parce que nous ne sommes pas un service de l'État et que la
 * question « qui êtes-vous pour me demander ça » se pose ici, pas chez eux.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cible = await resoudreCible(slug);
  if (!cible) return {};
  return {
    title: `Réclamation ${cible.nom} : quel est votre problème ?`,
    description: `Un problème avec ${cible.nom} ? Choisissez votre situation et obtenez gratuitement votre lettre de réclamation, le délai applicable et les recours possibles.`,
    alternates: { canonical: `/signaler/${cible.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function EntreeTunnel({
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
      entete={{ baseline: "Observatoire des problèmes consommateurs", navActive: "annuaire" }}
      fil={[
        { libelle: "Annuaire", href: "/annuaire" },
        ...(cible.slugFiche ? [{ libelle: cible.nom, href: `/entreprises/${cible.slugFiche}` }] : []),
        { libelle: "Réclamation" },
      ]}
    >
      <div className="rfx">
        <div className="rfx-tunnel rfx-avec-barre" style={{ padding: "0 20px 56px" }}>
          <div className="rfx-progression">
            <div className="rfx-progression__texte">Étape 1 sur 3</div>
            <div className="rfx-progression__piste">
              <div className="rfx-progression__part" style={{ width: "33%" }} />
            </div>
          </div>

          <h1 className="rfx-h2" style={{ marginTop: 26 }}>
            Quel problème rencontrez-vous avec {cible.nom} ?
          </h1>
          <p className="rfx-texte" style={{ marginTop: 10 }}>
            Choisissez la situation la plus proche de la vôtre. Le délai que le professionnel doit
            tenir et le texte qui le fonde vous seront indiqués à l’étape suivante.
          </p>

          <form action={continuer} id="tunnel-situation">
            <div className="rfx-situations" style={{ marginTop: 22 }}>
              {SITUATIONS.map((s) => {
                const delai = delaiCourtPourMotif(s.categorie);
                return (
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
                        <span
                          style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}
                        >
                          <span className="rfx-situation__titre">{s.libelle}</span>
                          {/* Le délai dès le choix : il transforme une liste de
                              rubriques en liste de leviers. */}
                          {delai ? (
                            <span
                              className="rfx-chiffre"
                              style={{ flex: "none", fontSize: 13, color: "var(--x-bleu)", fontWeight: 700 }}
                            >
                              {delai}
                            </span>
                          ) : null}
                        </span>
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
                );
              })}
            </div>

            <div style={{ marginTop: 26 }}>
              <button type="submit" className="rfx-btn rfx-btn--large">
                Continuer
              </button>
              <p className="rfx-mention" style={{ marginTop: 10, textAlign: "center" }}>
                Environ 1 minute · Gratuit · Sans compte ni mot de passe
              </p>
            </div>
          </form>

          {/* Le parcours en quatre temps, sous la question et non au-dessus :
              la personne choisit d'abord, se rassure ensuite. Un écart assumé à
              la charte, qui proscrit l'illustration — l'austérité sert la fiche
              et dessert le tunnel, où quelqu'un arrive en colère. */}
          <div className="rfx-parcours">
            {PARCOURS.map(({ Vignette, titre, desc }) => (
              <div key={titre} className="rfx-parcours__etape">
                <span className="rfx-parcours__vignette">
                  <Vignette taille={56} />
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 700, display: "block", marginTop: 10 }}>
                  {titre}
                </span>
                <span className="rfx-mention" style={{ display: "block", marginTop: 4 }}>
                  {desc}
                </span>
              </div>
            ))}
          </div>

          {/* Réassurance compacte : nous ne sommes pas un service de l'État, et
              la question « qui êtes-vous » se pose donc ici. Trois lignes, en
              pied de page — pas un argumentaire. */}
          <div className="rfx-bloc rfx-bloc--alt" style={{ marginTop: 32, padding: "14px 16px" }}>
            <p className="rfx-source" style={{ margin: 0 }}>
              Vous obtenez gratuitement votre lettre de réclamation, le délai applicable et l’ordre des
              démarches. Recours France ne transmet pas votre réclamation au professionnel et
              n’intervient pas dans le règlement du litige : c’est vous qui envoyez le courrier.
              {cible.entrepriseId ? " Votre problème apparaît aussi sur la fiche de l’entreprise." : ""}
            </p>
          </div>
        </div>

        {/* La liste des situations dépasse l'écran sur mobile : le bouton
            reste sous le pouce, rattaché au formulaire par son identifiant. */}
        <div className="rfx-barre-fixe">
          <button type="submit" form="tunnel-situation" className="rfx-btn rfx-btn--large">
            Continuer
          </button>
        </div>
      </div>
    </Page>
  );
}
