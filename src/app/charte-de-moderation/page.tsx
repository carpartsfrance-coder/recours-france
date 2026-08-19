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
                    du nom. Un avis rattaché à un dossier accompagné d’un justificatif est distingué et entre dans la moyenne ; les
                    autres sont publiés hors moyenne et hors statistiques.
                  </>,
                ]}
              />
            </>
          ),
        },
        {
          id: "mentions-legales-avis",
          titre: "Mentions obligatoires sur le traitement des avis",
          contenu: (
            <>
              <p>
                Les mentions qui suivent sont exigées par l’article L111-7-2 du code de la consommation et ses
                textes d’application. Elles décrivent le fonctionnement réel de la plateforme, et non une
                intention.
              </p>
              <ListePuces
                items={[
                  <>
                    <strong>Contrôle préalable</strong> : les signalements sont publiés sans contrôle humain
                    préalable. Un justificatif peut être déposé par le consommateur ; il n’est pas examiné
                    systématiquement, mais il l’est dès qu’un signalement fait l’objet d’une contestation
                    motivée. Le niveau de vérification atteint est affiché sur chaque dossier.
                  </>,
                  <>
                    <strong>Dates affichées</strong> : la date de l’expérience de consommation déclarée par le
                    consommateur et la date de publication du contenu figurent sur chaque dossier et chaque
                    avis, ainsi que la date de leur dernière mise à jour.
                  </>,
                  <>
                    <strong>Délai de publication</strong> : la publication est immédiate après le dépôt. Aucun
                    délai n’est appliqué, et aucun contenu n’est retenu en attente d’une intervention.
                  </>,
                  <>
                    <strong>Durée de conservation</strong> : cinq ans à compter du dépôt, puis suppression
                    automatique. Les justificatifs sont supprimés au bout de vingt-quatre mois. Le détail
                    figure dans la page <Link href="/donnees-personnelles">Données personnelles</Link>.
                  </>,
                  <>
                    <strong>Critères de classement</strong> : les dossiers et les avis sont présentés par ordre
                    antichronologique, du plus récent au plus ancien. Aucun autre critère n’intervient, et
                    aucun classement ne peut être modifié à la demande.
                  </>,
                  <>
                    <strong>Contrepartie</strong> : aucune contrepartie, financière ou en nature, n’est versée
                    ni reçue en échange du dépôt, de la publication, du retrait ou du classement d’un contenu.
                    Aucune entreprise ne paie pour figurer, disparaître ou être mieux placée.
                  </>,
                  <>
                    <strong>Motifs de refus</strong> : ils sont énumérés à la section « Ce qui est refusé ».
                    Tout refus est notifié à l’auteur avec son motif.
                  </>,
                  <>
                    <strong>Contact de l’auteur</strong> : la plateforme ne permet pas de contacter directement
                    l’auteur d’un signalement ou d’un avis, et ne communique jamais ses coordonnées.
                  </>,
                ]}
              />
              <p className="rf-mt-14">
                <strong>Signaler un doute sur l’authenticité d’un contenu.</strong> Toute entreprise concernée
                par un signalement ou un avis dispose d’une fonctionnalité gratuite pour en contester
                l’authenticité, à condition que le signalement soit motivé. La demande se dépose depuis la
                fiche concernée, sur le lien « Contester ce dossier » présent sur chaque dossier publié.
              </p>
              <p className="rf-mt-14">
                Le consommateur est alors sollicité et dispose de <strong>sept jours</strong> pour produire sa
                pièce justificative. <strong>Sans réponse de sa part dans ce délai, le signalement est retiré
                automatiquement</strong> : cette règle s’applique sans exception et sans appréciation au cas
                par cas. S’il répond, sa pièce est examinée et le signalement retiré si elle ne l’étaye pas.
                Les deux parties sont informées de l’issue.
              </p>
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
                Un avis est modéré sous 3 jours ouvrés. Un justificatif n’est examiné qu’en cas de contestation motivée. Une
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
                déclassé ou retiré. Un signalement accompagné d’un justificatif n’est jamais retiré sur simple demande, ni contre
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
