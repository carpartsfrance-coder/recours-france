import Link from "next/link";
import type { Metadata } from "next";
import { ListePuces, PageEditoriale } from "@/components/page-editoriale";
import { ModeleLettre } from "@/components/aide/modele-lettre";

export const metadata: Metadata = {
  title: "Comment faire une réclamation écrite qui aboutit",
  description:
    "La structure d’une réclamation efficace, les six éléments à y mettre, les formulations à éviter, et pourquoi l’écrit conditionne tous les recours qui suivent.",
  alternates: { canonical: "/aide/reclamation-ecrite" },
};

export default function ReclamationEcrite() {
  return (
    <PageEditoriale
      titre="Comment faire une réclamation écrite qui aboutit"
      fil="Réclamation écrite"
      maj="21 août 2026"
      chapo={
        <>
          Une réclamation n’est pas une plainte. C’est un document daté, qui expose des faits, fonde
          une demande et fixe une échéance. C’est aussi la pièce{" "}
          <strong>sans laquelle aucun recours ultérieur n’est recevable</strong> — le médiateur
          l’exige, le juge la demande.
        </>
      }
      sections={[
        {
          id: "pourquoi",
          titre: "Pourquoi l’écrit change tout",
          contenu: (
            <>
              <p>
                Un appel au service client ne laisse aucune trace exploitable. Le conseiller change,
                la note interne disparaît, et six mois plus tard rien ne prouve que vous avez réclamé.
              </p>
              <p className="rf-mt-12">
                L’écrit fait trois choses qu’aucun appel ne fait&nbsp;: il{" "}
                <strong>date</strong> votre demande, donc fait courir les délais&nbsp;; il{" "}
                <strong>fixe</strong> ce que vous demandez, empêchant qu’on vous propose autre
                chose&nbsp;; et il <strong>ouvre</strong> les recours suivants, la médiation supposant
                une réclamation écrite préalable restée sans réponse satisfaisante.
              </p>
              <p className="rf-mt-12">
                Un courriel suffit. Le recommandé n’est nécessaire qu’au stade de la mise en demeure.
              </p>
            </>
          ),
        },
        {
          id: "structure",
          titre: "Les six éléments d’une réclamation",
          contenu: (
            <>
              <ListePuces
                items={[
                  "Vos références : numéro de commande, de contrat ou de dossier, et la date",
                  "Les faits, dans l’ordre chronologique, sans appréciation personnelle",
                  "Ce que vous avez déjà tenté, avec les dates et les réponses obtenues",
                  "Le fondement : l’article invoqué, ou simplement l’engagement pris par le vendeur",
                  "Votre demande, précise et chiffrée : remboursement, réparation, remplacement, résiliation",
                  "Un délai de réponse — quinze jours est l’usage — et ce que vous ferez à défaut",
                ]}
              />
              <p className="rf-mt-12">
                Le sixième est le plus souvent oublié, et c’est celui qui fait répondre. Une demande
                sans échéance se classe&nbsp;; une demande avec une échéance et une suite annoncée se
                traite.
              </p>
            </>
          ),
        },
        {
          id: "eviter",
          titre: "Ce qu’il ne faut pas écrire",
          contenu: (
            <>
              <p>
                Ce que vous écrivez peut être relu par un médiateur, un juge, ou l’avocat de
                l’entreprise. Trois travers coûtent cher.
              </p>
              <p className="rf-mt-12">
                <strong>Les qualifications pénales.</strong> « Arnaque », « escroquerie », « vol » sont
                des infractions définies par la loi. Les employer sans être en mesure de les prouver
                vous expose, et déplace le débat sur votre courrier plutôt que sur votre litige.
              </p>
              <p className="rf-mt-12">
                <strong>Le récit émotionnel.</strong> Votre exaspération est légitime et n’a aucune
                valeur probatoire. Un paragraphe de faits datés pèse plus qu’une page d’indignation.
              </p>
              <p className="rf-mt-12">
                <strong>Les demandes multiples.</strong> Choisissez une solution et tenez-la. Demander
                à la fois le remboursement, le remplacement et un geste commercial invite à ne rien
                accorder du tout.
              </p>
            </>
          ),
        },
        {
          id: "modele",
          titre: "Le squelette, quel que soit le litige",
          contenu: (
            <ModeleLettre
              intitule="Réclamation — structure générale"
              texte={`Objet : Réclamation — [dossier / commande n°] — [objet en trois mots]

Madame, Monsieur,

[1. Références] Le [date], j'ai [acheté / souscrit / commandé] [description]
auprès de votre établissement, pour un montant de [montant] €
(référence [numéro]).

[2. Les faits] Depuis le [date], [exposer ce qui s'est passé, dans l'ordre,
en une à trois phrases. Des faits, des dates, des montants.]

[3. Démarches déjà faites] J'ai contacté votre service client le [date] par
[moyen]. [Réponse obtenue, ou absence de réponse.]

[4. Fondement] [L'article invoqué, ou : « Cette situation n'est pas conforme
à l'engagement pris lors de la commande. »]

[5. Demande] Je vous demande [demande précise et chiffrée].

[6. Délai] Je vous remercie de me répondre sous quinze jours à compter de la
réception de ce courrier. À défaut de réponse satisfaisante, je saisirai le
médiateur de la consommation dont vous relevez.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations
distinguées.

[Prénom Nom]
[Adresse]
[Pièces jointes : liste]`}
              note="Numérotez mentalement, pas sur le papier : les crochets [1.] à [6.] ne servent qu’à vérifier que rien ne manque."
            />
          ),
        },
        {
          id: "apres",
          titre: "Après l’envoi",
          contenu: (
            <>
              <p>
                Conservez une copie de tout, et notez la date d’envoi&nbsp;: c’est elle qui fait courir
                les quinze jours. Si la réponse ne vient pas, la même lettre repart en{" "}
                <strong>recommandé avec avis de réception</strong>, avec les mots « mise en demeure »
                dans l’objet.
              </p>
              <p className="rf-mt-12">
                Ensuite seulement, <Link href="/aide/mediateur">le médiateur</Link>.
              </p>
              <p className="rf-mt-12">
                Recours France prépare le texte de cette réclamation à partir de votre situation, et
                vous restez l’expéditeur.{" "}
                <Link href="/signaler">Décrire mon litige</Link>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
