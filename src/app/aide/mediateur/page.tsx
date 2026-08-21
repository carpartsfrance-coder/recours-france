import Link from "next/link";
import type { Metadata } from "next";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";
import { ModeleLettre } from "@/components/aide/modele-lettre";

export const metadata: Metadata = {
  title: "Comment saisir un médiateur de la consommation",
  description:
    "La médiation est gratuite et tout professionnel doit en proposer une. Les trois conditions de recevabilité, comment trouver le bon médiateur, les délais et ce qui se passe ensuite.",
  alternates: { canonical: "/aide/mediateur" },
};

export default function Mediateur() {
  return (
    <PageEditoriale
      titre="Comment saisir un médiateur de la consommation"
      fil="Saisir un médiateur"
      maj="21 août 2026"
      chapo={
        <>
          C’est le recours le plus efficace et le moins utilisé. Il est{" "}
          <strong>gratuit pour le consommateur</strong>, tout professionnel est{" "}
          <strong>tenu d’en proposer un</strong>, et il aboutit dans un délai encadré par la loi.
          Encore faut-il remplir trois conditions.
        </>
      }
      sections={[
        {
          id: "conditions",
          titre: "Les trois conditions de recevabilité",
          contenu: (
            <>
              <p>
                Un dossier irrecevable est renvoyé sans être examiné, et c’est ce qui arrive le plus
                souvent. Vérifiez les trois avant d’écrire.
              </p>
              <ListePuces
                items={[
                  "Vous avez adressé une réclamation écrite au professionnel, et elle est restée sans réponse satisfaisante",
                  "Le litige a moins d’un an à compter de cette réclamation",
                  "Aucun tribunal n’a été saisi du même litige",
                ]}
              />
              <p className="rf-mt-12">
                La première est la plus discriminante. Un appel téléphonique ne compte pas&nbsp;: il
                faut un écrit daté, dont vous gardez copie. Voir{" "}
                <Link href="/aide/reclamation-ecrite">comment faire une réclamation écrite</Link>.
              </p>
              <p className="rf-mt-12">
                Comptez généralement deux mois entre votre réclamation et la saisine, le temps de
                laisser au professionnel une chance réelle de répondre.
              </p>
            </>
          ),
        },
        {
          id: "trouver",
          titre: "Trouver le bon médiateur",
          contenu: (
            <>
              <p>
                Chaque professionnel <strong>déclare</strong> le médiateur dont il relève, et il doit
                vous en communiquer les coordonnées. On les trouve d’ordinaire dans les conditions
                générales de vente, sur la page de contact, ou en pied de facture.
              </p>
              <p className="rf-mt-12">
                Saisir un médiateur qui n’est pas le sien ne sert à rien&nbsp;: il se déclarera
                incompétent. Certains secteurs ont un médiateur unique — énergie, communications
                électroniques, assurance, banque —&nbsp;; ailleurs chaque entreprise choisit le sien.
              </p>
              <p className="rf-mt-12">
                <strong>Si aucun médiateur n’est déclaré</strong>, le professionnel manque à une
                obligation légale. Demandez-lui par écrit de quel dispositif il relève&nbsp;: le
                courrier lui-même constitue une pièce utile, et la demande reste souvent la manière la
                plus rapide d’obtenir une réponse au fond.
              </p>
              <ModeleLettre
                intitule="Demande d’identification du médiateur"
                texte={`Objet : Médiateur de la consommation — dossier [numéro]

Madame, Monsieur,

Ma réclamation du [date] concernant [objet en quelques mots] est restée
[sans réponse / sans réponse satisfaisante] à ce jour.

Conformément aux articles L612-1 et suivants du code de la consommation,
tout professionnel doit garantir au consommateur le recours effectif à un
dispositif de médiation de la consommation, et lui en communiquer les
coordonnées.

Je vous demande de m'indiquer, sous quinze jours, le nom et les coordonnées
du médiateur de la consommation dont vous relevez.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations
distinguées.

[Prénom Nom]
[Adresse]`}
              />
            </>
          ),
        },
        {
          id: "dossier",
          titre: "Ce que contient un dossier de saisine",
          contenu: (
            <>
              <p>
                La saisine se fait le plus souvent en ligne, sur le site du médiateur. Préparez ces
                pièces avant de commencer&nbsp;: la plupart des formulaires ne se sauvegardent pas.
              </p>
              <ListePuces
                items={[
                  "Vos coordonnées et celles du professionnel",
                  "La référence du contrat ou de la commande",
                  "Un exposé chronologique des faits, en quelques lignes",
                  "Votre réclamation écrite et sa date d’envoi",
                  "La réponse du professionnel, ou la mention de son absence",
                  "Ce que vous demandez, chiffré",
                  "Les pièces : facture, preuve de paiement, échanges, photos",
                ]}
              />
            </>
          ),
        },
        {
          id: "suite",
          titre: "Ce qui se passe ensuite",
          contenu: (
            <>
              <p>
                Le médiateur vous notifie sous trois semaines si le dossier est recevable. À partir de
                cette notification, il dispose de <strong>quatre-vingt-dix jours</strong> pour rendre
                son avis, prolongeables une fois pour un litige complexe.
              </p>
              <p className="rf-mt-12">
                La médiation <strong>suspend la prescription</strong> de votre action&nbsp;: le temps
                qu’elle dure ne vous est pas décompté si vous devez ensuite aller devant un juge.
              </p>
              <p className="rf-mt-12">
                L’avis rendu <strong>ne s’impose à personne</strong>. Chaque partie l’accepte ou le
                refuse, et un refus ne ferme aucune porte — vous conservez l’intégralité de vos
                recours judiciaires. En pratique, beaucoup de professionnels s’y conforment, ne
                serait-ce que parce que le refus se traite ensuite devant un tribunal.
              </p>
              <p className="rf-mt-12">
                La procédure est <strong>gratuite pour vous</strong>. C’est le professionnel qui
                finance le dispositif.
              </p>
            </>
          ),
        },
        {
          id: "distinguer",
          titre: "À ne pas confondre",
          contenu: (
            <>
              <p>
                <strong>SignalConso</strong> est le service public de signalement des anomalies
                constatées chez un professionnel — pratique commerciale trompeuse, produit dangereux.
                Il alerte l’administration&nbsp;; il ne règle pas votre litige et ne vous fait rien
                récupérer. Les deux démarches se mènent en parallèle.
              </p>
              <p className="rf-mt-12">
                <strong>Recours France</strong> n’est pas un médiateur, ne transmet rien au
                professionnel et n’intervient pas dans le règlement du litige. La plateforme rend votre
                situation visible et prépare le texte de vos courriers.{" "}
                <Link href="/signaler">Signaler un litige</Link>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
