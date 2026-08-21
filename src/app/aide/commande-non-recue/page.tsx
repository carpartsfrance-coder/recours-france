import Link from "next/link";
import type { Metadata } from "next";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";
import { ModeleLettre } from "@/components/aide/modele-lettre";

export const metadata: Metadata = {
  title: "Commande non reçue : quels recours ?",
  description:
    "Colis jamais livré ou annoncé livré sans l’être : le délai de 30 jours, la résolution du contrat, la lettre à envoyer et la charge de la preuve, qui pèse sur le vendeur.",
  alternates: { canonical: "/aide/commande-non-recue" },
};

export default function CommandeNonRecue() {
  return (
    <PageEditoriale
      titre="Commande non reçue : quels recours ?"
      fil="Commande non reçue"
      maj="21 août 2026"
      chapo={
        <>
          Colis jamais arrivé, livraison annoncée mais introuvable, retard qui s’éternise. Le point
          décisif est celui que les vendeurs rappellent rarement&nbsp;: <strong>la preuve de la
          livraison leur incombe</strong>, pas à vous.
        </>
      }
      sections={[
        {
          id: "delai",
          titre: "Trente jours au maximum, sauf date convenue",
          contenu: (
            <>
              <p>
                À défaut de date de livraison indiquée, le professionnel doit livrer{" "}
                <strong>au plus tard trente jours après la commande</strong> (article L216-1 du code
                de la consommation). Si une date a été annoncée, c’est celle-là qui vaut.
              </p>
              <p className="rf-mt-12">
                Passé ce délai, vous pouvez mettre le vendeur en demeure de livrer dans un délai
                raisonnable, puis <strong>résoudre le contrat</strong> s’il ne s’exécute toujours pas
                (article L216-6). Le remboursement est alors dû{" "}
                <strong>dans les quatorze jours</strong> qui suivent, et sa totalité — pas une partie,
                pas un avoir.
              </p>
              <p className="rf-mt-12">
                Un avoir ne s’impose jamais à vous. Vous pouvez l’accepter, jamais y être contraint.
              </p>
            </>
          ),
        },
        {
          id: "preuve",
          titre: "« Le transporteur dit l’avoir livré »",
          contenu: (
            <>
              <p>
                C’est la réponse la plus fréquente, et elle ne change rien à votre situation. Le
                contrat vous lie au <strong>vendeur</strong>, pas au transporteur. C’est au vendeur de
                prouver que le bien vous a été remis, et le transporteur est son sous-traitant&nbsp;:
                un litige entre eux ne vous concerne pas.
              </p>
              <p className="rf-mt-12">
                Un statut « livré » dans un outil de suivi n’est pas une preuve de remise. Une
                signature qui n’est pas la vôtre non plus. Écrivez-le, calmement, et demandez la
                preuve.
              </p>
              <p className="rf-mt-12">
                Le vendeur reste également responsable de la perte ou de la détérioration du bien
                jusqu’à ce que vous en preniez physiquement possession (article L216-4).
              </p>
            </>
          ),
        },
        {
          id: "avant",
          titre: "Ce qu’il faut réunir",
          contenu: (
            <ListePuces
              items={[
                "Le numéro de commande, sa date, et la date de livraison annoncée",
                "Le montant payé et le moyen de paiement",
                "Les captures du suivi, y compris le statut « livré » s’il existe",
                "Vos échanges avec le service client, dans l’ordre chronologique",
                "Le nom de la personne qui aurait signé, s’il apparaît",
              ]}
            />
          ),
        },
        {
          id: "lettre",
          titre: "La lettre à envoyer",
          contenu: (
            <ModeleLettre
              intitule="Mise en demeure de livrer ou de rembourser"
              texte={`Objet : Commande [numéro] non livrée — mise en demeure

Madame, Monsieur,

Le [date], j'ai commandé [description] pour un montant de [montant] €
(commande n° [numéro]). La livraison était annoncée pour le [date].

À ce jour, je n'ai jamais reçu ce bien. [Le suivi indique une livraison le
[date], mais aucun colis ne m'a été remis et la signature figurant sur le
justificatif n'est pas la mienne.]

L'article L216-1 du code de la consommation impose la livraison au plus
tard trente jours après la commande. L'article L216-4 place la charge de la
preuve de la remise, ainsi que le risque de perte, sur le vendeur jusqu'à ce
que le consommateur prenne physiquement possession du bien.

Je vous mets en demeure de procéder à la livraison sous quinze jours à
compter de la réception de ce courrier. À défaut, je résoudrai le contrat en
application de l'article L216-6 et vous demanderai le remboursement intégral
de [montant] € dans les quatorze jours suivants.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations
distinguées.

[Prénom Nom]
[Adresse]`}
              note="Retirez le passage entre crochets s’il ne s’applique pas. Envoyez en recommandé avec avis de réception : c’est le dépôt qui fait courir le délai."
            />
          ),
        },
        {
          id: "paiement",
          titre: "Si vous avez payé par carte",
          contenu: (
            <>
              <p>
                Une commande jamais livrée peut donner lieu à une demande de{" "}
                <strong>rétrofacturation</strong> auprès de votre banque. Ce n’est pas un droit
                automatique&nbsp;: c’est une procédure des réseaux de cartes, avec ses propres délais,
                souvent de l’ordre de cent vingt jours après la date prévue de livraison.
              </p>
              <p className="rf-mt-12">
                Menez-la <em>en parallèle</em> de votre réclamation, jamais à la place. Une banque
                demande presque toujours la preuve que vous avez d’abord tenté de résoudre le litige
                avec le vendeur — votre courrier lui sert donc deux fois.
              </p>
            </>
          ),
        },
        {
          id: "publier",
          titre: "Rendre le litige visible",
          contenu: (
            <p>
              Publier votre situation ne remplace aucune démarche et Recours France ne transmet rien
              au professionnel. Mais votre litige devient consultable par les consommateurs qui
              recherchent cette entreprise, et la plateforme prépare le texte de votre réclamation.{" "}
              <Link href="/signaler">Signaler un litige</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
