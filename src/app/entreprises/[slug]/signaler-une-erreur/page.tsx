import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { FormulaireAction } from "@/components/formulaire-action";
import { prisma } from "@/lib/db";
import { signalerErreur } from "../actions";
import { formatSiren } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  return {
    title: entreprise ? `Signaler une erreur — ${entreprise.denomination}` : "Signaler une erreur",
    robots: { index: false, follow: true },
  };
}

const DONNEES = [
  "Dénomination sociale",
  "Nom commercial ou enseigne",
  "Forme juridique",
  "Adresse du siège",
  "Activité principale (NAF)",
  "Représentant légal",
  "Capital social",
  "État administratif",
  "Établissements",
  "Comptes annuels",
  "Coordonnées du service consommateurs",
  "Médiateur de la consommation",
  "Événement légal affiché",
  "Autre donnée",
];

export default async function SignalerUneErreur({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  if (!entreprise) notFound();

  return (
    <Page
      fil={[
        { libelle: "Annuaire des entreprises", href: "/entreprises" },
        { libelle: entreprise.denomination, href: `/entreprises/${slug}` },
        { libelle: "Signaler une erreur" },
      ]}
    >
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        <div className="rf-deux-colonnes--etroite">
          <div className="rf-min0">
            <h1 className="rf-h1 rf-h1--moyen">Signaler une erreur sur cette fiche</h1>
            <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 680 }}>
              Fiche concernée : <strong>{entreprise.denomination}</strong>, SIREN {formatSiren(entreprise.siren)}.
              Une donnée inexacte est corrigée sous 15 jours après examen des pièces fournies.
            </p>

            <div className="rf-encart rf-encart--doux rf-mt-18">
              Les données d’identité proviennent des registres publics. Une erreur dans Sirene, au RNE ou au
              BODACC doit être rectifiée <strong>à la source</strong>, auprès du registre concerné : la fiche se
              met à jour à la synchronisation suivante. Nous corrigeons directement ce qui relève de Recours
              France (rattachement, coordonnées, médiateur, affichage).
            </div>

            <div className="rf-carte rf-mt-24" style={{ padding: 24 }}>
              <FormulaireAction action={signalerErreur} libelle="Envoyer le signalement d’erreur">
                <input type="hidden" name="slug" value={slug} />

                <div>
                  <label className="rf-champ__label" htmlFor="champ">
                    Donnée concernée
                  </label>
                  <select id="champ" name="champ" className="rf-select" required defaultValue="">
                    <option value="" disabled>
                      Choisir la donnée
                    </option>
                    {DONNEES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rf-grille rf-mt-18" style={{ gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
                  <div>
                    <label className="rf-champ__label" htmlFor="valeurActuelle">
                      Valeur affichée <span className="rf-champ__label-facultatif">(facultatif)</span>
                    </label>
                    <input id="valeurActuelle" name="valeurActuelle" className="rf-input" />
                  </div>
                  <div>
                    <label className="rf-champ__label" htmlFor="valeurProposee">
                      Valeur exacte <span className="rf-champ__label-facultatif">(facultatif)</span>
                    </label>
                    <input id="valeurProposee" name="valeurProposee" className="rf-input" />
                  </div>
                </div>

                <div className="rf-mt-18">
                  <label className="rf-champ__label" htmlFor="explication">
                    Explication
                  </label>
                  <textarea
                    id="explication"
                    name="explication"
                    rows={5}
                    required
                    maxLength={1500}
                    className="rf-textarea"
                    placeholder="Indiquez en quoi la donnée est inexacte et, si possible, la référence de la publication officielle qui fait foi."
                  />
                </div>

                <div className="rf-grille rf-mt-18" style={{ gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
                  <div>
                    <label className="rf-champ__label" htmlFor="email">
                      Votre email
                    </label>
                    <input id="email" name="email" type="email" required className="rf-input" placeholder="vous@courriel.fr" />
                  </div>
                  <div>
                    <label className="rf-champ__label" htmlFor="qualite">
                      Votre qualité <span className="rf-champ__label-facultatif">(facultatif)</span>
                    </label>
                    <input id="qualite" name="qualite" className="rf-input" placeholder="ex. dirigeant, consommateur, tiers" />
                  </div>
                </div>
              </FormulaireAction>
            </div>
          </div>

          <aside className="rf-rail">
            <div className="rf-carte" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Vous représentez cette entreprise&nbsp;?</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                La revendication de fiche permet de corriger les données publiques affichées et de renseigner
                les coordonnées de votre service consommateurs.
              </p>
              <Link href={`/entreprises/${slug}/revendiquer`} className="rf-btn rf-btn--secondaire rf-btn--bloc rf-mt-12">
                Revendiquer cette entreprise
              </Link>
            </div>
            <div className="rf-carte rf-carte--teintee" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Contester un signalement</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                Un signalement vérifié n’est pas retiré sur simple demande ni contre paiement. Seule une erreur
                établie, pièces à l’appui, justifie un déclassement ou un retrait.
              </p>
              <p className="rf-mt-10">
                <Link href="/methodologie#m6" style={{ fontSize: 13, fontWeight: 600 }}>
                  Rectification et contestation
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </Page>
  );
}
