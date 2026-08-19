import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { FormulaireAction } from "@/components/formulaire-action";
import { prisma } from "@/lib/db";
import { AVIS_ACTIFS } from "@/lib/config";
import { deposerAvis } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  return { title: entreprise ? `Laisser un avis sur ${entreprise.denomination}` : "Laisser un avis" };
}

export default async function LaisserUnAvis({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Les avis sont fermés au MVP : voir src/lib/config.ts.
  if (!AVIS_ACTIFS) notFound();
  const { slug } = await params;
  const query = await searchParams;
  const reference = typeof query.ref === "string" ? query.ref : "";

  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  if (!entreprise) notFound();

  return (
    <Page
      fil={[
        { libelle: "Annuaire des entreprises", href: "/entreprises" },
        { libelle: entreprise.denomination, href: `/entreprises/${slug}` },
        { libelle: "Laisser un avis" },
      ]}
    >
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        <div className="rf-deux-colonnes--etroite">
          <div className="rf-min0">
            <h1 className="rf-h1 rf-h1--moyen">Laisser un avis sur {entreprise.denomination}</h1>
            <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 680 }}>
              Un avis est une appréciation subjective. Il est publié séparément des expériences documentées et
              n’entre dans la moyenne que s’il est rattaché à un signalement avec justificatif.
            </p>

            <div className="rf-carte rf-mt-24" style={{ padding: 24 }}>
              <FormulaireAction action={deposerAvis} libelle="Publier mon avis">
                <input type="hidden" name="slug" value={slug} />

                <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="rf-champ__label">Votre note</legend>
                  <div className="rf-segments">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="rf-segment">
                        <input type="radio" name="note" value={n} required />
                        {n} ★
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="rf-mt-18">
                  <label className="rf-champ__label" htmlFor="texte">
                    Votre expérience
                  </label>
                  <textarea
                    id="texte"
                    name="texte"
                    rows={6}
                    maxLength={1200}
                    required
                    className="rf-textarea"
                    placeholder="Restez factuel : ce qui s’est passé, les délais, la réponse obtenue. Sans propos injurieux ni données personnelles de tiers."
                  />
                  <p className="rf-champ__aide">
                    Les avis sont modérés avant publication selon notre{" "}
                    <Link href="/charte-de-moderation">charte de modération</Link>. Aucun avis n’est retiré
                    contre paiement, dans un sens ou dans l’autre.
                  </p>
                </div>

                <div className="rf-grille rf-mt-18" style={{ gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
                  <div>
                    <label className="rf-champ__label" htmlFor="prenom">
                      Prénom
                    </label>
                    <input id="prenom" name="prenom" className="rf-input" required placeholder="Julien" />
                  </div>
                  <div>
                    <label className="rf-champ__label" htmlFor="nom">
                      Nom
                    </label>
                    <input id="nom" name="nom" className="rf-input" required placeholder="Moreau" />
                    <p className="rf-champ__aide">Seule l’initiale est publiée : « Julien M. ».</p>
                  </div>
                  <div>
                    <label className="rf-champ__label" htmlFor="ville">
                      Ville <span className="rf-champ__label-facultatif">(facultatif)</span>
                    </label>
                    <input id="ville" name="ville" className="rf-input" placeholder="Bordeaux" />
                  </div>
                  <div>
                    <label className="rf-champ__label" htmlFor="email">
                      Email
                    </label>
                    <input id="email" name="email" type="email" className="rf-input" required placeholder="vous@courriel.fr" />
                    <p className="rf-champ__aide">Jamais publié. Sert à éviter les avis multiples.</p>
                  </div>
                </div>

                <div className="rf-carte rf-carte--selection rf-mt-18" style={{ padding: "16px 18px" }}>
                  <label className="rf-champ__label" htmlFor="reference">
                    Référence de votre signalement{" "}
                    <span className="rf-champ__label-facultatif">(facultatif, format RF-AAAA-MM-NNNNN)</span>
                  </label>
                  <input
                    id="reference"
                    name="reference"
                    className="rf-input"
                    defaultValue={reference}
                    placeholder="RF-2026-08-41902"
                  />
                  <p className="rf-champ__aide">
                    Un avis rattaché à un signalement <strong>vérifié</strong> déposé avec la même adresse email
                    est distingué visuellement et entre dans la moyenne publiée. Sans référence, l’avis reste
                    publié comme sans justificatif, hors moyenne et hors statistiques.
                  </p>
                </div>

                <label className="rf-case rf-mt-18">
                  <input type="checkbox" name="charte" />
                  <span>
                    Je confirme relater ma propre expérience avec cette entreprise et j’accepte la{" "}
                    <Link href="/charte-de-moderation">charte de modération</Link>.
                  </span>
                </label>
              </FormulaireAction>
            </div>
          </div>

          <aside className="rf-rail">
            <div className="rf-carte" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Avis ou signalement&nbsp;?</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                Un avis raconte votre problème. Un signalement Recours France vous aide à l’organiser et à agir :
                démarches dans le bon ordre, preuves à conserver, médiateur compétent.
              </p>
              <Link href={`/signaler?siren=${entreprise.siren}`} className="rf-btn rf-btn--primaire rf-btn--bloc rf-mt-12">
                Signaler un litige plutôt
              </Link>
            </div>
            <div className="rf-carte rf-carte--teintee" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Ce qui est publié</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                Votre prénom et l’initiale de votre nom, la ville si vous l’indiquez, la note, le texte modéré et
                le niveau de vérification. Jamais votre email ni vos coordonnées.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </Page>
  );
}
