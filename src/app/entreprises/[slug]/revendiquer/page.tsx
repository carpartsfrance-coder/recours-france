import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { FormulaireAction } from "@/components/formulaire-action";
import { prisma } from "@/lib/db";
import { revendiquerEntreprise } from "../actions";
import { formatSiren } from "@/lib/format";
import { CE_QUE_LA_PLATEFORME_NE_FAIT_PAS } from "@/lib/contenus";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  return {
    title: entreprise ? `Revendiquer la fiche ${entreprise.denomination}` : "Revendiquer une entreprise",
    robots: { index: false, follow: true },
  };
}

export default async function Revendiquer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  if (!entreprise) notFound();

  return (
    <Page
      fil={[
        { libelle: "Annuaire des entreprises", href: "/entreprises" },
        { libelle: entreprise.denomination, href: `/entreprises/${slug}` },
        { libelle: "Revendiquer cette entreprise" },
      ]}
    >
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        <div className="rf-deux-colonnes--etroite">
          <div className="rf-min0">
            <h1 className="rf-h1 rf-h1--moyen">Revendiquer cette entreprise</h1>
            <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 680 }}>
              Fiche concernée : <strong>{entreprise.denomination}</strong>, SIREN {formatSiren(entreprise.siren)}.
              La revendication permet à un représentant habilité de faire corriger les données publiques
              affichées et de renseigner les coordonnées du service consommateurs.
            </p>

            <div className="rf-encart rf-encart--alerte rf-mt-18">
              <strong style={{ color: "var(--rf-encre)" }}>Périmètre actuel.</strong> Recours France ne permet pas
              encore aux professionnels de répondre publiquement aux signalements, ni de recevoir les
              réclamations des consommateurs via la plateforme. Une revendication acceptée ne donne donc aucun
              droit de réponse publié à ce stade, et aucune position ni note ne peut être achetée.
            </div>

            <div className="rf-carte rf-mt-24" style={{ padding: 24 }}>
              <FormulaireAction action={revendiquerEntreprise} libelle="Envoyer ma demande">
                <input type="hidden" name="slug" value={slug} />

                <div className="rf-grille" style={{ gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
                  <div>
                    <label className="rf-champ__label" htmlFor="nomContact">
                      Nom et prénom
                    </label>
                    <input id="nomContact" name="nomContact" className="rf-input" required />
                  </div>
                  <div>
                    <label className="rf-champ__label" htmlFor="fonction">
                      Fonction dans l’entreprise
                    </label>
                    <input id="fonction" name="fonction" className="rf-input" required placeholder="ex. directrice du service client" />
                  </div>
                  <div>
                    <label className="rf-champ__label" htmlFor="emailPro">
                      Email professionnel
                    </label>
                    <input id="emailPro" name="emailPro" type="email" className="rf-input" required placeholder="prenom.nom@entreprise.fr" />
                    <p className="rf-champ__aide">Une adresse au nom de domaine de l’entreprise accélère la vérification.</p>
                  </div>
                  <div>
                    <label className="rf-champ__label" htmlFor="telephone">
                      Téléphone <span className="rf-champ__label-facultatif">(facultatif)</span>
                    </label>
                    <input id="telephone" name="telephone" className="rf-input" />
                  </div>
                  <div>
                    <label className="rf-champ__label" htmlFor="siretJustifie">
                      SIRET de rattachement <span className="rf-champ__label-facultatif">(facultatif)</span>
                    </label>
                    <input id="siretJustifie" name="siretJustifie" className="rf-input" defaultValue={entreprise.siretSiege ?? ""} />
                  </div>
                </div>

                <div className="rf-mt-18">
                  <label className="rf-champ__label" htmlFor="message">
                    Précisions <span className="rf-champ__label-facultatif">(facultatif)</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    maxLength={1500}
                    className="rf-textarea"
                    placeholder="Coordonnées exactes du service consommateurs, médiateur de la consommation compétent, données à corriger."
                  />
                </div>

                <label className="rf-case rf-mt-18">
                  <input type="checkbox" name="engagement" />
                  <span>
                    Je certifie être habilité à représenter cette entreprise et j’accepte que Recours France
                    vérifie cette qualité avant toute modification de la fiche.
                  </span>
                </label>
              </FormulaireAction>
            </div>
          </div>

          <aside className="rf-rail">
            <div className="rf-carte" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Ce que la revendication permet</div>
              <ul className="rf-pile rf-pile--serree rf-mt-12" style={{ gap: 8 }}>
                {[
                  "Faire corriger une donnée publique inexacte affichée sur la fiche",
                  "Renseigner l’email et le téléphone du service consommateurs",
                  "Déclarer le médiateur de la consommation compétent",
                  "Obtenir le détail du calcul appliqué à la fiche",
                ].map((t) => (
                  <li key={t} className="rf-item">
                    <span className="rf-puce rf-puce--sm rf-puce--doux" aria-hidden="true">
                      ✓
                    </span>
                    <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rf-carte rf-carte--legere" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Ce que la plateforme ne fait pas</div>
              <ul className="rf-pile rf-pile--serree rf-mt-12" style={{ gap: 8 }}>
                {CE_QUE_LA_PLATEFORME_NE_FAIT_PAS.slice(0, 4).map((t) => (
                  <li key={t} className="rf-item">
                    <span className="rf-puce rf-puce--vide" aria-hidden="true">
                      —
                    </span>
                    <span style={{ fontSize: 13, lineHeight: 1.5 }}>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="rf-mt-12">
                <Link href="/methodologie#m7" style={{ fontSize: 13, fontWeight: 600 }}>
                  Lire la méthodologie complète
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </Page>
  );
}
