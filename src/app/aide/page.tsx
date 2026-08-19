import Link from "next/link";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { Accordeon } from "@/components/accordeon";
import { SEUIL_PUBLICATION_EXPERIENCE } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Aide",
  description: "Questions fréquentes sur le signalement d’un litige, la vérification, les avis et vos données.",
};

const QUESTIONS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Le service est-il vraiment gratuit ?",
    a: (
      <>
        Oui. Le dépôt d’un signalement, la vérification d’un justificatif, le guide des démarches, le
        récapitulatif PDF, le modèle de relance et le suivi sont gratuits et sans engagement. Aucun moyen de
        paiement n’est demandé.
      </>
    ),
  },
  {
    q: "Dois-je créer un compte ?",
    a: (
      <>
        Non. Vous recevez un lien personnel par email, valable 90 jours et prolongé à chaque consultation. Vous
        pouvez le redemander à tout moment depuis <Link href="/mon-espace">Mon espace</Link>.
      </>
    ),
  },
  {
    q: "Recours France contacte-t-il l’entreprise à ma place ?",
    a: (
      <>
        Non. La plateforme ne transmet pas votre réclamation, n’envoie aucun courrier, ne négocie pas votre
        litige et ne recueille pas la réponse du professionnel. Elle vous donne le modèle de lettre, les
        coordonnées utiles et l’ordre des démarches : chaque étape reste à votre initiative.
      </>
    ),
  },
  {
    q: "Quelle différence entre un signalement déclaré et un signalement accompagné d’un justificatif ?",
    a: (
      <>
        Un signalement <strong>déclaré</strong> repose sur votre seule déclaration : il compte dans le volume
        agrégé, mais dans aucune statistique de comportement. Un signalement <strong>accompagné d’un justificatif</strong> s’appuie
        sur une pièce déposée par le consommateur, horodatée et scellée (facture, commande, contrat, preuve de paiement, échange). La
        vérification porte sur la réalité du signalement, pas sur le bien-fondé de votre réclamation.
      </>
    ),
  },
  {
    q: "Mes justificatifs sont-ils publiés ?",
    a: (
      <>
        Jamais. Ils sont stockés hors du site public, consultables uniquement par les personnes habilitées à la
        examen éventuel, et supprimés 24 mois après leur dépôt. Seules la catégorie, le montant, la date, le
        statut et le niveau de vérification sont publiés.
      </>
    ),
  },
  {
    q: "Mon nom apparaît-il sur la fiche de l’entreprise ?",
    a: (
      <>
        Non. Votre nom, votre email et le texte que vous rédigez ne sont jamais publiés. Si vous laissez un
        avis, seuls votre prénom et l’initiale de votre nom apparaissent.
      </>
    ),
  },
  {
    q: "Comment une résolution est-elle comptabilisée ?",
    a: (
      <>
        Uniquement après votre confirmation explicite, depuis votre espace. Un signalement abandonné, ou sans
        retour de votre part, n’est jamais compté comme résolu.
      </>
    ),
  },
  {
    q: "Pourquoi certaines fiches n’affichent pas de score d’expérience ?",
    a: (
      <>
        Parce que le score n’est publié qu’à partir de {SEUIL_PUBLICATION_EXPERIENCE} signalements accompagnés d’un justificatif sur
        douze mois. En dessous de ce seuil, publier un score donnerait une fausse impression de fiabilité :
        seule la mention « données insuffisantes » s’affiche, à côté de l’indice de transparence, lui toujours
        publié car fondé sur les registres publics.
      </>
    ),
  },
  {
    q: "L’entreprise peut-elle répondre à mon signalement ?",
    a: (
      <>
        Pas encore. Dans cette version, les professionnels ne peuvent pas répondre aux signalements dans la
        plateforme. Une entreprise peut revendiquer sa fiche et signaler une erreur sur ses données publiques :
        ces demandes sont traitées par l’équipe, sans publication de réponse.
      </>
    ),
  },
  {
    q: "Puis-je supprimer mon signalement ?",
    a: (
      <>
        Oui, à tout moment, sans justification, depuis votre espace. La suppression efface vos pièces et retire
        le signalement de toutes les statistiques publiques. Voir{" "}
        <Link href="/donnees-personnelles">données personnelles</Link>.
      </>
    ),
  },
  {
    q: "L’entreprise n’est pas dans l’annuaire, que faire ?",
    a: (
      <>
        Choisissez « Saisir l’entreprise moi-même » dans le formulaire : indiquez le nom commercial et le site
        ou le lieu d’achat. Nous rapprochons l’entreprise des registres publics sous 48 heures ouvrées. Même
        sans fiche publique, votre signalement reste utilisable pour vos démarches.
      </>
    ),
  },
  {
    q: "Recours France est-il un service de l’État ?",
    a: (
      <>
        Non. C’est une plateforme privée indépendante, sans mission de service public, sans agrément et sans
        lien avec une administration. Les démarches officielles restent ouvertes en parallèle :{" "}
        <Link href="/demarches-officielles">voir la liste</Link>.
      </>
    ),
  },
];

export default function Aide() {
  return (
    <Page entete={{ navActive: "aide" }} fil={[{ libelle: "Aide" }]}>
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        <div style={{ maxWidth: 820 }}>
          <h1 className="rf-h1" style={{ fontSize: 38 }}>
            Aide
          </h1>
          <p className="rf-chapo rf-mt-16">
            Les questions les plus fréquentes sur le signalement d’un litige, la vérification, la publication et
            vos données.
          </p>
        </div>

        <div className="rf-deux-colonnes--etroite rf-mt-28">
          <div className="rf-pile" style={{ gap: 12 }}>
            {QUESTIONS.map((item) => (
              <Accordeon key={item.q} titre={item.q} variante="compact">
                <div className="rf-texte" style={{ fontSize: 14.5, lineHeight: 1.7 }}>
                  {item.a}
                </div>
              </Accordeon>
            ))}
          </div>

          <aside className="rf-rail">
            <div className="rf-carte" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Pages utiles</div>
              <div className="rf-pile rf-pile--serree rf-mt-12" style={{ gap: 9 }}>
                <Link href="/aide/justificatifs" style={{ fontSize: 13.5 }}>
                  Quels justificatifs fournir
                </Link>
                <Link href="/aide/droits" style={{ fontSize: 13.5 }}>
                  Vos droits de consommateur
                </Link>
                <Link href="/methodologie" style={{ fontSize: 13.5 }}>
                  Méthodologie et calcul des indices
                </Link>
                <Link href="/charte-de-moderation" style={{ fontSize: 13.5 }}>
                  Charte de modération
                </Link>
                <Link href="/demarches-officielles" style={{ fontSize: 13.5 }}>
                  Démarches officielles disponibles
                </Link>
              </div>
            </div>
            <div className="rf-carte rf-carte--teintee" style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Une question sans réponse&nbsp;?</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                Écrivez-nous : nous répondons sous 5 jours ouvrés.
              </p>
              <Link href="/contact" className="rf-btn rf-btn--secondaire rf-btn--sm rf-btn--bloc rf-mt-12">
                Nous contacter
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </Page>
  );
}
