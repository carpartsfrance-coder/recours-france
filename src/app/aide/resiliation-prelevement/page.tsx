import Link from "next/link";
import type { Metadata } from "next";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";
import { ModeleLettre } from "@/components/aide/modele-lettre";

export const metadata: Metadata = {
  title: "Résiliation ignorée, prélèvement contesté : que faire ?",
  description:
    "Abonnement résilié mais toujours prélevé : le remboursement sous huit semaines auprès de la banque, le délai de treize mois, la résiliation en trois clics et la lettre à envoyer.",
  alternates: { canonical: "/aide/resiliation-prelevement" },
};

export default function ResiliationPrelevement() {
  return (
    <PageEditoriale
      titre="Résiliation ignorée, prélèvement contesté : que faire ?"
      fil="Résiliation et prélèvement"
      maj="21 août 2026"
      chapo={
        <>
          Vous avez résilié, et les prélèvements continuent. Il y a ici deux démarches distinctes, et
          la plus rapide est celle qu’on oublie&nbsp;: votre <strong>banque</strong> doit rembourser
          un prélèvement contesté sous huit semaines, sans avoir à juger du litige.
        </>
      }
      sections={[
        {
          id: "banque",
          titre: "Commencez par la banque, pas par le professionnel",
          contenu: (
            <>
              <p>
                Pour un prélèvement SEPA autorisé, vous pouvez en demander le remboursement à votre
                banque <strong>dans les huit semaines</strong> suivant le débit, sans avoir à motiver
                votre demande. La banque rembourse sous dix jours ouvrables.
              </p>
              <p className="rf-mt-12">
                Pour un prélèvement <strong>non autorisé</strong> — mandat que vous n’avez jamais
                signé, ou révoqué — le délai passe à <strong>treize mois</strong> (article L133-24 du
                code monétaire et financier). La banque doit rembourser immédiatement et il lui revient
                de prouver que l’opération était autorisée.
              </p>
              <p className="rf-mt-12">
                Cette voie est indépendante de votre litige avec l’entreprise. Elle récupère l’argent&nbsp;;
                elle ne règle pas le contrat. Menez les deux en parallèle.
              </p>
              <p className="rf-mt-12">
                Révoquez aussi le mandat auprès de votre banque, sans quoi les prélèvements
                reprendront le mois suivant.
              </p>
            </>
          ),
        },
        {
          id: "resiliation",
          titre: "Prouver que vous avez bien résilié",
          contenu: (
            <>
              <p>
                Tout le litige tient là. Une résiliation par téléphone ne laisse aucune trace, et
                c’est exactement pourquoi elle est proposée.
              </p>
              <ListePuces
                items={[
                  "L’accusé de réception de votre demande, s’il existe",
                  "La capture de la page de confirmation, avec sa date",
                  "Le recommandé et son avis de réception",
                  "Le relevé bancaire montrant les prélèvements postérieurs",
                  "Vos échanges avec le service client, dans l’ordre",
                ]}
              />
              <p className="rf-mt-12">
                Depuis juin 2023, tout professionnel qui permet de souscrire en ligne doit proposer une{" "}
                <strong>fonctionnalité de résiliation en ligne</strong>, accessible en trois clics
                depuis votre espace client, et vous en accuser réception sur un support durable
                (article L215-1-1 du code de la consommation). S’il ne l’a pas fait, dites-le&nbsp;: le
                manquement lui est opposable.
              </p>
            </>
          ),
        },
        {
          id: "reconduction",
          titre: "La reconduction tacite et l’oubli d’information",
          contenu: (
            <>
              <p>
                Pour un contrat à durée déterminée reconductible, le professionnel doit vous informer
                de votre faculté de ne pas reconduire{" "}
                <strong>au plus tôt trois mois et au plus tard un mois</strong> avant la date limite
                (article L215-1).
              </p>
              <p className="rf-mt-12">
                S’il ne l’a pas fait, vous pouvez mettre fin au contrat{" "}
                <strong>à tout moment et gratuitement</strong> à compter de la reconduction. Les sommes
                prélevées après la date de résiliation vous sont dues, et elles portent intérêt au taux
                légal.
              </p>
            </>
          ),
        },
        {
          id: "lettre",
          titre: "La lettre à envoyer",
          contenu: (
            <ModeleLettre
              intitule="Contestation de prélèvements après résiliation"
              texte={`Objet : Prélèvements après résiliation — contrat n° [numéro]

Madame, Monsieur,

J'ai souscrit le [date] le contrat n° [numéro]. J'en ai demandé la
résiliation le [date] par [courriel / recommandé / espace client], demande
dont j'ai conservé [la preuve : accusé de réception, capture, avis de
réception].

Malgré cela, les prélèvements se sont poursuivis :
- le [date] : [montant] €
- le [date] : [montant] €
soit un total de [montant] € prélevé après la date de résiliation.

Je vous demande de :
1. confirmer par écrit la date de prise d'effet de la résiliation ;
2. cesser immédiatement tout prélèvement ;
3. rembourser les [montant] € indûment prélevés, sous quinze jours à
   compter de la réception de ce courrier.

J'ai par ailleurs saisi ma banque d'une demande de remboursement au titre
des articles L133-24 et suivants du code monétaire et financier.

À défaut de réponse satisfaisante sous quinze jours, je saisirai le
médiateur de la consommation dont vous relevez.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations
distinguées.

[Prénom Nom]
[Adresse]`}
              note="Le point 1 est le plus important : une date de résiliation confirmée par écrit met fin au litige, même si le remboursement traîne."
            />
          ),
        },
        {
          id: "publier",
          titre: "Rendre le litige visible",
          contenu: (
            <p>
              Voir <Link href="/aide/mediateur">comment saisir un médiateur</Link> si la réponse ne
              vient pas, et <Link href="/signaler">signaler le litige</Link> pour le rendre
              consultable sur la fiche de l’entreprise.
            </p>
          ),
        },
      ]}
    />
  );
}
