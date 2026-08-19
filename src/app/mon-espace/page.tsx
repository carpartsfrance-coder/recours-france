import Link from "next/link";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { FormulaireAcces } from "./formulaire-acces";

export const metadata: Metadata = {
  title: "Retrouver mon signalement",
  description:
    "Retrouvez et mettez à jour votre signalement Recours France depuis votre adresse email, sans création de compte.",
  robots: { index: false, follow: true },
};

export default function MonEspace() {
  return (
    <Page entete={{ navActive: "espace" }} fil={[{ libelle: "Mon espace" }]}>
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        <div className="rf-deux-colonnes--etroite">
          <div className="rf-min0">
            <h1 className="rf-h1 rf-h1--moyen">Retrouver mon signalement</h1>
            <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 660 }}>
              Recours France ne crée aucun compte. Indiquez l’adresse email utilisée lors du signalement : vous
              recevez immédiatement un lien personnel pour le consulter, le mettre à jour, ajouter un
              justificatif ou confirmer une résolution.
            </p>

            <FormulaireAcces />

            <div className="rf-carte rf-carte--legere rf-mt-20" style={{ padding: "20px 22px", maxWidth: 620 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Ce que vous pouvez faire depuis votre espace</div>
              <ul className="rf-pile rf-pile--serree rf-mt-12" style={{ gap: 8 }}>
                {[
                  "Ajouter un justificatif pour appuyer votre signalement",
                  "Enregistrer une réponse reçue du professionnel",
                  "Mettre à jour le statut déclaré de votre litige",
                  "Confirmer une résolution — seule votre confirmation la rend comptabilisable",
                  "Télécharger le récapitulatif et le modèle de relance",
                  "Clôturer ou demander la suppression de votre signalement",
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
          </div>

          <aside className="rf-rail">
            <div className="rf-carte" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Vous n’avez pas encore signalé&nbsp;?</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                Le signalement est gratuit, prend 3 à 5 minutes et ne demande aucun compte.
              </p>
              <Link href="/signaler" className="rf-btn rf-btn--primaire rf-btn--bloc rf-mt-12">
                Signaler un litige
              </Link>
            </div>
            <div className="rf-carte rf-carte--teintee" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Supprimer mes données</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                Vous pouvez demander la suppression de votre signalement et de vos pièces à tout moment, par
                simple email, sans justification.
              </p>
              <p className="rf-mt-10">
                <Link href="/donnees-personnelles" style={{ fontSize: 13, fontWeight: 600 }}>
                  Vos droits sur vos données
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </Page>
  );
}
