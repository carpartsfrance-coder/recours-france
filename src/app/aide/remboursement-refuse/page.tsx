import Link from "next/link";
import type { Metadata } from "next";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";
import { ModeleLettre } from "@/components/aide/modele-lettre";

export const metadata: Metadata = {
  title: "Un commerçant refuse de me rembourser : que faire ?",
  description:
    "Rétractation, retour, annulation : les délais légaux de remboursement, la lettre à envoyer, les intérêts dus en cas de retard et les recours si le vendeur ne répond pas.",
  alternates: { canonical: "/aide/remboursement-refuse" },
};

/**
 * Guide autonome — remboursement refusé ou jamais versé.
 *
 * Ces pages ne dépendent d'aucune donnée : ce sont les seules qui peuvent
 * capter du trafic avant que les fiches d'entreprise n'existent.
 *
 * L'angle qui les distingue des sites publics : service-public.fr et l'INC
 * expliquent le droit, personne ne donne la phrase à écrire ni ne dit quoi
 * conserver. C'est cette marche-là qui bloque les gens.
 */
export default function RemboursementRefuse() {
  return (
    <PageEditoriale
      titre="Un commerçant refuse de me rembourser : que faire ?"
      fil="Remboursement refusé"
      maj="21 août 2026"
      chapo={
        <>
          Vous avez annulé, retourné le produit ou exercé votre droit de rétractation, et l’argent
          n’est jamais revenu. La loi fixe un délai précis et prévoit une majoration automatique quand
          il est dépassé — encore faut-il le réclamer par écrit.
        </>
      }
      sections={[
        {
          id: "delai",
          titre: "Le délai que le vendeur doit tenir",
          contenu: (
            <>
              <p>
                Pour un achat à distance ou hors établissement, vous avez <strong>14 jours</strong>{" "}
                après réception pour vous rétracter, sans avoir à vous justifier (article L221-18 du
                code de la consommation).
              </p>
              <p className="rf-mt-12">
                Le vendeur doit alors rembourser <strong>la totalité des sommes versées, frais de
                livraison standard compris, dans les 14 jours</strong> suivant le moment où il récupère
                le bien ou reçoit la preuve de son expédition (article L221-24).
              </p>
              <p className="rf-mt-12">
                Ce que beaucoup ignorent : au-delà de ce délai, les sommes dues sont{" "}
                <strong>majorées de plein droit</strong>. 10 % jusqu’à trente jours de retard, 20 %
                jusqu’à soixante jours, 50 % au-delà. « De plein droit » signifie que vous n’avez ni
                juge à saisir ni faute à prouver : la majoration est due dès le dépassement. La citer
                dans votre courrier change souvent le ton de la réponse.
              </p>
            </>
          ),
        },
        {
          id: "avant",
          titre: "Avant d’écrire, réunissez quatre choses",
          contenu: (
            <>
              <p>
                Un courrier de réclamation vaut par ce qu’il prouve. Ces quatre éléments suffisent, et
                vous les avez presque toujours.
              </p>
              <ListePuces
                items={[
                  "Le numéro de commande et sa date",
                  "Le montant exact réclamé, frais de livraison inclus",
                  "La preuve du retour : numéro de suivi, récépissé, ou courriel de rétractation",
                  "La date à laquelle le vendeur a reçu le retour — c’est elle qui fait courir les 14 jours",
                ]}
              />
              <p className="rf-mt-12">
                Si vous n’avez pas de preuve de retour, écrivez quand même : l’absence de preuve rend
                la démarche plus longue, elle ne l’interdit pas.
              </p>
            </>
          ),
        },
        {
          id: "lettre",
          titre: "La lettre à envoyer",
          contenu: (
            <>
              <p>
                Envoyez-la par courriel au service client <em>et</em> conservez-en une copie. Si vous
                n’avez pas de réponse sous quinze jours, la même lettre part en recommandé avec avis
                de réception, au siège social.
              </p>
              <ModeleLettre
                intitule="Demande de remboursement"
                texte={`Objet : Remboursement non reçu — commande [numéro]

Madame, Monsieur,

Le [date], j'ai passé la commande [numéro] pour un montant de [montant] €.
J'ai exercé mon droit de rétractation le [date] et retourné le bien le
[date] ; le colis vous a été remis le [date] (suivi n° [numéro]).

À ce jour, aucun remboursement n'a été crédité sur mon compte.

L'article L221-24 du code de la consommation vous impose de rembourser la
totalité des sommes versées, frais de livraison standard compris, dans les
quatorze jours suivant la récupération du bien. Ce délai est dépassé de
[nombre] jours.

Je vous demande de procéder au remboursement de [montant] € sous quinze
jours à compter de la réception de ce courrier. À défaut, les sommes dues
seront majorées de plein droit dans les conditions prévues au même article.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations
distinguées.

[Prénom Nom]
[Adresse]`}
                note="Remplacez les passages entre crochets. N’ajoutez rien d’autre : un courrier factuel obtient plus qu’un courrier indigné, et ce que vous écrivez peut être relu par un médiateur ou un juge."
              />
            </>
          ),
        },
        {
          id: "sans-reponse",
          titre: "S’il ne répond toujours pas",
          contenu: (
            <>
              <p>
                Après la réclamation restée sans réponse satisfaisante, trois voies s’ouvrent, dans
                cet ordre.
              </p>
              <p className="rf-mt-12">
                <strong>La mise en demeure.</strong> Même contenu, mais en recommandé avec avis de
                réception, et le mot « mise en demeure » écrit noir sur blanc. Conservez la preuve de
                dépôt : c’est elle qui fait courir les intérêts et qui compte devant un juge.
              </p>
              <p className="rf-mt-12">
                <strong>Le médiateur de la consommation.</strong> Gratuit, obligatoirement proposé par
                tout professionnel, et saisissable après une réclamation écrite restée sans réponse
                satisfaisante. Voir <Link href="/aide/mediateur">comment saisir un médiateur</Link>.
              </p>
              <p className="rf-mt-12">
                <strong>Le juge.</strong> Pour les litiges jusqu’à 5 000 €, la procédure simplifiée de
                recouvrement ou la saisine du tribunal de proximité se font sans avocat.
              </p>
            </>
          ),
        },
        {
          id: "publier",
          titre: "Rendre le litige visible",
          contenu: (
            <>
              <p>
                Publier votre situation sur la fiche de l’entreprise ne remplace aucune de ces
                démarches, et Recours France ne transmet rien au professionnel. Mais un litige visible
                publiquement est consultable par les consommateurs qui recherchent cette entreprise,
                et la plateforme prépare le texte de votre réclamation à partir de votre situation.
              </p>
              <p className="rf-mt-12">
                <Link href="/signaler">Signaler un litige</Link> — gratuit, sans compte, en moins de
                deux minutes.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
