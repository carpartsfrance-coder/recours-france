import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { FormulaireAction } from "@/components/formulaire-action";
import { prisma } from "@/lib/db";
import { contesterSignalement } from "../actions";
import { formatSiren } from "@/lib/format";
import { DELAI_REPONSE_JOURS } from "@/lib/contestations";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  return {
    title: entreprise ? `Contester un signalement — ${entreprise.denomination}` : "Contester un signalement",
    robots: { index: false, follow: true },
  };
}

export default async function Contester({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reference?: string }>;
}) {
  const { slug } = await params;
  const { reference } = await searchParams;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  if (!entreprise) notFound();

  return (
    <Page
      fil={[
        { libelle: "Annuaire des entreprises", href: "/entreprises" },
        { libelle: entreprise.denomination, href: `/entreprises/${slug}` },
        { libelle: "Contester un signalement" },
      ]}
    >
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        <div className="rf-deux-colonnes--etroite">
          <div className="rf-min0">
            <h1 className="rf-h1 rf-h1--moyen">Contester un signalement</h1>
            <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 680 }}>
              Fiche concernée : <strong>{entreprise.denomination}</strong>, SIREN {formatSiren(entreprise.siren)}.
              Cette démarche est gratuite et ouverte à toute personne habilitée à représenter l’entreprise.
            </p>

            <div className="rf-encart rf-encart--doux rf-mt-18">
              <strong>Comment votre contestation est traitée.</strong> Le consommateur est immédiatement
              sollicité et dispose de {DELAI_REPONSE_JOURS} jours pour produire sa pièce justificative.{" "}
              <strong>Sans réponse de sa part dans ce délai, le signalement est retiré automatiquement</strong>{" "}
              — la règle s’applique sans exception et sans arbitrage. S’il répond, sa pièce est examinée et le
              signalement retiré si elle ne l’étaye pas. Vous êtes informé de l’issue par email dans les deux
              cas.
            </div>

            <div className="rf-encart rf-mt-14">
              Cette voie porte sur <strong>l’authenticité</strong> d’un signalement : dossier qui ne correspond
              à aucune relation commerciale, doublon, dépôt par un tiers. Elle ne permet pas d’obtenir le
              retrait d’un dossier réel dont vous contestez le bien-fondé. Pour une donnée d’identité inexacte,
              utilisez <Link href={`/entreprises/${slug}/signaler-une-erreur`}>signaler une erreur</Link>.
            </div>

            <div className="rf-carte rf-mt-24" style={{ padding: 24 }}>
              <FormulaireAction action={contesterSignalement} libelle="Envoyer la contestation">
                <input type="hidden" name="slug" value={slug} />

                <div>
                  <label className="rf-champ__label" htmlFor="reference">
                    Référence du dossier contesté
                  </label>
                  <input
                    id="reference"
                    name="reference"
                    className="rf-input"
                    required
                    defaultValue={reference ?? ""}
                    placeholder="RF-2026-08-00000"
                  />
                  <p className="rf-legende rf-mt-8">
                    Elle figure sur le dossier, dans l’onglet « Dossiers » de la fiche.
                  </p>
                </div>

                <div
                  className="rf-grille rf-mt-18"
                  style={{ gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}
                >
                  <div>
                    <label className="rf-champ__label" htmlFor="nom">
                      Votre nom
                    </label>
                    <input id="nom" name="nom" className="rf-input" required maxLength={120} />
                  </div>
                  <div>
                    <label className="rf-champ__label" htmlFor="qualite">
                      Votre fonction
                    </label>
                    <input
                      id="qualite"
                      name="qualite"
                      className="rf-input"
                      required
                      maxLength={120}
                      placeholder="ex. responsable service client"
                    />
                  </div>
                </div>

                <div className="rf-mt-18">
                  <label className="rf-champ__label" htmlFor="email">
                    Email professionnel
                  </label>
                  <input id="email" name="email" type="email" className="rf-input" required />
                  <p className="rf-legende rf-mt-8">
                    Utilisé pour vous informer de l’issue. Il n’est jamais publié.
                  </p>
                </div>

                <div className="rf-mt-18">
                  <label className="rf-champ__label" htmlFor="motif">
                    Motivation de la contestation
                  </label>
                  <textarea
                    id="motif"
                    name="motif"
                    rows={6}
                    required
                    minLength={40}
                    maxLength={4000}
                    className="rf-textarea"
                    placeholder="Expliquez précisément ce qui vous conduit à douter de l’authenticité de ce signalement : absence de commande ou de contrat correspondant, période incompatible, dossier en doublon…"
                  />
                  <p className="rf-legende rf-mt-8">
                    Une contestation non motivée n’ouvre aucune procédure. Ne joignez aucune donnée
                    personnelle de client.
                  </p>
                </div>
              </FormulaireAction>
            </div>
          </div>

          <aside className="rf-min0">
            <div className="rf-carte rf-carte--legere" style={{ padding: 20 }}>
              <div className="rf-etiquette">Ce que la contestation ne fait pas</div>
              <ul className="rf-mt-12" style={{ margin: 0, paddingLeft: 18 }}>
                <li className="rf-texte" style={{ fontSize: 13.5, marginBottom: 10 }}>
                  Elle ne suspend pas la publication pendant le délai de réponse.
                </li>
                <li className="rf-texte" style={{ fontSize: 13.5, marginBottom: 10 }}>
                  Elle ne vous donne pas accès à l’identité du consommateur ni à ses pièces.
                </li>
                <li className="rf-texte" style={{ fontSize: 13.5, marginBottom: 10 }}>
                  Elle ne peut pas être obtenue contre paiement, ni négociée.
                </li>
                <li className="rf-texte" style={{ fontSize: 13.5 }}>
                  Elle ne retire jamais un dossier dont la réalité est établie.
                </li>
              </ul>
              <p className="rf-legende rf-mt-14">
                Voir la <Link href="/charte-de-moderation">charte de modération</Link>.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </Page>
  );
}
