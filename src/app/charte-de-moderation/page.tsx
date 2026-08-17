import Link from "next/link";
import type { Metadata } from "next";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";

export const metadata: Metadata = {
  title: "Charte de modération",
  description:
    "Règles de publication et de retrait des avis et signalements sur Recours France : critères, délais et voies de contestation.",
};

export default function CharteModeration() {
  return (
    <PageEditoriale
      titre="Charte de modération"
      fil="Charte de modération"
      maj="17 août 2026"
      chapo="Cette charte est opposable : elle décrit exactement ce qui est publié, ce qui est refusé et dans quels délais. Aucune publication, aucun retrait et aucune position ne peuvent être obtenus contre paiement."
      sections={[
        {
          id: "s1",
          titre: "Ce qui est publié",
          contenu: (
            <>
              <p>Deux types de contenus coexistent, toujours distingués visuellement :</p>
              <ListePuces
                items={[
                  <>
                    <strong>Les expériences documentées</strong> : données structurées d’un signalement
                    (catégorie, montant, date, statut, niveau de vérification), accompagnées d’un résumé factuel
                    rédigé par la plateforme. Aucun texte libre du consommateur n’est publié en l’état.
                  </>,
                  <>
                    <strong>Les avis</strong> : appréciations subjectives, publiées avec le prénom et l’initiale
                    du nom. Un avis rattaché à un signalement vérifié est distingué et entre dans la moyenne ; les
                    autres sont publiés hors moyenne et hors statistiques.
                  </>,
                ]}
              />
            </>
          ),
        },
        {
          id: "s2",
          titre: "Ce qui est refusé",
          contenu: (
            <ListePuces
              items={[
                "Les propos injurieux, diffamatoires, discriminatoires, menaçants ou incitant à la haine.",
                "Les données personnelles de tiers : nom d’un salarié, coordonnées, numéro de dossier d’un autre consommateur.",
                "Les accusations pénales formulées comme des faits établis (« escroquerie », « fraude ») sans décision de justice.",
                "Les contenus manifestement hors sujet, publicitaires, ou déposés par un concurrent.",
                "Les avis déposés par une personne qui n’est pas le consommateur concerné, ou les dépôts multiples.",
                "Les contenus manifestement rédigés de façon automatisée ou en série.",
              ]}
            />
          ),
        },
        {
          id: "s3",
          titre: "Délais et décisions",
          contenu: (
            <>
              <p>
                Un avis est modéré sous 3 jours ouvrés. Un justificatif est contrôlé sous 48 heures ouvrées. Une
                demande de rectification est traitée sous 15 jours.
              </p>
              <p className="rf-mt-12">
                Chaque décision est motivée et notifiée par email à son auteur. Un avis refusé peut être
                republié après correction du motif de refus. Toutes les décisions de modération sont tracées dans
                un journal d’audit interne.
              </p>
            </>
          ),
        },
        {
          id: "s4",
          titre: "Retrait à la demande",
          contenu: (
            <>
              <p>
                <strong>Le consommateur</strong> peut supprimer son signalement ou son avis à tout moment, sans
                justification, depuis son espace.
              </p>
              <p className="rf-mt-12">
                <strong>L’entreprise</strong> peut signaler une erreur ou contester la réalité d’un signalement en
                produisant des éléments contraires. Le signalement est alors réexaminé et, le cas échéant,
                déclassé ou retiré. Un signalement vérifié n’est jamais retiré sur simple demande, ni contre
                paiement, ni en échange d’une prestation.
              </p>
            </>
          ),
        },
        {
          id: "s5",
          titre: "Indépendance",
          contenu: (
            <p>
              Aucune position dans l’annuaire, aucune note, aucun retrait et aucun classement ne sont
              commercialisés. Les indices sont recalculés quotidiennement par un traitement automatique et ne
              sont jamais ajustés manuellement. Les règles de calcul sont publiées dans la{" "}
              <Link href="/methodologie">méthodologie</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
