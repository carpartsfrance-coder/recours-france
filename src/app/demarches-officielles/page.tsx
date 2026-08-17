import Link from "next/link";
import type { Metadata } from "next";
import { PageEditoriale } from "@/components/page-editoriale";

export const metadata: Metadata = {
  title: "Démarches officielles disponibles",
  description:
    "Les démarches publiques ouvertes en parallèle d’un signalement Recours France : SignalConso, médiation de la consommation, Centre européen des consommateurs, voie judiciaire.",
};

const DEMARCHES = [
  {
    nom: "SignalConso (DGCCRF)",
    quand: "Pratique commerciale trompeuse, produit dangereux, prix incorrect, fraude, hygiène.",
    ce: "Votre signalement est transmis à l’entreprise et aux enquêteurs de la répression des fraudes. Il ne vise pas à obtenir votre remboursement mais à faire cesser la pratique.",
    url: "https://signal.conso.gouv.fr",
  },
  {
    nom: "Médiation de la consommation",
    quand: "Litige contractuel non résolu, après une réclamation écrite restée sans réponse satisfaisante pendant deux mois.",
    ce: "La saisine est gratuite pour le consommateur. Le médiateur compétent est celui déclaré par le professionnel : il figure dans ses conditions générales et sur son site. L’instruction dure en général 90 jours.",
    url: "https://www.economie.gouv.fr/mediation-conso",
  },
  {
    nom: "Centre européen des consommateurs France",
    quand: "Litige avec un professionnel établi dans un autre pays de l’Union européenne, en Norvège ou en Islande.",
    ce: "Assistance gratuite pour faire valoir vos droits à l’étranger, en liaison avec le centre du pays du professionnel.",
    url: "https://www.europe-consommateurs.eu",
  },
  {
    nom: "Associations de consommateurs agréées",
    quand: "Besoin d’un accompagnement individuel, ou litige susceptible de concerner de nombreux consommateurs.",
    ce: "Les associations agréées peuvent vous conseiller, intervenir auprès du professionnel et engager une action de groupe.",
    url: "https://www.economie.gouv.fr/dgccrf/associations-de-consommateurs-agreees",
  },
  {
    nom: "Tribunal judiciaire",
    quand: "En dernier recours, lorsque les démarches amiables ont échoué. Prescription de cinq ans à compter des faits.",
    ce: "Pour un litige inférieur à 5 000 €, la procédure simplifiée de règlement des petits litiges peut être engagée sans avocat. Votre dossier Recours France et vos pièces sont réutilisables en l’état.",
    url: "https://www.justice.fr",
  },
];

export default function DemarchesOfficielles() {
  return (
    <PageEditoriale
      titre="Démarches officielles disponibles"
      fil="Démarches officielles"
      chapo={
        <>
          Ces démarches sont indépendantes de Recours France et restent ouvertes en parallèle d’un signalement.
          Recours France n’effectue aucune de ces démarches à votre place et n’a aucun lien avec les organismes
          cités.
        </>
      }
      sections={DEMARCHES.map((d, i) => ({
        id: `s${i + 1}`,
        titre: d.nom,
        contenu: (
          <>
            <p>
              <strong>Quand y recourir :</strong> {d.quand}
            </p>
            <p className="rf-mt-12">
              <strong>Ce que la démarche permet :</strong> {d.ce}
            </p>
            <p className="rf-mt-12">
              <a href={d.url} target="_blank" rel="noreferrer noopener" style={{ fontWeight: 600 }}>
                Accéder au site officiel
              </a>
            </p>
          </>
        ),
      }))}
      aside={
        <div className="rf-carte" style={{ padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Dans quel ordre&nbsp;?</div>
          <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
            Un signalement Recours France vous rend le parcours complet, personnalisé selon la catégorie de
            votre litige et les délais applicables.
          </p>
          <Link href="/signaler" className="rf-btn rf-btn--primaire rf-btn--bloc rf-mt-12">
            Signaler mon litige
          </Link>
        </div>
      }
    />
  );
}
