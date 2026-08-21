import Link from "next/link";
import type { Metadata } from "next";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";
import { ModeleLettre } from "@/components/aide/modele-lettre";

export const metadata: Metadata = {
  title: "Produit en panne, garantie refusée : vos droits",
  description:
    "Garantie légale de conformité : deux ans, gratuite, sans preuve à fournir pendant vingt-quatre mois. Ce que le vendeur ne peut pas vous refuser, et la lettre à envoyer.",
  alternates: { canonical: "/aide/garantie-refusee" },
};

export default function GarantieRefusee() {
  return (
    <PageEditoriale
      titre="Produit en panne, garantie refusée : vos droits"
      fil="Garantie refusée"
      maj="21 août 2026"
      chapo={
        <>
          « La garantie constructeur est finie », « c’est une usure normale », « il fallait garder
          l’emballage ». Trois refus courants, et trois arguments sans valeur face à la garantie
          légale de conformité — celle que le vendeur doit, en plus de toute garantie commerciale.
        </>
      }
      sections={[
        {
          id: "distinction",
          titre: "La garantie légale n’est pas la garantie du fabricant",
          contenu: (
            <>
              <p>
                C’est la confusion sur laquelle reposent la plupart des refus. La{" "}
                <strong>garantie commerciale</strong> est facultative, offerte ou vendue par le
                fabricant ou le magasin, avec ses propres conditions et sa propre durée.
              </p>
              <p className="rf-mt-12">
                La <strong>garantie légale de conformité</strong> est due par le vendeur, gratuitement,
                pendant <strong>deux ans</strong> à compter de la délivrance du bien neuf (articles
                L217-3 et L217-7 du code de la consommation). Elle existe même si aucune garantie
                commerciale n’a été souscrite, et même si celle-ci est expirée.
              </p>
              <p className="rf-mt-12">
                Votre interlocuteur est le <strong>vendeur</strong>, pas le fabricant. « Adressez-vous
                au constructeur » n’est pas une réponse recevable.
              </p>
            </>
          ),
        },
        {
          id: "preuve",
          titre: "Vous n’avez rien à prouver pendant deux ans",
          contenu: (
            <>
              <p>
                C’est le point le plus mal connu, et le plus utile. Tout défaut qui apparaît{" "}
                <strong>dans les vingt-quatre mois</strong> suivant la délivrance d’un bien neuf est{" "}
                <strong>présumé exister au moment de l’achat</strong> (article L217-7).
              </p>
              <p className="rf-mt-12">
                Concrètement : ce n’est pas à vous de démontrer que la panne vient d’un défaut. C’est
                au vendeur de démontrer le contraire s’il veut refuser. Pour un bien d’occasion, la
                présomption est de douze mois.
              </p>
              <p className="rf-mt-12">
                Un refus qui n’est pas motivé par une preuve — une expertise, un constat — ne
                renverse pas cette présomption. Demandez la motivation par écrit&nbsp;: elle vous
                servira en médiation.
              </p>
            </>
          ),
        },
        {
          id: "ce-qui-est-du",
          titre: "Ce que vous pouvez exiger",
          contenu: (
            <>
              <p>
                Vous choisissez entre la <strong>réparation</strong> et le <strong>remplacement</strong>.
                Le vendeur ne peut imposer l’autre option que si votre choix entraîne un coût
                manifestement disproportionné (article L217-12).
              </p>
              <ListePuces
                items={[
                  "La mise en conformité est gratuite : ni frais de port, ni main-d’œuvre, ni pièces",
                  "Elle doit intervenir dans un délai de trente jours au plus",
                  "Si elle est impossible, tardive ou vous cause un inconvénient majeur, vous pouvez demander la réduction du prix ou la résolution de la vente",
                  "Toute réparation sous garantie légale prolonge celle-ci de six mois",
                ]}
              />
              <p className="rf-mt-12">
                Ni l’emballage d’origine, ni le ticket de caisse ne sont exigibles. Une preuve d’achat
                suffit — un relevé bancaire, un courriel de confirmation.
              </p>
            </>
          ),
        },
        {
          id: "lettre",
          titre: "La lettre à envoyer",
          contenu: (
            <ModeleLettre
              intitule="Mise en œuvre de la garantie légale de conformité"
              texte={`Objet : Garantie légale de conformité — [produit], achat du [date]

Madame, Monsieur,

J'ai acheté le [date] dans votre établissement [ou sur votre site] le
produit suivant : [description], pour un montant de [montant] €.

Depuis le [date], ce produit présente le défaut suivant : [décrire
factuellement ce qui ne fonctionne pas].

J'ai signalé ce défaut le [date] et votre réponse a été : [reprendre le
motif du refus].

Je fais valoir la garantie légale de conformité des articles L217-3 et
suivants du code de la consommation. Le défaut étant apparu dans les
vingt-quatre mois suivant la délivrance, il est présumé exister au moment de
la vente en application de l'article L217-7 ; il vous appartient d'apporter
la preuve contraire.

Conformément à l'article L217-12, je demande [la réparation / le
remplacement] du produit, sans frais et dans un délai de trente jours.

À défaut, je me réserve la possibilité de demander la réduction du prix ou
la résolution de la vente.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations
distinguées.

[Prénom Nom]
[Adresse]`}
              note="Décrivez le défaut par ce qu’il fait, pas par ce que vous en pensez : « l’écran s’éteint après dix minutes » vaut mieux que « le produit est de mauvaise qualité »."
            />
          ),
        },
        {
          id: "publier",
          titre: "Si le refus persiste",
          contenu: (
            <p>
              Conservez le refus écrit et sa motivation&nbsp;: c’est la pièce la plus utile en
              médiation. Voir <Link href="/aide/mediateur">comment saisir un médiateur</Link>, et{" "}
              <Link href="/signaler">signaler le litige</Link> pour le rendre visible sur la fiche de
              l’entreprise.
            </p>
          ),
        },
      ]}
    />
  );
}
