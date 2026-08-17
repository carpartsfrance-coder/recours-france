import Link from "next/link";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { FormulaireAction } from "@/components/formulaire-action";
import { envoyerContact } from "./actions";

export const metadata: Metadata = {
  title: "Nous contacter",
  description: "Écrire à Recours France : question sur un chiffre, rectification, suppression de données, presse.",
};

const SUJETS = [
  "Question sur un signalement en cours",
  "Demande de rectification d’une donnée",
  "Suppression de mes données personnelles",
  "Détail du calcul appliqué à une fiche",
  "Contestation d’un signalement (entreprise)",
  "Accès à l’API et réutilisation des données",
  "Presse et partenariats",
  "Autre demande",
];

export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sujetInitial = typeof params.sujet === "string" ? params.sujet : "";

  return (
    <Page fil={[{ libelle: "Nous contacter" }]}>
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        <div className="rf-deux-colonnes--etroite">
          <div className="rf-min0">
            <h1 className="rf-h1 rf-h1--moyen">Nous contacter</h1>
            <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 660 }}>
              Consommateur ou entreprise, écrivez-nous : nous répondons sous 5 jours ouvrés. Pour une demande
              portant sur un signalement précis, indiquez sa référence.
            </p>

            <div className="rf-carte rf-mt-24" style={{ padding: 24 }}>
              <FormulaireAction action={envoyerContact} libelle="Envoyer le message">
                <div>
                  <label className="rf-champ__label" htmlFor="sujet">
                    Sujet
                  </label>
                  <select
                    id="sujet"
                    name="sujet"
                    className="rf-select"
                    required
                    defaultValue={sujetInitial === "lancement" ? "Autre demande" : ""}
                  >
                    <option value="" disabled>
                      Choisir un sujet
                    </option>
                    {SUJETS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rf-grille rf-mt-18" style={{ gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
                  <div>
                    <label className="rf-champ__label" htmlFor="email">
                      Votre email
                    </label>
                    <input id="email" name="email" type="email" required className="rf-input" placeholder="vous@courriel.fr" />
                  </div>
                  <div>
                    <label className="rf-champ__label" htmlFor="reference">
                      Référence <span className="rf-champ__label-facultatif">(facultatif)</span>
                    </label>
                    <input id="reference" name="reference" className="rf-input" placeholder="RF-2026-08-41902" />
                  </div>
                </div>

                <div className="rf-mt-18">
                  <label className="rf-champ__label" htmlFor="message">
                    Votre message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={7}
                    required
                    maxLength={2000}
                    className="rf-textarea"
                    defaultValue={
                      sujetInitial === "lancement"
                        ? "Je souhaite être informé du lancement du service de prise en charge des réclamations."
                        : ""
                    }
                  />
                  <p className="rf-champ__aide">
                    N’indiquez aucune donnée sensible (moyen de paiement, pièce d’identité, données de santé).
                  </p>
                </div>
              </FormulaireAction>
            </div>
          </div>

          <aside className="rf-rail">
            <div className="rf-carte" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Réponses immédiates</div>
              <div className="rf-pile rf-pile--serree rf-mt-12" style={{ gap: 9 }}>
                <Link href="/aide" style={{ fontSize: 13.5 }}>
                  Questions fréquentes
                </Link>
                <Link href="/mon-espace" style={{ fontSize: 13.5 }}>
                  Retrouver et supprimer mon signalement
                </Link>
                <Link href="/methodologie" style={{ fontSize: 13.5 }}>
                  Méthodologie et calcul des indices
                </Link>
                <Link href="/entreprises" style={{ fontSize: 13.5 }}>
                  Signaler une erreur sur une fiche
                </Link>
              </div>
            </div>
            <div className="rf-carte rf-carte--teintee" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Ce que nous ne pouvons pas faire</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                Nous ne contactons pas le professionnel à votre place, ne suivons pas votre procédure et ne
                délivrons pas de conseil juridique personnalisé.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </Page>
  );
}
