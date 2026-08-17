import Link from "next/link";
import type { Metadata } from "next";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";
import { CE_QUE_LA_PLATEFORME_NE_FAIT_PAS } from "@/lib/contenus";

export const metadata: Metadata = {
  title: "À propos et indépendance",
  description:
    "Qui édite Recours France, comment le service est financé, et pourquoi il n’est ni un service de l’État ni une autorité administrative.",
};

export default function APropos() {
  return (
    <PageEditoriale
      titre="À propos et indépendance"
      fil="À propos"
      maj="17 août 2026"
      chapo={
        <>
          Recours France est une plateforme privée indépendante. Elle n’est ni un service de l’État, ni une
          autorité administrative, et ne dispose d’aucun agrément public. Cette page explique ce que fait le
          service, comment il se finance et quelles garanties encadrent son indépendance.
        </>
      }
      sections={[
        {
          id: "s1",
          titre: "Ce que fait Recours France",
          contenu: (
            <>
              <p>
                Un consommateur en litige avec une entreprise dispose de droits, mais rarement de la méthode :
                dans quel ordre agir, quelles preuves conserver, à partir de quand un médiateur devient
                saisissable. Recours France répond à cette question, gratuitement, en trois à cinq minutes et
                sans création de compte.
              </p>
              <p className="rf-mt-12">
                En parallèle, la plateforme constitue des fiches d’entreprises à partir des registres publics, et
                y rattache les signalements déposés — publiés sous forme structurée, jamais nominative, avec leur
                niveau de vérification.
              </p>
            </>
          ),
        },
        {
          id: "s2",
          titre: "Ce que Recours France ne fait pas",
          contenu: <ListePuces items={CE_QUE_LA_PLATEFORME_NE_FAIT_PAS} />,
        },
        {
          id: "s3",
          titre: "Indépendance et financement",
          contenu: (
            <>
              <p>
                Le service au consommateur est gratuit et le restera pour le dépôt, le suivi et la consultation
                des fiches. Aucun revenu ne provient des entreprises référencées : ni abonnement de visibilité,
                ni retrait de signalement, ni ajustement de note.
              </p>
              <p className="rf-mt-12">
                Le modèle économique repose sur de futurs services optionnels destinés aux consommateurs, ainsi
                que sur la réutilisation documentée des données publiques. Toute évolution du financement sera
                publiée sur cette page, avec sa date d’entrée en vigueur.
              </p>
            </>
          ),
        },
        {
          id: "s4",
          titre: "Absence de lien avec l’État",
          contenu: (
            <>
              <p>
                Recours France n’utilise aucun élément du Système de design de l’État, ni la police Marianne, ni
                le bloc-marque « République Française ». Le bandeau d’indépendance est affiché sur toutes les
                pages du site.
              </p>
              <p className="rf-mt-12">
                Les démarches officielles — notamment SignalConso pour la DGCCRF — sont citées lorsqu’elles sont
                pertinentes, et restent ouvertes en parallèle de tout signalement déposé ici. Voir les{" "}
                <Link href="/demarches-officielles">démarches officielles</Link>.
              </p>
            </>
          ),
        },
        {
          id: "s5",
          titre: "Transparence de la méthode",
          contenu: (
            <p>
              Les règles de calcul, les seuils de publication et les critères de vérification sont publiés dans
              la <Link href="/methodologie">méthodologie</Link>, qui fait partie des conditions générales. Chaque
              donnée affichée sur une fiche porte sa source et sa date de vérification, et les données brutes
              d’une fiche sont accessibles en lecture via une API publique.
            </p>
          ),
        },
      ]}
    />
  );
}
